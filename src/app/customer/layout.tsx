import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";
import CustomerNav from "./CustomerNav";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/");
  if (session.role !== "customer") {
    if (session.role === "provider") redirect("/provider");
    redirect("/admin");
  }
  return (
    <div className="min-h-screen bg-[#faf8ff] text-on-surface flex flex-col">
      <CustomerNav />
      <div className="flex-1 pb-20 md:pb-8">
        {children}
      </div>
    </div>
  );
}
