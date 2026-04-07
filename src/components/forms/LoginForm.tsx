interface LoginFormProps {
  redirectTo?: string;
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  return (
    <form method="post" action="/api/auth/login" className="stack-form">
      <input type="hidden" name="redirect" value={redirectTo ?? ""} />
      <label>
        Mobile Number
        <input name="mobile_number" placeholder="09XXXXXXXXX" required />
      </label>
      <label>
        Password
        <input name="password" type="password" required />
      </label>
      <button className="btn btn-primary" type="submit">
        Login
      </button>
    </form>
  );
}
