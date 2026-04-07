import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { clearRateLimit, isRateLimitExceeded, registerRateLimitFailure } from "@/lib/rateLimit";
import { createSessionToken, roleHomePath, setSessionCookie } from "@/lib/auth";
import { execute, queryRows } from "@/lib/db";
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
      password_hash: string;
      user_type: "worker" | "employer" | "admin";
      full_name: string;
      account_status: string;
    }>
  >(
    "SELECT user_id, mobile_number, password_hash, user_type, full_name, account_status FROM users WHERE mobile_number = ? LIMIT 1",
    [parsed.data.mobile_number]
  );

  const user = users[0];
  if (!user || !(await compare(parsed.data.password, user.password_hash))) {
    await registerRateLimitFailure("login", parsed.data.mobile_number, ipAddress, 6, 900, 900);
    return redirectWithError(request, "Invalid mobile number or password.", safeRedirect);
  }

  if (user.account_status !== "active") {
    return redirectWithError(request, "Your account is not active.", safeRedirect);
  }

  await clearRateLimit("login", parsed.data.mobile_number, ipAddress);
  await execute("UPDATE users SET last_login = NOW() WHERE user_id = ?", [user.user_id]);

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
