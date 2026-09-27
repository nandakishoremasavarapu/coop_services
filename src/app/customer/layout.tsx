import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";
import { CustomerShell } from "@/components/shells/CustomerShell";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/");
  if (session.role !== "customer") {
    if (session.role === "provider") redirect("/provider");
    redirect("/admin");
  }
  return <CustomerShell>{children}</CustomerShell>;
}
