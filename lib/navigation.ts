import {
  Activity,
  BarChart3,
  Building2,
  CircleGauge,
  FileStack,
  FileText,
  ListTodo,
  RadioTower,
  Settings2,
} from "lucide-react";

export const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: CircleGauge },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Báo cáo", href: "/reports", icon: FileText },
  { label: "PLHĐ", href: "/contract", icon: FileStack },
  { label: "Phòng ban", href: "/departments", icon: Building2 },
  { label: "ISSUE", href: "/issues", icon: ListTodo },
  { label: "Hoạt động", href: "/activity", icon: Activity },
  { label: "Remote Server", href: "/resources", icon: RadioTower },
];

export const secondaryNavigation = [
  { label: "Thiết lập", href: "/settings", icon: Settings2 },
];
