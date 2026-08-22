import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { IssueWorkspace } from "@/components/issues/issue-workspace";

export const metadata = { title: "ISSUE" };

export default function IssuesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Execution Control"
        title="ISSUE Core"
        description="Quản lý ISSUE thật theo project: CRUD, inline edit, relation Module/Phòng ban/Phụ trách, Due Date, Jira, deep-link và lịch sử thay đổi."
      />
      <Suspense fallback={<div className="tech-panel min-h-[480px] rounded-2xl" />}>
        <IssueWorkspace />
      </Suspense>
    </>
  );
}
