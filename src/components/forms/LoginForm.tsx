interface LoginFormProps {
  redirectTo?: string;
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  return (
    <form method="post" action="/api/auth/login" className="stack-form">
      <input type="hidden" name="redirect" value={redirectTo ?? ""} />
      <div className="grid gap-3 rounded-xl border border-brand-blue-strong bg-white p-4">
        <label>
          Mobile Number
          <input
            name="mobile_number"
            placeholder="09XXXXXXXXX"
            inputMode="numeric"
            autoComplete="tel"
            required
          />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
      </div>
      <p className="muted">Use the same mobile number and password registered in your account.</p>
      <button className="btn btn-primary w-full sm:w-auto" type="submit">
        Login to RaketGo
      </button>
    </form>
  );
}
