import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LandingPage from "./LandingPage";

export default async function HomePage() {
  const session = await getSession();
  if (session) {
    if (session.role === "customer") redirect("/customer");
    if (session.role === "provider") redirect("/provider");
    if (session.role === "society_admin" || session.role === "federation_admin") redirect("/admin");
  }
  return <LandingPage />;
}
