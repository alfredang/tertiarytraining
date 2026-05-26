import { getSessionUser } from "@/lib/auth";
import { getEffectiveRole } from "@/lib/effectiveRole";
import { DashboardShell } from "@/components/DashboardShell";
import { navForRole } from "@/lib/adminNav";
import { ApprovalsTable } from "@/components/ApprovalsTable";

export default async function Page() {
  const user = (await getSessionUser())!;
  return (
    <DashboardShell
      user={{ name: user.name, email: user.email, role: user.role }}
      nav={navForRole(await getEffectiveRole(user.role))}
    >
      <h1 className="text-2xl font-semibold mb-6">Signup Approvals</h1>
      <ApprovalsTable />
    </DashboardShell>
  );
}
