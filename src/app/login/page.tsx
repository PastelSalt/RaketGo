import Link from "next/link";
import { LoginForm } from "@/components/forms/LoginForm";

type SearchParams = {
  error?: string;
  success?: string;
  redirect?: string;
};

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const error = params.error ? decodeURIComponent(params.error) : "";
  const success = params.success ? decodeURIComponent(params.success) : "";

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
      <aside className="card space-y-4">
        <div>
          <h1 className="page-title">Welcome Back</h1>
          <p className="muted">Sign in to continue your hiring or job search journey with RaketGo.</p>
        </div>

        <div className="grid gap-2">
          <article className="sub-card">
            <p className="text-sm font-semibold text-brand-ink">Track job applications in real time.</p>
          </article>
          <article className="sub-card">
            <p className="text-sm font-semibold text-brand-ink">Message employers and workers directly.</p>
          </article>
          <article className="sub-card">
            <p className="text-sm font-semibold text-brand-ink">Get tailored recommendations in your feed.</p>
          </article>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/about" className="btn btn-outline btn-small">
            About RaketGo
          </Link>
          <Link href="/help" className="btn btn-outline btn-small">
            View Tutorial
          </Link>
        </div>
      </aside>

      <section className="card space-y-4">
        <div>
          <h2 className="section-title">Login to your account</h2>
          <p className="muted">Use your mobile number and password to access your dashboard.</p>
        </div>
        {error ? <div className="alert alert-error">{error}</div> : null}
        {success ? <div className="alert alert-success">{success}</div> : null}
        <LoginForm redirectTo={params.redirect} />
        <p className="muted pt-2">
          No account yet?{" "}
          <Link href="/signup" className="font-semibold text-brand-ink">
            Create one now
          </Link>
        </p>
      </section>
    </div>
  );
}
