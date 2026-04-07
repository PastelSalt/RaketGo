import { queryRows } from "@/lib/db";

type SearchParams = {
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

  const type = (params.type ?? "").trim();
  const category = (params.category ?? "").trim();
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const limit = 9;
  const offset = (page - 1) * limit;

  const whereParts: string[] = [];
  const args: unknown[] = [];

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

  return (
    <div className="grid gap-6">
      <section className="card space-y-4">
        <div>
          <h1 className="page-title">Skill Learning Hub</h1>
          <p className="muted">Explore training resources curated by administrators.</p>
        </div>
        <form className="grid gap-2 md:grid-cols-[1fr_1fr_auto]" method="get">
          <select name="type" defaultValue={type}>
            <option value="">All types</option>
            <option value="certification">Certification</option>
            <option value="training">Training</option>
            <option value="course">Course</option>
            <option value="workshop">Workshop</option>
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
            Filter
          </button>
        </form>
        <p className="muted">{total} posts found</p>
      </section>

      <section className="grid grid-3">
        {posts.length ? (
          posts.map((post) => (
            <article key={post.post_id} className="card space-y-3">
              <h3 className="text-lg font-semibold tracking-tight text-brand-ink">{post.post_title}</h3>
              <p className="muted">
                {post.post_type} • {post.category || "General"} • {post.admin_name}
              </p>
              <p className="text-sm leading-6 text-brand-ink">{post.post_content.slice(0, 160)}...</p>
              {post.link_url ? (
                <a href={post.link_url} target="_blank" rel="noreferrer" className="btn btn-outline btn-small">
                  Open Resource
                </a>
              ) : null}
            </article>
          ))
        ) : (
          <p className="empty-state">No learning posts found.</p>
        )}
      </section>
    </div>
  );
}
