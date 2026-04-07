import Link from "next/link";
import { queryRows } from "@/lib/db";
import { timeAgo } from "@/lib/utils";

const POST_TYPES = ["certification", "training", "course", "workshop"] as const;
type PostType = (typeof POST_TYPES)[number];

const POST_TYPE_LABELS: Record<PostType, string> = {
  certification: "Certification",
  training: "Training",
  course: "Course",
  workshop: "Workshop"
};

type SearchParams = {
  q?: string;
  type?: string;
  category?: string;
  page?: string;
};

export default async function LearnPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const q = (params.q ?? "").trim();

  const typeInput = (params.type ?? "").trim().toLowerCase();
  const type = POST_TYPES.includes(typeInput as PostType) ? (typeInput as PostType) : "";

  const category = (params.category ?? "").trim();
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const limit = 9;
  const offset = (page - 1) * limit;

  const whereParts: string[] = [];
  const args: unknown[] = [];

  if (q) {
    whereParts.push("(sp.post_title LIKE ? OR sp.post_content LIKE ? OR COALESCE(sp.category, '') LIKE ?)");
    args.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  if (type) {
    whereParts.push("sp.post_type = ?");
    args.push(type);
  }

  if (category) {
    whereParts.push("sp.category = ?");
    args.push(category);
  }

  const whereClause = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

  const [countRow] = await queryRows<{ total: number }>(
    `SELECT COUNT(*) AS total FROM skill_posts sp ${whereClause}`,
    args
  );

  const total = Number(countRow?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const posts = await queryRows<
    Array<{
      post_id: number;
      post_title: string;
      post_content: string;
      post_type: string;
      category: string | null;
      link_url: string | null;
      is_featured: number;
      created_at: string;
      admin_name: string;
    }>
  >(
    `SELECT sp.post_id, sp.post_title, sp.post_content, sp.post_type, sp.category, sp.link_url, sp.is_featured, sp.created_at, u.full_name AS admin_name
     FROM skill_posts sp
     JOIN users u ON sp.admin_id = u.user_id
     ${whereClause}
     ORDER BY sp.is_featured DESC, sp.created_at DESC
     LIMIT ? OFFSET ?`,
    [...args, limit, offset]
  );

  const categories = await queryRows<{ category: string }>(
    "SELECT DISTINCT category FROM skill_posts WHERE category IS NOT NULL AND category != '' ORDER BY category ASC"
  );

  const buildHref = (updates: Partial<SearchParams> = {}) => {
    const merged: SearchParams = {
      q,
      type: type || undefined,
      category: category || undefined,
      page: String(page),
      ...updates
    };

    const entries = Object.entries(merged).filter(
      ([, value]) => typeof value === "string" && value.trim() !== ""
    ) as [string, string][];

    const normalizedEntries = entries.filter(([key, value]) => !(key === "page" && value === "1"));
    const queryObject = Object.fromEntries(normalizedEntries) as Record<string, string>;

    if (Object.keys(queryObject).length === 0) {
      return { pathname: "/learn" };
    }

    return {
      pathname: "/learn",
      query: queryObject
    };
  };

  const activeFilters: string[] = [];
  if (q) activeFilters.push(`Keyword: ${q}`);
  if (type) activeFilters.push(`Type: ${POST_TYPE_LABELS[type]}`);
  if (category) activeFilters.push(`Category: ${category}`);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const postTypeLabel = (value: string) => POST_TYPE_LABELS[value as PostType] ?? value;

  return (
    <div className="grid gap-6">
      <section className="card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="page-title">Skill Learning Hub</h1>
            <p className="muted">Discover trainings, certifications, and practical guides to boost employability.</p>
          </div>
          <Link href="/help" className="btn btn-outline btn-small">
            Open Tutorial
          </Link>
        </div>

        <form className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_auto]" method="get">
          <input name="q" defaultValue={q} placeholder="Search topic, skill, or learning provider" />
          <select name="type" defaultValue={type}>
            <option value="">All types</option>
            {POST_TYPES.map((value) => (
              <option key={value} value={value}>
                {POST_TYPE_LABELS[value]}
              </option>
            ))}
          </select>
          <select name="category" defaultValue={category}>
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item.category} value={item.category}>
                {item.category}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" type="submit">
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <span className="muted">Popular:</span>
          {POST_TYPES.map((value) => (
            <Link
              key={value}
              href={buildHref({ type: value, page: "1" })}
              className={`filter-chip ${type === value ? "filter-chip-active" : ""}`}
            >
              {POST_TYPE_LABELS[value]}
            </Link>
          ))}
          {activeFilters.length ? (
            <Link href="/learn" className="btn btn-outline btn-small">
              Clear Filters
            </Link>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-brand-ink">{total} learning resources found</p>
          {activeFilters.length ? (
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((item) => (
                <span key={item} className="filter-chip">
                  {item}
                </span>
              ))}
            </div>
          ) : (
            <p className="muted">Showing latest resources from admins.</p>
          )}
        </div>
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="card space-y-4 xl:sticky xl:top-24">
          <div>
            <h2 className="section-title">Browse Categories</h2>
            <p className="muted">Jump to a topic you want to master.</p>
          </div>
          <div className="grid gap-2">
            {categories.length ? (
              categories.slice(0, 10).map((item) => (
                <Link
                  key={item.category}
                  href={buildHref({ category: item.category, page: "1" })}
                  className={`filter-chip justify-start ${category === item.category ? "filter-chip-active" : ""}`}
                >
                  {item.category}
                </Link>
              ))
            ) : (
              <p className="empty-state">No categories available.</p>
            )}
          </div>
        </aside>

        <div className="grid gap-4">
          {posts.length ? (
            posts.map((post) => (
              <article key={post.post_id} className="card space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold tracking-tight text-brand-ink">{post.post_title}</h3>
                    <p className="muted">
                      {post.admin_name} • {timeAgo(post.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {post.is_featured ? <span className="tag">Featured</span> : null}
                    <span className="filter-chip">{postTypeLabel(post.post_type)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="filter-chip">{post.category || "General"}</span>
                </div>

                <p className="text-sm leading-6 text-brand-ink">
                  {post.post_content.length > 220 ? `${post.post_content.slice(0, 220)}...` : post.post_content}
                </p>

                <div className="flex flex-wrap gap-2">
                  {post.link_url ? (
                    <a href={post.link_url} target="_blank" rel="noreferrer" className="btn btn-primary btn-small">
                      Open Resource
                    </a>
                  ) : (
                    <span className="btn btn-outline btn-small">Resource Link Unavailable</span>
                  )}
                  {post.category ? (
                    <Link href={buildHref({ category: post.category, page: "1" })} className="btn btn-outline btn-small">
                      More in {post.category}
                    </Link>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <p className="empty-state">No learning posts found.</p>
          )}

          <div className="pager">
            {canPrev ? (
              <Link className="btn btn-outline btn-small" href={buildHref({ page: String(page - 1) })}>
                Previous
              </Link>
            ) : (
              <span className="btn btn-outline btn-small">Previous</span>
            )}

            <span className="rounded-xl border border-brand-blue-strong bg-white px-3 py-1.5 text-xs font-semibold text-brand-ink sm:text-sm">
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
        </div>
      </section>
    </div>
  );
}
