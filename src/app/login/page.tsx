import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { currentSession, demoMode } from "@/server/http";
export const dynamic = "force-dynamic";
export default async function Login() {
  if (demoMode()) redirect("/");
  let unavailable = false;
  try {
    if (await currentSession()) redirect("/");
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    unavailable = true;
  }
  return <LoginForm unavailable={unavailable} />;
}
