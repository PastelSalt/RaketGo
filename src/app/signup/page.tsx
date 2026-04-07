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
    <section className="card" style={{ maxWidth: "720px", margin: "0 auto" }}>
      <h1 className="page-title">Create Account</h1>
      <p className="muted">Register as worker or employer.</p>
      {error ? <div className="alert alert-error">{error}</div> : null}
      <SignupForm />
      <p className="muted" style={{ marginTop: "1rem" }}>
        Already have an account? <Link href="/login">Login</Link>
      </p>
    </section>
  );
}
