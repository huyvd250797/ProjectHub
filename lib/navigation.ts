import {
  Activity,
  BarChart3,
  Building2,
  CircleGauge,
  Command,
  BriefcaseBusiness,
  FileStack,
  FileText,
  FolderOpen,
  ListTodo,
  Map,
  RadioTower,
  Settings2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { NavigationHref } from "@/lib/workspace-preferences";

type NavigationItem = {
  label: string;
  href: NavigationHref;
  icon: LucideIcon;
};

export const navigation: NavigationItem[] = [
  { label: "Command Center", href: "/command-center", icon: Command },
  { label: "Dashboard", href: "/dashboard", icon: CircleGauge },
  { label: "Portfolio", href: "/portfolio", icon: BriefcaseBusiness },
  { label: "Kế hoạch", href: "/plan", icon: Map },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Báo cáo", href: "/reports", icon: FileText },
  { label: "PLHĐ", href: "/contract", icon: FileStack },
  { label: "Phòng ban", href: "/departments", icon: Building2 },
  { label: "ISSUE", href: "/issues", icon: ListTodo },
  { label: "Tài liệu", href: "/documents", icon: FolderOpen },
  { label: "Hoạt động", href: "/activity", icon: Activity },
  { label: "Remote Server", href: "/resources", icon: RadioTower },
];

export const secondaryNavigation = [
  { label: "Thiết lập", href: "/settings", icon: Settings2 },
];
