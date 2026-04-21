import Link from "next/link";
import { JobCard } from "@/components/JobCard";
import { getSessionUser } from "@/lib/auth";
import { queryRows } from "@/lib/db";
import { PHILIPPINES_REGIONS } from "@/lib/validators";

const PAY_TYPE_VALUES = ["hourly", "daily", "fixed", "monthly"] as const;
type PayTypeValue = (typeof PAY_TYPE_VALUES)[number];

const PAY_TYPE_LABELS: Record<PayTypeValue, string> = {
  hourly: "Hourly",
  daily: "Daily",
  fixed: "Fixed",
  monthly: "Monthly"
};

const POSTED_WINDOWS = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days"
} as const;

type SearchParams = {
  q?: string;
  region?: string;
  category?: string;
  sort?: string;
  payType?: string;
  minPay?: string;
  posted?: string;
  page?: string;
};

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const user = await getSessionUser();

  const q = (params.q ?? "").trim();
  const region = (params.region ?? "").trim();
  const category = (params.category ?? "").trim();

  const payTypeInput = (params.payType ?? "").trim().toLowerCase();
  const payType = PAY_TYPE_VALUES.includes(payTypeInput as PayTypeValue)
    ? (payTypeInput as PayTypeValue)
    : "";

  const rawMinPay = Number(params.minPay ?? "");
  const minPay = Number.isFinite(rawMinPay) && rawMinPay > 0 ? rawMinPay : 0;

  const postedInput = (params.posted ?? "").trim();
  const posted = Object.prototype.hasOwnProperty.call(POSTED_WINDOWS, postedInput)
    ? (postedInput as keyof typeof POSTED_WINDOWS)
    : "";

  const sortInput = (params.sort ?? "recent").trim();
  const sort =
    sortInput === "pay_desc" || sortInput === "pay_asc" || sortInput === "recent"
      ? sortInput
      : "recent";

  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const limit = 10;
  const offset = (page - 1) * limit;

  const whereParts: string[] = ["j.job_status = 'active'"];
  const args: unknown[] = [];

  if (q) {
    whereParts.push("(j.job_title LIKE ? OR j.job_description LIKE ? OR j.required_skills LIKE ?)");
    args.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  if (region && PHILIPPINES_REGIONS[region]) {
    whereParts.push("j.location_region = ?");
    args.push(region);
  }

  if (category) {
    whereParts.push("j.job_category = ?");
    args.push(category);
  }

  if (payType) {
    whereParts.push("j.pay_type = ?");
    args.push(payType);
  }

  if (minPay > 0) {
    whereParts.push("j.pay_amount >= ?");
    args.push(minPay);
  }

  if (posted) {
    const daysBack = posted === "24h" ? 1 : posted === "7d" ? 7 : 30;
    const postedAfter = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    whereParts.push("j.created_at >= ?");
    args.push(postedAfter);
  }

  if (user?.userType === "worker") {
    whereParts.push(
      "j.job_id NOT IN (SELECT job_id FROM public.job_applications WHERE worker_id = ?)"
    );
    args.push(user.userId);
  }

  const whereClause = `WHERE ${whereParts.join(" AND ")}`;

  const sortSql =
    sort === "pay_desc"
      ? "j.pay_amount DESC, j.created_at DESC"
      : sort === "pay_asc"
        ? "j.pay_amount ASC, j.created_at DESC"
        : "j.created_at DESC";

  let total = 0;
  let totalPages = 1;
  let jobs: Array<{
    job_id: number;
    job_title: string;
    location_city: string;
    location_region: string;
    pay_amount: number;
    pay_type: string;
    job_status: string;
    job_category: string | null;
    employer_name: string;
    created_at: string;
  }> = [];
  let categories: Array<{ job_category: string | null }> = [];
  let announcements: Array<{ post_id: number; post_title: string; category: string | null; created_at: string }> = [];
  let hasDataError = false;

  try {
    const countRows = await queryRows<{ total: number }>(
      `SELECT COUNT(*) AS total FROM public.job_posts j ${whereClause}`,
      args
    );

    total = Number(countRows[0]?.total ?? 0);
    totalPages = Math.max(1, Math.ceil(total / limit));

    jobs = await queryRows<
      Array<{
        job_id: number;
        job_title: string;
        location_city: string;
        location_region: string;
        pay_amount: number;
        pay_type: string;
        job_status: string;
        job_category: string | null;
        employer_name: string;
        created_at: string;
      }>
    >(
      `SELECT j.job_id, j.job_title, j.location_city, j.location_region, j.pay_amount, j.pay_type, j.job_status, j.job_category, j.created_at,
              u.full_name AS employer_name
       FROM public.job_posts j
       JOIN public.users u ON j.employer_id = u.user_id
       ${whereClause}
       ORDER BY ${sortSql}
       LIMIT ? OFFSET ?`,
      [...args, limit, offset]
    );

    categories = await queryRows<{ job_category: string | null }>(
      "SELECT DISTINCT job_category FROM public.job_posts WHERE job_category IS NOT NULL AND job_category != '' ORDER BY job_category ASC"
    );
  } catch (error) {
    hasDataError = true;
    console.error("Failed to load homepage data.", error);
  }

  if (!hasDataError) {
    try {
      announcements = await queryRows<
        Array<{ post_id: number; post_title: string; category: string | null; created_at: string }>
      >(
        "SELECT post_id, post_title, category, created_at FROM public.skill_posts ORDER BY is_featured DESC, created_at DESC LIMIT 5"
      );
    } catch (error) {
      console.error("Failed to load homepage announcements.", error);
    }
  }

  const buildHref = (updates: Partial<SearchParams> = {}) => {
    const merged: SearchParams = {
      q,
      region,
      category,
      sort,
      page: String(page),
      payType: payType || undefined,
      minPay: minPay > 0 ? String(minPay) : undefined,
      posted: posted || undefined,
      ...updates
    };

    const entries = Object.entries(merged).filter(
      ([, value]) => typeof value === "string" && value.trim() !== ""
    ) as [string, string][];

    const normalizedEntries = entries.filter(
      ([key, value]) => !(key === "page" && value === "1")
    );

    const queryObject = Object.fromEntries(normalizedEntries) as Record<string, string>;

    if (Object.keys(queryObject).length === 0) {
      return { pathname: "/" };
    }

    return {
      pathname: "/",
      query: queryObject
    };
  };

  const activeFilters: string[] = [];
  if (q) activeFilters.push(`Keyword: ${q}`);
  if (region && PHILIPPINES_REGIONS[region]) activeFilters.push(PHILIPPINES_REGIONS[region]);
  if (category) activeFilters.push(category);
  if (payType) activeFilters.push(`Pay type: ${PAY_TYPE_LABELS[payType]}`);
  if (minPay > 0) activeFilters.push(`Min pay: PHP ${Math.round(minPay).toLocaleString("en-PH")}`);
  if (posted) activeFilters.push(POSTED_WINDOWS[posted]);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="grid gap-6">
      <section className="card space-y-4">
        <div className="space-y-2">
          <h1 className="page-title">Find Your Next Opportunity</h1>
          <p className="muted">
            Search thousands of jobs across the Philippines. Filter by location, pay type, and
            skills to find positions that match your experience and availability.
          </p>
        </div>
        <form className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_auto]" method="get">
          <input name="q" defaultValue={q} placeholder="Search title, skill, or description" />
          <select name="region" defaultValue={region}>
            <option value="">All regions</option>
            {Object.entries(PHILIPPINES_REGIONS).map(([code, label]) => (
              <option value={code} key={code}>
                {label}
              </option>
            ))}
          </select>
          <select name="sort" defaultValue={sort}>
            <option value="recent">Most recent</option>
            <option value="pay_desc">Highest pay</option>
            <option value="pay_asc">Lowest pay</option>
          </select>
          {category ? <input type="hidden" name="category" value={category} /> : null}
          {payType ? <input type="hidden" name="payType" value={payType} /> : null}
          {minPay > 0 ? <input type="hidden" name="minPay" value={String(minPay)} /> : null}
          {posted ? <input type="hidden" name="posted" value={posted} /> : null}
          <button className="btn btn-primary" type="submit">
            Search Jobs
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <span className="muted">Quick filters:</span>
          {PAY_TYPE_VALUES.map((value) => (
            <Link
              key={value}
              href={buildHref({ payType: value, page: "1" })}
              className={`filter-chip ${payType === value ? "filter-chip-active" : ""}`}
            >
              {PAY_TYPE_LABELS[value]}
            </Link>
          ))}
          <Link
            href={buildHref({ posted: "7d", page: "1" })}
            className={`filter-chip ${posted === "7d" ? "filter-chip-active" : ""}`}
          >
            Posted in 7 days
          </Link>
          {activeFilters.length ? (
            <Link href="/" className="btn btn-outline btn-small">
              Clear All
            </Link>
          ) : null}
        </div>

        {hasDataError ? (
          <p className="empty-state">Data source is currently unavailable. Check database environment variables and verify schema setup.</p>
        ) : null}
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="card space-y-4 xl:sticky xl:top-24">
          <div className="space-y-1">
            <h2 className="section-title">Refine Search</h2>
            <p className="muted">Filter by category, pay, and posting date.</p>
          </div>

          <form className="stack-form" method="get">
            <label>
              Keyword
              <input name="q" defaultValue={q} placeholder="title, skill, company" />
            </label>

            <label>
              Region
              <select name="region" defaultValue={region}>
                <option value="">All regions</option>
                {Object.entries(PHILIPPINES_REGIONS).map(([code, label]) => (
                  <option value={code} key={code}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Category
              <select name="category" defaultValue={category}>
                <option value="">All categories</option>
                {categories.map((item) => (
                  <option value={item.job_category ?? ""} key={item.job_category ?? "x"}>
                    {item.job_category}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Pay Type
              <select name="payType" defaultValue={payType}>
                <option value="">Any pay type</option>
                {PAY_TYPE_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {PAY_TYPE_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Minimum Pay (PHP)
              <input
                name="minPay"
                type="number"
                min="0"
                step="50"
                defaultValue={minPay > 0 ? String(minPay) : ""}
                placeholder="e.g. 500"
              />
            </label>

            <label>
              Posted Within
              <select name="posted" defaultValue={posted}>
                <option value="">Any time</option>
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>
            </label>

            <label>
              Sort By
              <select name="sort" defaultValue={sort}>
                <option value="recent">Most recent</option>
                <option value="pay_desc">Highest pay</option>
                <option value="pay_asc">Lowest pay</option>
              </select>
            </label>

            <div className="flex flex-wrap gap-2">
              <button className="btn btn-primary" type="submit">
                Apply Filters
              </button>
              <Link href="/" className="btn btn-outline">
                Reset
              </Link>
            </div>
          </form>
        </aside>

        <div className="grid gap-4">
          <section className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-brand-ink">{total} jobs found</p>
              {user ? (
                <Link href="/for-you" className="btn btn-outline btn-small">
                  Open Personalized Feed
                </Link>
              ) : (
                <Link href="/login?redirect=/for-you" className="btn btn-outline btn-small">
                  Login for Personalized Feed
                </Link>
              )}
            </div>

            {activeFilters.length ? (
              <div className="flex flex-wrap gap-2">
                {activeFilters.map((item) => (
                  <span key={item} className="filter-chip">
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <p className="muted">No filters applied. Showing the newest active listings.</p>
            )}
          </section>

          {hasDataError ? (
            <p className="empty-state">Job listings are temporarily unavailable.</p>
          ) : jobs.length ? (
            jobs.map((job) => <JobCard key={job.job_id} job={job} />)
          ) : (
            <p className="empty-state">No jobs found with your current filters.</p>
          )}

          <div className="pager">
            {canPrev ? (
              <Link className="btn btn-outline btn-small" href={buildHref({ page: String(page - 1) })}>
                Previous
              </Link>
            ) : (
              <span className="btn btn-outline btn-small">Previous</span>
            )}

            <span className="rounded-xl border-2 border-brand-blue bg-white px-3 py-1.5 text-xs font-semibold text-brand-ink sm:text-sm">
              Page {page} of {totalPages}
            </span>

            {canNext ? (
              <Link className="btn btn-outline btn-small" href={buildHref({ page: String(page + 1) })}>
                Next
              </Link>
            ) : (
              <span className="btn btn-outline btn-small">Next</span>
            )}
          </div>

          <aside className="card space-y-4">
            <div>
              <h2 className="section-title">Skill Learning Updates</h2>
              <p className="muted">Courses and certifications that can improve your match score.</p>
            </div>
            <div className="grid gap-3">
              {announcements.length ? (
                announcements.map((item) => (
                  <article key={item.post_id} className="sub-card">
                    <h3 className="text-base font-semibold text-brand-ink">{item.post_title}</h3>
                    <p className="muted">{item.category || "General"}</p>
                  </article>
                ))
              ) : (
                <p className="empty-state">No learning announcements available right now.</p>
              )}
            </div>
            <Link href="/learn" className="btn btn-secondary btn-small">
              Open Learning Hub
            </Link>
          </aside>
        </div>
      </section>
    </div>
  );
}
