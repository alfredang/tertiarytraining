import { cookies } from "next/headers";
import type { Role } from "@prisma/client";

const COOKIE = "tt_viewas";

/**
 * Returns the role the UI should render *as*. For non-admins this is
 * always their real role. For admins it's whatever they last picked
 * via the topbar "View as" switcher (defaulting to ADMIN).
 *
 * Permission checks must still use the real `user.role` — this helper
 * only affects nav rendering and dashboard role-scoped views.
 */
export async function getEffectiveRole(realRole: Role): Promise<Role> {
  if (realRole !== "ADMIN") return realRole;
  const jar = await cookies();
  const v = jar.get(COOKIE)?.value;
  if (v === "LEARNER" || v === "TRAINER" || v === "ADMIN") return v as Role;
  return "ADMIN";
}

export const VIEWAS_COOKIE = COOKIE;
