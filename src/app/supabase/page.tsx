import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

type Todo = {
  id: number;
  name: string;
};

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: todos } = await supabase
    .from("todos")
    .select("id,name")
    .returns<Todo[]>();

  return (
    <ul>
      {todos?.map((todo) => (
        <li key={todo.id}>{todo.name}</li>
      ))}
    </ul>
  );
}