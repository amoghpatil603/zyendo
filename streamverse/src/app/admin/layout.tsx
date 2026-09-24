import { redirect } from "next/navigation";
import { getAdminRole } from "@/lib/admin/admin-data";
import { AdminSidebar } from "./admin-sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const role = await getAdminRole();
  if (!role || (role !== "admin" && role !== "moderator")) {
    redirect("/login?next=/admin");
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
