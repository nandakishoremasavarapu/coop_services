import { getCurrentUser } from "@/lib/auth";
import CustomerHomeClient from "./CustomerHomeClient";

export default async function CustomerHomePage() {
  const user = await getCurrentUser();
  return <CustomerHomeClient userId={user?.id ?? ""} />;
}
