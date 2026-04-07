import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { execute, queryRows } from "@/lib/db";
import { signupSchema } from "@/lib/validators";
import { sanitizeInput } from "@/lib/utils";

function redirectToSignupError(request: Request, message: string) {
  const url = new URL("/signup", request.url);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
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

  const existingUsers = await queryRows<{ user_id: number }>(
    "SELECT user_id FROM users WHERE mobile_number = ? OR (email IS NOT NULL AND email != '' AND email = ?) LIMIT 1",
    [parsed.data.mobile_number, parsed.data.email || ""]
  );

  if (existingUsers.length) {
    return redirectToSignupError(request, "Mobile number or email already registered.");
  }

  const passwordHash = await hash(parsed.data.password, 12);

  const created = await execute(
    "INSERT INTO users (mobile_number, email, password_hash, user_type, full_name, region, province, city) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      parsed.data.mobile_number,
      parsed.data.email || null,
      passwordHash,
      parsed.data.user_type,
      parsed.data.full_name,
      parsed.data.region,
      parsed.data.province,
      parsed.data.city
    ]
  );

  if (parsed.data.user_type === "worker" && parsed.data.skills.length) {
    for (const skill of parsed.data.skills) {
      await execute("INSERT IGNORE INTO user_skills (user_id, skill_name) VALUES (?, ?)", [created.insertId, skill]);
    }
  }

  const url = new URL("/login", request.url);
  url.searchParams.set("success", "Account created successfully. Please login.");
  return NextResponse.redirect(url);
}
