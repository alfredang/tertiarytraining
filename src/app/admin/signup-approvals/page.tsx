import { getSessionUser } from "@/lib/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { adminNav } from "@/lib/adminNav";
import { ApprovalsTable } from "@/components/ApprovalsTable";

export default async function Page() {
  const user = (await getSessionUser())!;
  return (
    <DashboardShell user={{ name: user.name, email: user.email, role: user.role }} nav={adminNav}>
      <h1 className="text-2xl font-semibold mb-6">Signup Approvals</h1>
      <ApprovalsTable />
    </DashboardShell>
  );
}
