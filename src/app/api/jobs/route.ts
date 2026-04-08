import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { execute, queryRows } from "@/lib/db";
import { jobPostSchema } from "@/lib/validators";
import { sanitizeInput, sanitizeMultilineInput } from "@/lib/utils";

function jobsErrorRedirect(request: Request, message: string) {
  const url = new URL("/jobs/post", request.url);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function GET() {
  const jobs = await queryRows<
    Array<{
      job_id: number;
      job_title: string;
      location_city: string;
      location_region: string;
      pay_amount: number;
      pay_type: string;
      job_status: string;
      created_at: string;
    }>
  >(
    "SELECT job_id, job_title, location_city, location_region, pay_amount, pay_type, job_status, created_at FROM public.job_posts WHERE job_status = 'active' ORDER BY created_at DESC LIMIT 50"
  );
  return NextResponse.json({ data: jobs });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.redirect(new URL("/login?redirect=/jobs/post", request.url));
  }
  if (session.userType !== "employer") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const formData = await request.formData();

  const parsed = jobPostSchema.safeParse({
    job_title: sanitizeInput(formData.get("job_title")),
    job_description: sanitizeMultilineInput(formData.get("job_description")),
    location_region: sanitizeInput(formData.get("location_region")),
    location_province: sanitizeInput(formData.get("location_province")),
    location_city: sanitizeInput(formData.get("location_city")),
    specific_address: sanitizeMultilineInput(formData.get("specific_address")),
    pay_amount: Number(formData.get("pay_amount") ?? 0),
    pay_type: sanitizeInput(formData.get("pay_type")),
    required_skills: sanitizeInput(formData.get("required_skills")),
    preferred_skills: sanitizeInput(formData.get("preferred_skills")),
    job_category: sanitizeInput(formData.get("job_category")),
    slots_available: Number(formData.get("slots_available") ?? 1)
  });

  if (!parsed.success) {
    return jobsErrorRedirect(request, parsed.error.issues[0]?.message ?? "Invalid job post data.");
  }

  const result = await execute(
    "INSERT INTO public.job_posts (employer_id, job_title, job_description, location_region, location_province, location_city, specific_address, pay_amount, pay_type, required_skills, preferred_skills, job_category, slots_available, job_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')",
    [
      session.userId,
      parsed.data.job_title,
      parsed.data.job_description,
      parsed.data.location_region,
      parsed.data.location_province,
      parsed.data.location_city,
      parsed.data.specific_address || null,
      parsed.data.pay_amount,
      parsed.data.pay_type,
      parsed.data.required_skills || null,
      parsed.data.preferred_skills || null,
      parsed.data.job_category || null,
      parsed.data.slots_available
    ]
  );

  const response = NextResponse.redirect(new URL(`/jobs/${result.insertId}?success=Job posted successfully.`, request.url));
  return response;
}
