import Link from "next/link";
import { SignupForm } from "@/components/forms/SignupForm";

type SearchParams = {
  error?: string;
};

export default async function SignupPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const error = params.error ? decodeURIComponent(params.error) : "";

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,760px)]">
      <aside className="card space-y-4">
        <div>
          <h1 className="page-title">Create Your RaketGo Account</h1>
          <p className="muted">Join as a worker or employer and manage your opportunities in one platform.</p>
        </div>

        <div className="grid gap-2 text-sm text-brand-ink">
          <article className="sub-card">
            <strong>1. Pick your role</strong>
            <p className="muted">Choose Worker or Employer based on your goal.</p>
          </article>
          <article className="sub-card">
            <strong>2. Complete your profile</strong>
            <p className="muted">Accurate location and skills improve match quality.</p>
          </article>
          <article className="sub-card">
            <strong>3. Start right away</strong>
            <p className="muted">Apply, post jobs, and message directly after signup.</p>
          </article>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/help" className="btn btn-outline btn-small">
            Read Tutorial
          </Link>
          <Link href="/about" className="btn btn-outline btn-small">
            About Platform
          </Link>
        </div>
      </aside>

      <section className="card space-y-4">
        <div>
          <h2 className="section-title">Registration Form</h2>
          <p className="muted">Fill in your details to create an account securely.</p>
        </div>
        {error ? <div className="alert alert-error">{error}</div> : null}
        <SignupForm />
        <p className="muted pt-2">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-ink">
            Login
          </Link>
        </p>
      </section>
    </div>
  );
}
