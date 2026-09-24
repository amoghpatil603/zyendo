import { PageContainer } from "@/components/common/page-container";
import { EmptyState } from "@/components/common/empty-state";
import { Settings } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <PageContainer className="!max-w-none !px-0 !py-0">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Platform Settings</h1>
          <p className="text-sm text-muted-foreground">General settings, feature flags, API keys, and system configuration.</p>
        </div>
        <EmptyState icon={Settings} title="Platform Settings" description="Full platform settings will be implemented in Phase A-10." />
      </div>
    </PageContainer>
  );
}
