import { PHILIPPINES_REGIONS } from "@/lib/validators";

export function JobPostingForm() {
  return (
    <form action="/api/jobs" method="post" className="stack-form">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="md:col-span-2">
          Job Title
          <input name="job_title" required />
        </label>
        <label className="md:col-span-2">
          Job Description
          <textarea name="job_description" rows={6} required />
        </label>
        <label>
          Region
          <select name="location_region" required>
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
          <input name="location_province" required />
        </label>
        <label>
          City
          <input name="location_city" required />
        </label>
        <label>
          Specific Address
          <textarea name="specific_address" rows={2} />
        </label>
        <label>
          Pay Amount
          <input name="pay_amount" type="number" min="1" step="0.01" required />
        </label>
        <label>
          Pay Type
          <select name="pay_type" required>
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="fixed">Fixed</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
        <label>
          Required Skills
          <input name="required_skills" placeholder="skill1, skill2" />
        </label>
        <label>
          Preferred Skills
          <input name="preferred_skills" placeholder="skill1, skill2" />
        </label>
        <label>
          Job Category
          <input name="job_category" placeholder="Construction, Repair" />
        </label>
        <label>
          Slots Available
          <input name="slots_available" type="number" min="1" defaultValue="1" required />
        </label>
      </div>
      <button className="btn btn-primary w-full sm:w-auto" type="submit">
        Post Job
      </button>
    </form>
  );
}
