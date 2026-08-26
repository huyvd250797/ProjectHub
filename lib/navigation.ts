import {
  Activity,
  Building2,
  CircleGauge,
  FileStack,
  ListTodo,
  RadioTower,
  Settings2,
} from "lucide-react";

export const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: CircleGauge },
  { label: "PLHĐ", href: "/contract", icon: FileStack },
  { label: "Phòng ban", href: "/departments", icon: Building2 },
  { label: "ISSUE", href: "/issues", icon: ListTodo },
  { label: "Hoạt động", href: "/activity", icon: Activity },
  { label: "Remote Server", href: "/resources", icon: RadioTower },
];

export const secondaryNavigation = [
  { label: "Thiết lập", href: "/settings", icon: Settings2 },
];
