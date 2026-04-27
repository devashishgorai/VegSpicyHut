export type AppRole = "owner" | "manager" | "cashier" | "kitchen" | "waiter";

export type NavItem = {
  href: string;
  label: string;
  allowedRoles: AppRole[];
};

export const NAV_ACCESS: NavItem[] = [
  { href: "/", label: "Dashboard", allowedRoles: ["owner", "manager"] },
  { href: "/pos", label: "POS & Billing", allowedRoles: ["owner", "manager", "cashier", "waiter"] },
  { href: "/orders", label: "Orders", allowedRoles: ["owner", "manager", "cashier", "waiter"] },
  { href: "/kitchen", label: "Kitchen (KOT)", allowedRoles: ["owner", "manager", "kitchen"] },
  { href: "/tables", label: "Tables", allowedRoles: ["owner", "manager", "cashier", "waiter"] },
  { href: "/menu", label: "Menu", allowedRoles: ["owner", "manager", "cashier", "waiter", "kitchen"] },
  { href: "/inventory", label: "Inventory", allowedRoles: ["owner", "manager"] },
  { href: "/customers", label: "Customers", allowedRoles: ["owner", "manager", "cashier", "waiter"] },
  { href: "/reports", label: "Reports", allowedRoles: ["owner", "manager"] },
  { href: "/live-orders", label: "Live Orders", allowedRoles: ["owner", "manager", "cashier", "kitchen", "waiter"] },
  { href: "/staff", label: "Staff", allowedRoles: ["owner", "manager"] },
  { href: "/settings", label: "Settings", allowedRoles: ["owner", "manager"] },
];

export function getDefaultRouteForRole(role?: string | null): string {
  switch (role) {
    case "kitchen":
      return "/kitchen";
    case "cashier":
      return "/pos";
    case "waiter":
      return "/tables";
    case "owner":
      return "/pos";
    case "manager":
      return "/pos";
    default:
      return "/pos";
  }
}

export function canAccessRoute(path: string, role?: string | null): boolean {
  if (!role) return false;

  const matched = NAV_ACCESS.find((item) => {
    if (item.href === "/") return path === "/";
    return path === item.href || path.startsWith(`${item.href}/`);
  });

  if (!matched) {
    return true;
  }

  return matched.allowedRoles.includes(role as AppRole);
}
