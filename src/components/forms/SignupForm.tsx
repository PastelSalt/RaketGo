import { PHILIPPINES_REGIONS } from "@/lib/validators";

export function SignupForm() {
  return (
    <form method="post" action="/api/auth/signup" className="stack-form">
      <section className="grid gap-3 rounded-xl border border-brand-blue-strong bg-white p-4">
        <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-brand-ink">Account Basics</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <label>
            Account Type
            <select name="user_type" required>
              <option value="">Select account type</option>
              <option value="worker">Worker</option>
              <option value="employer">Employer</option>
            </select>
          </label>
          <label>
            Full Name
            <input name="full_name" autoComplete="name" required />
          </label>
          <label>
            Mobile Number
            <input name="mobile_number" placeholder="09XXXXXXXXX" inputMode="numeric" autoComplete="tel" required />
          </label>
          <label>
            Email (Optional)
            <input name="email" type="email" autoComplete="email" />
          </label>
        </div>
      </section>

      <section className="grid gap-3 rounded-xl border border-brand-blue-strong bg-white p-4">
        <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-brand-ink">Location Details</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <label>
            Region
            <select name="region" required>
              <option value="">Select region</option>
              {Object.entries(PHILIPPINES_REGIONS).map(([code, label]) => (
                <option value={code} key={code}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Province
            <input name="province" autoComplete="address-level1" required />
          </label>
          <label>
            City
            <input name="city" autoComplete="address-level2" required />
          </label>
          <label>
            Skills (for workers, comma separated)
            <input name="skills_csv" placeholder="carpentry, plumbing, welding" />
          </label>
        </div>
      </section>

      <section className="grid gap-3 rounded-xl border border-brand-blue-strong bg-white p-4">
        <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-brand-ink">Security</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <label>
            Password
            <input name="password" type="password" autoComplete="new-password" required />
          </label>
          <label>
            Confirm Password
            <input name="confirm_password" type="password" autoComplete="new-password" required />
          </label>
        </div>
      </section>

      <p className="muted">By creating an account, you can apply or hire directly through RaketGo.</p>

      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary w-full sm:w-auto" type="submit">
          Create Account
        </button>
      </div>
    </form>
  );
}
