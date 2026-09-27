import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";
import { ProviderShell } from "@/components/shells/ProviderShell";

export default async function ProviderLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/");
  if (session.role !== "provider") {
    if (session.role === "customer") redirect("/customer");
    redirect("/admin");
  }
  return <ProviderShell>{children}</ProviderShell>;
}
