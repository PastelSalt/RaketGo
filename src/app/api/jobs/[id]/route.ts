import { NextResponse } from "next/server";
import { queryRows } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const jobId = Number(id);
  if (!Number.isFinite(jobId) || jobId <= 0) {
    return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
  }

  const rows = await queryRows<
    Array<{
      job_id: number;
      job_title: string;
      job_description: string;
      location_region: string;
      location_province: string;
      location_city: string;
      pay_amount: number;
      pay_type: string;
      required_skills: string | null;
      preferred_skills: string | null;
      job_status: string;
      employer_name: string;
    }>
  >(
    "SELECT j.job_id, j.job_title, j.job_description, j.location_region, j.location_province, j.location_city, j.pay_amount, j.pay_type, j.required_skills, j.preferred_skills, j.job_status, u.full_name AS employer_name FROM public.job_posts j JOIN public.users u ON j.employer_id = u.user_id WHERE j.job_id = ? LIMIT 1",
    [jobId]
  );

  if (!rows[0]) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({ data: rows[0] });
}
