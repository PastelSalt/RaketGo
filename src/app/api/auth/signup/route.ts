import { NextResponse } from "next/server";
import { execute, queryRows } from "@/lib/db";
import { createSupabaseAdminClient } from "@/lib/supabaseAuth";
import { signupSchema } from "@/lib/validators";
import { sanitizeInput } from "@/lib/utils";

function redirectToSignupError(request: Request, message: string) {
  const url = new URL("/signup", request.url);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

function resolveSupabaseEmail(email: string, mobileNumber: string): string {
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail) {
    return normalizedEmail;
  }

  const normalizedMobile = mobileNumber.replace(/\D/g, "");
  return `u${normalizedMobile}@users.raketgo.local`;
}

export async function POST(request: Request) {
  const formData = await request.formData();

  const skillsCsv = sanitizeInput(formData.get("skills_csv"));
  const skills = skillsCsv
    ? skillsCsv
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  const parsed = signupSchema.safeParse({
    mobile_number: sanitizeInput(formData.get("mobile_number")),
    email: sanitizeInput(formData.get("email")),
    password: String(formData.get("password") ?? ""),
    confirm_password: String(formData.get("confirm_password") ?? ""),
    user_type: sanitizeInput(formData.get("user_type")),
    full_name: sanitizeInput(formData.get("full_name")),
    region: sanitizeInput(formData.get("region")),
    province: sanitizeInput(formData.get("province")),
    city: sanitizeInput(formData.get("city")),
    skills
  });

  if (!parsed.success) {
    return redirectToSignupError(request, parsed.error.issues[0]?.message ?? "Invalid registration details.");
  }

  const resolvedEmail = resolveSupabaseEmail(parsed.data.email || "", parsed.data.mobile_number);

  const existingUsers = await queryRows<{ user_id: number }>(
    "SELECT user_id FROM public.users WHERE mobile_number = ? OR email = ? LIMIT 1",
    [parsed.data.mobile_number, resolvedEmail]
  );

  if (existingUsers.length) {
    return redirectToSignupError(request, "Mobile number or email already registered.");
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch {
    return redirectToSignupError(
      request,
      "Supabase auth is not configured. Set SUPABASE_SERVICE_ROLE_KEY and try again."
    );
  }
  const { data: createdAuthUser, error: signupError } = await supabaseAdmin.auth.admin.createUser({
    email: resolvedEmail,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.full_name,
      mobile_number: parsed.data.mobile_number,
      user_type: parsed.data.user_type
    }
  });

  if (signupError || !createdAuthUser.user?.id) {
    return redirectToSignupError(
      request,
      signupError?.message ?? "Unable to create Supabase auth user. Please try again."
    );
  }

  const authUserId = createdAuthUser.user.id;

  try {
    const created = await execute(
      "INSERT INTO public.users (auth_user_id, mobile_number, email, password_hash, user_type, full_name, region, province, city) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?)",
      [
        authUserId,
        parsed.data.mobile_number,
        resolvedEmail,
        parsed.data.user_type,
        parsed.data.full_name,
        parsed.data.region,
        parsed.data.province,
        parsed.data.city
      ]
    );

    if (parsed.data.user_type === "worker" && parsed.data.skills.length) {
      for (const skill of parsed.data.skills) {
        await execute(
          "INSERT INTO public.user_skills (user_id, skill_name) VALUES (?, ?) ON CONFLICT (user_id, skill_name) DO NOTHING",
          [created.insertId, skill]
        );
      }
    }
  } catch {
    await supabaseAdmin.auth.admin.deleteUser(authUserId).catch(() => undefined);
    return redirectToSignupError(request, "Unable to save profile data. Please try again.");
  }

  const url = new URL("/login", request.url);
  url.searchParams.set("success", "Account created successfully. Please login.");
  return NextResponse.redirect(url);
}
