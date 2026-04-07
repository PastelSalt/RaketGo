import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { execute, queryRows } from "@/lib/db";
import { sanitizeInput, sanitizeMultilineInput } from "@/lib/utils";

function jobRedirect(request: Request, jobId: number, key: "success" | "error", message: string) {
  const url = new URL(`/jobs/${jobId}`, request.url);
  url.searchParams.set(key, message);
  return NextResponse.redirect(url);
}

function toPositiveInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  const formData = await request.formData();

  const action = sanitizeInput(formData.get("action"));
  const jobId = toPositiveInt(formData.get("job_id"));
  const applicationId = toPositiveInt(formData.get("application_id"));

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    if (jobId) {
      loginUrl.searchParams.set("redirect", `/jobs/${jobId}`);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (!jobId) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if ((action === "save" || action === "unsave" || action === "apply" || action === "withdraw") && session.userType !== "worker") {
    return jobRedirect(request, jobId, "error", "Only workers can perform this action.");
  }

  if ((action === "approve" || action === "reject") && session.userType !== "employer") {
    return jobRedirect(request, jobId, "error", "Only employers can review applications.");
  }

  if (action === "save") {
    await execute(
      "INSERT INTO user_interactions (user_id, interaction_type, job_id) SELECT ?, 'save', ? WHERE NOT EXISTS (SELECT 1 FROM user_interactions WHERE user_id = ? AND interaction_type = 'save' AND job_id = ?)",
      [session.userId, jobId, session.userId, jobId]
    );
    return jobRedirect(request, jobId, "success", "Job saved.");
  }

  if (action === "unsave") {
    await execute(
      "DELETE FROM user_interactions WHERE user_id = ? AND job_id = ? AND interaction_type = 'save'",
      [session.userId, jobId]
    );
    return jobRedirect(request, jobId, "success", "Saved job removed.");
  }

  if (action === "apply") {
    const coverLetter = sanitizeMultilineInput(formData.get("cover_letter"));

    const [job] = await queryRows<
      Array<{ employer_id: number; slots_available: number; slots_filled: number; job_status: string }>
    >(
      "SELECT employer_id, slots_available, slots_filled, job_status FROM job_posts WHERE job_id = ? LIMIT 1",
      [jobId]
    );

    if (!job || job.job_status !== "active" || Number(job.slots_filled) >= Number(job.slots_available)) {
      return jobRedirect(request, jobId, "error", "This job is no longer accepting applications.");
    }

    if (job.employer_id === session.userId) {
      return jobRedirect(request, jobId, "error", "You cannot apply to your own job.");
    }

    const [existing] = await queryRows<{ application_id: number; application_status: string }>(
      "SELECT application_id, application_status FROM job_applications WHERE job_id = ? AND worker_id = ? LIMIT 1",
      [jobId, session.userId]
    );

    if (existing && ["pending", "approved"].includes(existing.application_status)) {
      return jobRedirect(request, jobId, "error", "You already have an active application for this job.");
    }

    if (existing) {
      await execute(
        "UPDATE job_applications SET application_status = 'pending', cover_letter = ?, applied_at = NOW(), reviewed_at = NULL WHERE application_id = ?",
        [coverLetter || null, existing.application_id]
      );
    } else {
      await execute(
        "INSERT INTO job_applications (job_id, worker_id, employer_id, cover_letter) VALUES (?, ?, ?, ?)",
        [jobId, session.userId, job.employer_id, coverLetter || null]
      );
    }

    await execute(
      "INSERT INTO notifications (user_id, notification_type, title, message, related_id, related_type, action_url) VALUES (?, 'application', 'New Job Application', ?, ?, 'job', ?)",
      [job.employer_id, `${session.fullName} applied to your job posting.`, jobId, `/jobs/${jobId}`]
    );

    return jobRedirect(request, jobId, "success", "Application submitted.");
  }

  if (action === "withdraw") {
    const result = await execute(
      "UPDATE job_applications SET application_status = 'withdrawn', reviewed_at = NOW() WHERE job_id = ? AND worker_id = ? AND application_status = 'pending'",
      [jobId, session.userId]
    );

    if (!result.affectedRows) {
      return jobRedirect(request, jobId, "error", "No pending application found.");
    }

    const [owner] = await queryRows<{ employer_id: number }>(
      "SELECT employer_id FROM job_posts WHERE job_id = ?",
      [jobId]
    );

    if (owner) {
      await execute(
        "INSERT INTO notifications (user_id, notification_type, title, message, related_id, related_type, action_url) VALUES (?, 'application', 'Application Withdrawn', ?, ?, 'job', ?)",
        [owner.employer_id, `${session.fullName} withdrew an application.`, jobId, `/jobs/${jobId}`]
      );
    }

    return jobRedirect(request, jobId, "success", "Application withdrawn.");
  }

  if ((action === "approve" || action === "reject") && !applicationId) {
    return jobRedirect(request, jobId, "error", "Missing application id.");
  }

  if (action === "approve") {
    const [application] = await queryRows<
      Array<{ worker_id: number; job_id: number; slots_available: number; slots_filled: number }>
    >(
      "SELECT ja.worker_id, ja.job_id, jp.slots_available, jp.slots_filled FROM job_applications ja JOIN job_posts jp ON ja.job_id = jp.job_id WHERE ja.application_id = ? AND ja.employer_id = ? AND ja.job_id = ? AND ja.application_status = 'pending' LIMIT 1",
      [applicationId, session.userId, jobId]
    );

    if (!application) {
      return jobRedirect(request, jobId, "error", "Application not found or already processed.");
    }

    if (Number(application.slots_filled) >= Number(application.slots_available)) {
      return jobRedirect(request, jobId, "error", "No slots available for approval.");
    }

    await execute(
      "UPDATE job_applications SET application_status = 'approved', reviewed_at = NOW() WHERE application_id = ?",
      [applicationId]
    );

    await execute(
      "UPDATE job_posts SET slots_filled = LEAST(slots_filled + 1, slots_available) WHERE job_id = ?",
      [jobId]
    );

    await execute(
      "UPDATE job_posts SET job_status = 'in_progress' WHERE job_id = ? AND slots_filled >= slots_available AND job_status = 'active'",
      [jobId]
    );

    await execute(
      "INSERT INTO notifications (user_id, notification_type, title, message, related_id, related_type, action_url) VALUES (?, 'application', 'Application Approved', 'Your job application has been approved.', ?, 'job', ?)",
      [application.worker_id, jobId, `/jobs/${jobId}`]
    );

    return jobRedirect(request, jobId, "success", "Application approved.");
  }

  if (action === "reject") {
    const [application] = await queryRows<{ worker_id: number }>(
      "SELECT worker_id FROM job_applications WHERE application_id = ? AND employer_id = ? AND job_id = ? AND application_status = 'pending' LIMIT 1",
      [applicationId, session.userId, jobId]
    );

    if (!application) {
      return jobRedirect(request, jobId, "error", "Application not found or already processed.");
    }

    await execute(
      "UPDATE job_applications SET application_status = 'rejected', reviewed_at = NOW() WHERE application_id = ?",
      [applicationId]
    );

    await execute(
      "INSERT INTO notifications (user_id, notification_type, title, message, related_id, related_type, action_url) VALUES (?, 'application', 'Application Update', 'Your application was not selected this time.', ?, 'job', ?)",
      [application.worker_id, jobId, `/jobs/${jobId}`]
    );

    return jobRedirect(request, jobId, "success", "Application rejected.");
  }

  return jobRedirect(request, jobId, "error", "Invalid action.");
}
