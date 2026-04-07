import { PHILIPPINES_REGIONS } from "@/lib/validators";

export function SignupForm() {
  return (
    <form method="post" action="/api/auth/signup" className="stack-form">
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
          <input name="full_name" required />
        </label>
        <label>
          Mobile Number
          <input name="mobile_number" placeholder="09XXXXXXXXX" required />
        </label>
        <label>
          Email (Optional)
          <input name="email" type="email" />
        </label>
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
          <input name="province" required />
        </label>
        <label>
          City
          <input name="city" required />
        </label>
        <label>
          Skills (comma separated for workers)
          <input name="skills_csv" placeholder="carpentry, plumbing, welding" />
        </label>
        <label>
          Password
          <input name="password" type="password" required />
        </label>
        <label>
          Confirm Password
          <input name="confirm_password" type="password" required />
        </label>
      </div>
      <button className="btn btn-primary w-full sm:w-auto" type="submit">
        Create Account
      </button>
    </form>
  );
}
