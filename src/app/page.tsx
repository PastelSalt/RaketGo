import Link from "next/link";
import { JobCard } from "@/components/JobCard";
import { getSessionUser } from "@/lib/auth";
import { queryRows } from "@/lib/db";
import { PHILIPPINES_REGIONS } from "@/lib/validators";

type SearchParams = {
  q?: string;
  region?: string;
  category?: string;
  sort?: string;
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
  const sort = (params.sort ?? "recent").trim();
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

  if (user?.userType === "worker") {
    whereParts.push(
      "j.job_id NOT IN (SELECT job_id FROM job_applications WHERE worker_id = ?)"
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
    employer_name: string;
    created_at: string;
  }> = [];
  let categories: Array<{ job_category: string | null }> = [];
  let announcements: Array<{ post_id: number; post_title: string; category: string | null; created_at: string }> = [];
  let hasDataError = false;

  try {
    const countRows = await queryRows<{ total: number }>(
      `SELECT COUNT(*) AS total FROM job_posts j ${whereClause}`,
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
        employer_name: string;
        created_at: string;
      }>
    >(
      `SELECT j.job_id, j.job_title, j.location_city, j.location_region, j.pay_amount, j.pay_type, j.job_status, j.created_at,
              u.full_name AS employer_name
       FROM job_posts j
       JOIN users u ON j.employer_id = u.user_id
       ${whereClause}
       ORDER BY ${sortSql}
       LIMIT ? OFFSET ?`,
      [...args, limit, offset]
    );

    categories = await queryRows<{ job_category: string | null }>(
      "SELECT DISTINCT job_category FROM job_posts WHERE job_category IS NOT NULL AND job_category != '' ORDER BY job_category ASC"
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
        "SELECT post_id, post_title, category, created_at FROM skill_posts ORDER BY is_featured DESC, created_at DESC LIMIT 5"
      );
    } catch (error) {
      console.error("Failed to load homepage announcements.", error);
    }
  }

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <section className="card">
        <h1 className="page-title">Find Jobs Across the Philippines</h1>
        <form className="search-form" method="get">
          <input name="q" defaultValue={q} placeholder="Search title, skill, or description" />
          <select name="region" defaultValue={region}>
            <option value="">All regions</option>
            {Object.entries(PHILIPPINES_REGIONS).map(([code, label]) => (
              <option value={code} key={code}>
                {label}
              </option>
            ))}
          </select>
          <select name="category" defaultValue={category}>
            <option value="">All categories</option>
            {categories.map((item) => (
              <option value={item.job_category ?? ""} key={item.job_category ?? "x"}>
                {item.job_category}
              </option>
            ))}
          </select>
          <select name="sort" defaultValue={sort}>
            <option value="recent">Most recent</option>
            <option value="pay_desc">Highest pay</option>
            <option value="pay_asc">Lowest pay</option>
          </select>
          <button className="btn btn-primary" type="submit">
            Filter
          </button>
        </form>
        <p className="muted">{total} jobs found</p>
        {hasDataError ? (
          <p className="muted">Data source is currently unavailable. Check database environment variables and verify schema setup.</p>
        ) : null}
      </section>

      <section className="grid grid-2">
        <div className="grid" style={{ gap: "0.8rem" }}>
          {hasDataError ? (
            <p>Job listings are temporarily unavailable.</p>
          ) : jobs.length ? (
            jobs.map((job) => <JobCard key={job.job_id} job={job} />)
          ) : (
            <p>No active jobs found.</p>
          )}
          <div className="pager">
            <Link
              className="btn btn-outline btn-small"
              href={`/?${new URLSearchParams({ ...params, page: String(Math.max(1, page - 1)) } as Record<string, string>).toString()}`}
            >
              Previous
            </Link>
            <span className="btn btn-outline btn-small">Page {page}</span>
            <Link
              className="btn btn-outline btn-small"
              href={`/?${new URLSearchParams({ ...params, page: String(Math.min(totalPages, page + 1)) } as Record<string, string>).toString()}`}
            >
              Next
            </Link>
          </div>
        </div>

        <aside className="card">
          <h2>Learning Announcements</h2>
          <div className="grid" style={{ gap: "0.8rem" }}>
            {announcements.map((item) => (
              <article key={item.post_id} className="card" style={{ boxShadow: "none" }}>
                <h3>{item.post_title}</h3>
                <p className="muted">{item.category || "General"}</p>
              </article>
            ))}
          </div>
          <div style={{ marginTop: "1rem" }}>
            <Link href="/learn" className="btn btn-outline btn-small">
              Open Learning Hub
            </Link>
          </div>
        </aside>
      </section>
    </div>
  );
}
