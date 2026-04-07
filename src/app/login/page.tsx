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
    <section className="card mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="page-title">Login</h1>
        <p className="muted">Welcome back to RaketGo.</p>
      </div>
      {error ? <div className="alert alert-error">{error}</div> : null}
      {success ? <div className="alert alert-success">{success}</div> : null}
      <LoginForm redirectTo={params.redirect} />
      <p className="muted pt-2">
        No account yet? <Link href="/signup" className="font-semibold text-brand-ink">Sign up here</Link>
      </p>
    </section>
  );
}
