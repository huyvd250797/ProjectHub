import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { IssueWorkspace } from "@/components/issues/issue-workspace";

export const metadata = { title: "ISSUE" };

export default function IssuesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Execution Productivity"
        title="ISSUE Productivity"
        description="Thao tác ISSUE nhanh theo project: bulk update, Saved Views, cấu hình cột cá nhân, Full Screen một vùng scroll, Quick Add, nhân bản, export và inline edit trên nền ISSUE Core."
      />
      <Suspense fallback={<div className="tech-panel min-h-[480px] rounded-2xl" />}>
        <IssueWorkspace />
      </Suspense>
    </>
  );
}
