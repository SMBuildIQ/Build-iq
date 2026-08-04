import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const jar = await cookies();
  const session = jar.get("bq_session");
  redirect(session?.value ? "/jobs" : "/login");
}
