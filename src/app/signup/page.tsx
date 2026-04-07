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
    <section className="card mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="page-title">Create Account</h1>
        <p className="muted">Register as worker or employer.</p>
      </div>
      {error ? <div className="alert alert-error">{error}</div> : null}
      <SignupForm />
      <p className="muted pt-2">
        Already have an account? <Link href="/login" className="font-semibold text-brand-ink">Login</Link>
      </p>
    </section>
  );
}
