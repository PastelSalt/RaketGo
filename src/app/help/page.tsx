import Link from "next/link";

const workerSteps = [
  "Create an account and select Worker as your account type.",
  "Complete your profile details and add your skills.",
  "Use filters on the home page to narrow down relevant jobs.",
  "Open a job post, review requirements, then submit an application.",
  "Track status updates in Dashboard, Notifications, and Messages."
];

const employerSteps = [
  "Create an account and select Employer as your account type.",
  "Post a job with clear title, pay, and required skills.",
  "Review incoming applications in your dashboard and job pages.",
  "Approve or reject applications and message promising candidates.",
  "Keep your postings updated to attract better matches."
];

export default function HelpPage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <section className="card space-y-3">
        <h1 className="page-title">Help Tutorial</h1>
        <p className="text-sm leading-7 text-brand-ink">
          This tutorial walks you through the main workflows on RaketGo for both
          workers and employers.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="card space-y-3">
          <h2 className="section-title">For Workers</h2>
          <ol className="grid list-decimal gap-2 pl-5 text-sm leading-7 text-brand-ink">
            {workerSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </article>

        <article className="card space-y-3">
          <h2 className="section-title">For Employers</h2>
          <ol className="grid list-decimal gap-2 pl-5 text-sm leading-7 text-brand-ink">
            {employerSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </article>
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">Common Questions</h2>
        <div className="grid gap-3 text-sm leading-7 text-brand-ink">
          <p>
            <strong>How do I improve job matches?</strong> Add specific skills and
            keep your location information updated.
          </p>
          <p>
            <strong>Where can I check application updates?</strong> Open Dashboard,
            Notifications, and Messages regularly.
          </p>
          <p>
            <strong>Can I use RaketGo without logging in?</strong> You can browse,
            but signing in unlocks applications, saved jobs, and messaging.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/signup" className="btn btn-primary btn-small">
            Create Account
          </Link>
          <Link href="/login" className="btn btn-outline btn-small">
            Login
          </Link>
        </div>
      </section>
    </div>
  );
}
