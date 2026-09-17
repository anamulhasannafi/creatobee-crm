import { ensureDatabaseSeeded } from "@/lib/seed-and-init";
import { CreatoBeeErpApp } from "@/components/CreatoBeeErpApp";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await ensureDatabaseSeeded();
  return <CreatoBeeErpApp />;
}
