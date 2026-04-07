import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

type SkillPost = {
  post_id: number;
  post_title: string;
  category: string | null;
  created_at: string;
};

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: posts, error } = await supabase
    .from("skill_posts")
    .select("post_id,post_title,category,created_at")
    .order("created_at", { ascending: false })
    .limit(10)
    .returns<SkillPost[]>();

  return (
    <section className="card grid" style={{ gap: "0.75rem" }}>
      <h1 className="page-title" style={{ marginBottom: 0 }}>Supabase Feed Check</h1>
      <p className="muted" style={{ margin: 0 }}>
        Source table: <strong>skill_posts</strong>
      </p>

      {error ? (
        <p style={{ color: "#a33", margin: 0 }}>
          Failed to load rows: {error.message}
        </p>
      ) : null}

      {!error && !posts?.length ? (
        <p className="muted" style={{ margin: 0 }}>
          Connected, but no rows found in <strong>skill_posts</strong>.
        </p>
      ) : null}

      {posts?.length ? (
        <ul style={{ margin: 0, paddingLeft: "1rem" }}>
          {posts.map((post) => (
            <li key={post.post_id} style={{ marginBottom: "0.4rem" }}>
              {post.post_title}
              {post.category ? ` (${post.category})` : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}