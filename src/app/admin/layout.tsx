import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";
import { AdminShell } from "@/components/shells/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/");
  if (!["society_admin", "federation_admin", "super_admin"].includes(session.role)) {
    if (session.role === "customer") redirect("/customer");
    redirect("/provider");
  }
  return <AdminShell role={session.role}>{children}</AdminShell>;
}
