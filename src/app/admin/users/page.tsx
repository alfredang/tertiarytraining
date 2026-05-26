import { getSessionUser } from "@/lib/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { adminNav } from "@/lib/adminNav";
import { UsersTable } from "@/components/UsersTable";

export default async function Page() {
  const user = (await getSessionUser())!;
  return (
    <DashboardShell user={{ name: user.name, email: user.email, role: user.role }} nav={adminNav}>
      <h1 className="text-2xl font-semibold mb-6">User Management</h1>
      <UsersTable />
    </DashboardShell>
  );
}
