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
    .schema("public")
    .from("skill_posts")
    .select("post_id,post_title,category,created_at")
    .order("created_at", { ascending: false })
    .limit(10)
    .returns<SkillPost[]>();

  return (
    <section className="card grid gap-3">
      <h1 className="page-title mb-0">Supabase Feed Check</h1>
      <p className="muted m-0">
        Source table: <strong>public.skill_posts</strong>
      </p>

      {error ? (
        <p className="m-0 rounded-xl border-2 border-brand-red-strong bg-brand-red px-3 py-2 text-sm text-brand-ink">
          Failed to load rows: {error.message}
        </p>
      ) : null}

      {!error && !posts?.length ? (
        <p className="muted m-0">
          Connected, but no rows found in <strong>public.skill_posts</strong>.
        </p>
      ) : null}

      {posts?.length ? (
        <ul className="m-0 list-disc space-y-2 pl-5 text-sm text-brand-ink">
          {posts.map((post) => (
            <li key={post.post_id}>
              {post.post_title}
              {post.category ? ` (${post.category})` : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}