import { PageContainer } from "@/components/common/page-container";
import { EmptyState } from "@/components/common/empty-state";
import { Bell } from "lucide-react";

export default function AdminNotificationsPage() {
  return (
    <PageContainer className="!max-w-none !px-0 !py-0">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">Push notifications, email campaigns, and broadcast management.</p>
        </div>
        <EmptyState icon={Bell} title="Notifications" description="Full notification management will be implemented in Phase A-9." />
      </div>
    </PageContainer>
  );
}
