import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";
import ProviderNav from "./ProviderNav";

export default async function ProviderLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/");
  if (session.role !== "provider") {
    if (session.role === "customer") redirect("/customer");
    redirect("/admin");
  }
  return (
    <div className="min-h-screen bg-[#f4f6fa] text-[#131b2e] flex flex-col">
      <ProviderNav />
      <div className="flex-1 w-full max-w-md md:max-w-6xl lg:max-w-7xl mx-auto pb-20 md:pb-10">
        {children}
      </div>
    </div>
  );
}
