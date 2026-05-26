import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  // Learners can never enter /admin. Trainers are routed only to the
  // approvals + users sub-pages by the middleware.
  if (user.role !== "ADMIN" && user.role !== "TRAINER")
    redirect(`/dashboard/${user.role.toLowerCase()}`);
  return <>{children}</>;
}
