import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export default async function CreateSkillPostPage() {
  const session = await getSessionUser();
  if (!session) {
    redirect("/login?redirect=/admin/skills/create");
  }
  if (session.userType !== "admin") {
    redirect("/");
  }

  return (
    <section className="card mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="page-title">Create Skill Post</h1>
        <p className="muted">Admin posting UI scaffolded during migration.</p>
      </div>
      <form className="stack-form" action="#" method="post">
        <label>
          Post Title
          <input name="post_title" required />
        </label>
        <label>
          Post Content
          <textarea name="post_content" rows={6} required />
        </label>
        <label>
          Post Type
          <select name="post_type" required>
            <option value="training">Training</option>
            <option value="course">Course</option>
            <option value="workshop">Workshop</option>
            <option value="certification">Certification</option>
          </select>
        </label>
        <button className="btn btn-primary" type="submit" disabled>
          API route not yet wired
        </button>
      </form>
    </section>
  );
}
