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
    <section className="card" style={{ maxWidth: "560px", margin: "0 auto" }}>
      <h1 className="page-title">Login</h1>
      <p className="muted">Welcome back to RaketGo.</p>
      {error ? <div className="alert alert-error">{error}</div> : null}
      {success ? <div className="alert alert-success">{success}</div> : null}
      <LoginForm redirectTo={params.redirect} />
      <p className="muted" style={{ marginTop: "1rem" }}>
        No account yet? <Link href="/signup">Sign up here</Link>
      </p>
    </section>
  );
}
