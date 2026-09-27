import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AdminSidebar from "./AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/");
  if (!["society_admin", "federation_admin", "super_admin"].includes(session.role)) {
    if (session.role === "customer") redirect("/customer");
    redirect("/provider");
  }
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      <AdminSidebar role={session.role} />
      <main className="flex-1 min-w-0 overflow-auto min-h-screen pb-20 md:pb-0">
        {children}
      </main>
    </div>
  );
}
