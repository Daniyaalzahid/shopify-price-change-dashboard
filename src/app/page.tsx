import { redirect } from "next/navigation";
import { Dashboard } from "@/components/dashboard";
import { currentSession, demoMode } from "@/server/http";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (demoMode()) return <Dashboard />;
  const actor = await currentSession();
  if (!actor) redirect("/login");
  return (
    <Dashboard
      account={{
        id: actor.id,
        name: actor.name,
        email: actor.email,
        role: actor.role,
      }}
    />
  );
}
