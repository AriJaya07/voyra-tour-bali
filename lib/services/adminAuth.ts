/**
 * Tiny helper: ensures the current request is from an authenticated ADMIN.
 * Returns userId on success or null. Use in admin API route handlers.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";

export async function requireAdminUserId(): Promise<number | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") return null;
  return parseInt(session.user.id);
}
