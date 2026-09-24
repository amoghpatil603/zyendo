import { PageContainer } from "@/components/common/page-container";

export default function CollectionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageContainer className="space-y-8">
      {children}
    </PageContainer>
  );
}