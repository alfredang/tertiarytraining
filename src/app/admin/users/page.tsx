import { getSessionUser } from "@/lib/auth";
import { getEffectiveRole } from "@/lib/effectiveRole";
import { DashboardShell } from "@/components/DashboardShell";
import { navForRole } from "@/lib/adminNav";
import { UsersTable } from "@/components/UsersTable";

export default async function Page() {
  const user = (await getSessionUser())!;
  const effectiveRole = await getEffectiveRole(user.role);
  return (
    <DashboardShell
      user={{ name: user.name, email: user.email, role: user.role }}
      nav={navForRole(effectiveRole)}
    >
      <h1 className="text-2xl font-semibold mb-6">
        {effectiveRole === "TRAINER" ? "Learners" : "User Management"}
      </h1>
      <UsersTable viewerRole={user.role} />
    </DashboardShell>
  );
}
