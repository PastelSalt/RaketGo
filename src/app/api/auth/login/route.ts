import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { clearRateLimit, isRateLimitExceeded, registerRateLimitFailure } from "@/lib/rateLimit";
import { createSessionToken, roleHomePath, setSessionCookie } from "@/lib/auth";
import { execute, queryRows } from "@/lib/db";
import { createSupabaseAdminClient, createSupabaseAuthClient } from "@/lib/supabaseAuth";
import { loginSchema } from "@/lib/validators";
import { getClientIpFromRequestHeaders, sanitizeInput } from "@/lib/utils";

function redirectWithError(request: Request, message: string, redirectTo?: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", message);
  if (redirectTo) {
    url.searchParams.set("redirect", redirectTo);
  }
  return NextResponse.redirect(url);
}

function resolveSupabaseEmail(email: string | null, mobileNumber: string): string {
  const normalizedEmail = (email ?? "").trim().toLowerCase();
  if (normalizedEmail) {
    return normalizedEmail;
  }

  const normalizedMobile = mobileNumber.replace(/\D/g, "");
  return `u${normalizedMobile}@users.raketgo.local`;
}

async function verifySupabasePassword(email: string, password: string): Promise<boolean> {
  let supabaseAuth;
  try {
    supabaseAuth = createSupabaseAuthClient();
  } catch {
    return false;
  }

  const { error } = await supabaseAuth.auth.signInWithPassword({ email, password });
  if (error) {
    return false;
  }

  await supabaseAuth.auth.signOut().catch(() => undefined);
  return true;
}

async function backfillSupabaseAuthUser(user: {
  user_id: number;
  mobile_number: string;
  email: string | null;
  user_type: "worker" | "employer" | "admin";
  full_name: string;
}, password: string): Promise<void> {
  const supabaseAdmin = createSupabaseAdminClient();
  const resolvedEmail = resolveSupabaseEmail(user.email, user.mobile_number);

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: resolvedEmail,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: user.full_name,
      mobile_number: user.mobile_number,
      user_type: user.user_type
    }
  });

  if (error || !data.user?.id) {
    return;
  }

  await execute(
    "UPDATE public.users SET auth_user_id = ?, email = ? WHERE user_id = ?",
    [data.user.id, resolvedEmail, user.user_id]
  );
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const parsed = loginSchema.safeParse({
    mobile_number: sanitizeInput(formData.get("mobile_number")),
    password: String(formData.get("password") ?? "")
  });

  const requestedRedirect = sanitizeInput(formData.get("redirect") ?? "");
  const safeRedirect = requestedRedirect.startsWith("/") ? requestedRedirect : "";

  if (!parsed.success) {
    return redirectWithError(request, parsed.error.issues[0]?.message ?? "Invalid login details.", safeRedirect);
  }

  const ipAddress = getClientIpFromRequestHeaders(request.headers);
  const limit = await isRateLimitExceeded("login", parsed.data.mobile_number, ipAddress, 6, 900);
  if (limit.exceeded) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
    return redirectWithError(request, `Too many attempts. Try again in ${minutes} minute(s).`, safeRedirect);
  }

  const users = await queryRows<
    Array<{
      user_id: number;
      mobile_number: string;
      email: string | null;
      password_hash: string | null;
      auth_user_id: string | null;
      user_type: "worker" | "employer" | "admin";
      full_name: string;
      account_status: string;
    }>
  >(
    "SELECT user_id, mobile_number, email, password_hash, auth_user_id, user_type, full_name, account_status FROM public.users WHERE mobile_number = ? LIMIT 1",
    [parsed.data.mobile_number]
  );

  const user = users[0];
  let isAuthenticated = false;
  let authenticatedViaLegacy = false;

  if (user?.auth_user_id && user.email) {
    isAuthenticated = await verifySupabasePassword(user.email, parsed.data.password);
  }

  if (!isAuthenticated && user?.password_hash) {
    isAuthenticated = await compare(parsed.data.password, user.password_hash);
    authenticatedViaLegacy = isAuthenticated;
  }

  if (!user || !isAuthenticated) {
    await registerRateLimitFailure("login", parsed.data.mobile_number, ipAddress, 6, 900, 900);
    return redirectWithError(request, "Invalid mobile number or password.", safeRedirect);
  }

  if (user.account_status !== "active") {
    return redirectWithError(request, "Your account is not active.", safeRedirect);
  }

  if (authenticatedViaLegacy && user.auth_user_id) {
    try {
      const supabaseAdmin = createSupabaseAdminClient();
      await supabaseAdmin.auth.admin
        .updateUserById(user.auth_user_id, { password: parsed.data.password })
        .catch(() => undefined);
    } catch {
      // Keep login success even when auth admin sync cannot run.
    }
  }

  // Transitional migration: if this account still uses legacy-only credentials,
  // attempt to backfill an auth.users record for Supabase-native auth flows.
  if (!user.auth_user_id) {
    await backfillSupabaseAuthUser(user, parsed.data.password).catch(() => undefined);
  }

  await clearRateLimit("login", parsed.data.mobile_number, ipAddress);
  await execute("UPDATE public.users SET last_login = NOW() WHERE user_id = ?", [user.user_id]);

  const token = await createSessionToken({
    userId: user.user_id,
    userType: user.user_type,
    fullName: user.full_name,
    mobileNumber: user.mobile_number
  });

  const destination = safeRedirect || roleHomePath(user.user_type);
  const response = NextResponse.redirect(new URL(destination, request.url));
  setSessionCookie(response, token);
  return response;
}
