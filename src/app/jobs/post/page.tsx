import { redirect } from "next/navigation";
import { JobPostingForm } from "@/components/forms/JobPostingForm";
import { getSessionUser } from "@/lib/auth";

type SearchParams = {
  error?: string;
  success?: string;
};

export default async function PostJobPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSessionUser();
  if (!session) {
    redirect("/login?redirect=/jobs/post");
  }
  if (session.userType !== "employer") {
    redirect("/dashboard");
  }

  const params = await searchParams;

  return (
    <section className="card mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="page-title">Post a Job</h1>
        <p className="muted">Create a new opportunity for workers.</p>
      </div>
      {params.error ? <div className="alert alert-error">{decodeURIComponent(params.error)}</div> : null}
      {params.success ? <div className="alert alert-success">{decodeURIComponent(params.success)}</div> : null}
      <JobPostingForm />
    </section>
  );
}
