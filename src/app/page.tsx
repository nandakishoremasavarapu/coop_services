import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";
import LandingPage from "./LandingPage";

export default async function HomePage() {
  const session = await getServerSession();
  if (session) {
    if (session.role === "customer") redirect("/customer");
    if (session.role === "provider") redirect("/provider");
    if (session.role === "society_admin" || session.role === "federation_admin") redirect("/admin");
  }
  return <LandingPage />;
}
