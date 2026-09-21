import { useState, type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  BarChart3,
  ClipboardList,
  Coins,
  LayoutDashboard,
  LayoutTemplate,
  ScrollText,
  Settings,
  Smartphone,
  Truck,
  ShieldCheck,
  Store,
  Ticket,
  UtensilsCrossed,
  Users,
  Image as ImageIcon,
  MessageSquare,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
} from "lucide-react";
import defaultLogo from "@/assets/nanami-logo.png";
import { useStore } from "@/lib/store";

export type DashboardRole = "admin" | "owner" | "staff";

export type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };

export type NavSection = {
  title?: string;
  items: NavItem[];
};

const STAFF_TOOLS: NavItem[] = [
  { to: "/admin", label: "Kitchen Board", icon: LayoutDashboard },
  { to: "/admin/orders", label: "Order Management", icon: ClipboardList },
  { to: "/admin/stock", label: "Stock Availability", icon: UtensilsCrossed },
];

const ADMIN_TOOLS: NavItem[] = [
  { to: "/admin", label: "Kitchen Board", icon: LayoutDashboard },
  { to: "/admin/orders", label: "Order Management", icon: ClipboardList },
  { to: "/admin/stock", label: "Stock Availability", icon: UtensilsCrossed },
];

const OWNER_TOOLS: NavItem[] = [
  { to: "/owner", label: "Overview", icon: LayoutDashboard },
  { to: "/owner/orders", label: "Order Management", icon: ClipboardList },
  { to: "/owner/finance", label: "Finance & Reports", icon: Coins },
  { to: "/owner/menu", label: "Catalog (CRUD)", icon: UtensilsCrossed },
  { to: "/owner/media", label: "Media Library", icon: ImageIcon },
  { to: "/owner/cms", label: "Content CMS", icon: LayoutTemplate },
  { to: "/owner/preview", label: "Live Preview", icon: Smartphone },
  { to: "/owner/vouchers", label: "Vouchers & Promos", icon: Ticket },
  { to: "/owner/customers", label: "Customers", icon: Users },
  { to: "/owner/staff", label: "Accounts & Staff", icon: ShieldCheck },
  { to: "/owner/outlets", label: "Outlets", icon: Store },
  { to: "/owner/shipping", label: "Delivery Rates", icon: Truck },
  { to: "/owner/whatsapp", label: "WhatsApp Settings", icon: MessageSquare },
  { to: "/owner/settings", label: "Store Settings", icon: Settings },
  { to: "/owner/audit", label: "Activity Logs", icon: ScrollText },
];

function isItemActive(to: string, currentPath: string): boolean {
  if (to === "/admin") {
    return currentPath === "/admin" || currentPath === "/admin/";
  }
  if (to === "/owner") {
    return currentPath === "/owner" || currentPath === "/owner/";
  }
  return currentPath === to || currentPath.startsWith(`${to}/`);
}

export function DashboardShell({
  role,
  title,
  subtitle,
  actions,
  children,
}: {
  role: DashboardRole;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { cms, settings, profile } = useStore((s) => ({
    cms: s.cms,
    settings: s.settings,
    profile: s.profile,
  }));
  const { pathname } = useLocation();

  const isOwnerView = profile.role === "owner" || role === "owner" || pathname.startsWith("/owner");
  const effectiveRole: DashboardRole =
    profile.role === "staff" ? "staff" : isOwnerView ? "owner" : "admin";

  const sections: NavSection[] =
    effectiveRole === "staff"
      ? [{ title: "Kitchen Staff", items: STAFF_TOOLS }]
      : isOwnerView
        ? [
            { title: "Tools Owner", items: OWNER_TOOLS },
            { title: "Tools Admin", items: ADMIN_TOOLS },
          ]
        : [{ title: "Tools Admin", items: ADMIN_TOOLS }];

  const flatNav = sections.flatMap((s) => s.items);

  const roleLabel = effectiveRole === "staff" ? "Kitchen Staff" : isOwnerView ? "Owner" : "Admin";
  const displayLogo = cms?.logoUrl || defaultLogo;
  const storeName = settings?.storeName || "Nanami Kitchen";

  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = () => {
    setCollapsed((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Collapsible & Scrollable Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-popover/90 backdrop-blur-md transition-all duration-200 ease-in-out lg:flex ${
          collapsed ? "w-16 px-2 py-4" : "w-64 px-3.5 py-4"
        }`}
      >
        {/* Top Header: Logo + Title + Collapse Toggle */}
        <div
          className={`flex items-center gap-2 border-b border-border/40 pb-3.5 shrink-0 ${
            collapsed ? "justify-center flex-col gap-3" : "justify-between"
          }`}
        >
          <Link
            to={isOwnerView ? "/owner" : "/admin"}
            className="flex items-center gap-2.5 min-w-0"
            title={storeName}
          >
            <img
              src={displayLogo}
              alt={storeName}
              width={32}
              height={32}
              className="size-8 rounded-lg object-contain shrink-0"
            />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold leading-tight">{storeName}</p>
                <p className="text-[11px] text-muted-foreground">Panel {roleLabel}</p>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition shrink-0"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </button>
        </div>

        {/* Scrollable Nav Container */}
        <nav
          suppressHydrationWarning
          className="sidebar-scroll my-3 flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-3 pr-1"
        >
          {sections.map((section, idx) => (
            <div key={section.title || idx} className="space-y-1">
              {section.title && !collapsed && (
                <div
                  className={`px-3 pb-1.5 flex items-center justify-between ${
                    idx > 0 ? "pt-3 border-t border-border/40 mt-3" : "pt-1"
                  }`}
                >
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/75">
                    {section.title}
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground/45">
                    {section.items.length}
                  </span>
                </div>
              )}
              {collapsed && idx > 0 && <div className="my-2.5 border-t border-border/50" />}
              {section.items.map(({ to, label, icon: Icon }) => {
                const active = isItemActive(to, pathname);
                return (
                  <Link
                    key={`${section.title}-${to}`}
                    to={to}
                    suppressHydrationWarning
                    title={
                      collapsed ? `${section.title ? `${section.title}: ` : ""}${label}` : undefined
                    }
                    className={`group flex items-center rounded-xl py-2 text-sm font-medium transition ${
                      collapsed ? "justify-center px-2" : "gap-2.5 px-3"
                    } ${
                      active
                        ? "bg-primary/15 text-primary font-semibold shadow-xs"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    }`}
                  >
                    <Icon className={`size-4 shrink-0 ${active ? "text-primary" : ""}`} />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom Switch/Exit Links */}
        <div className="shrink-0 border-t border-border/40 pt-3 text-xs space-y-1">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Link
                to="/"
                title="Back to customer storefront"
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition"
              >
                <Store className="size-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {!isOwnerView && profile.role === "owner" && (
                <Link
                  to="/owner"
                  className="block truncate text-muted-foreground hover:text-foreground transition"
                >
                  &larr; Switch to Owner panel
                </Link>
              )}
              <Link
                to="/"
                className="block truncate text-muted-foreground hover:text-foreground transition"
              >
                &larr; Back to customer storefront
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Drawer Overlay Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-popover px-4 py-4 shadow-2xl transition-transform duration-200 ease-in-out lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border/40 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <img
              src={displayLogo}
              alt={storeName}
              width={32}
              height={32}
              className="size-8 rounded-lg object-contain"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight">{storeName}</p>
              <p className="text-[11px] text-muted-foreground">Panel {roleLabel}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav
          suppressHydrationWarning
          className="sidebar-scroll my-3 flex-1 min-h-0 overflow-y-auto space-y-3 pr-1"
        >
          {sections.map((section, idx) => (
            <div key={section.title || idx} className="space-y-1">
              {section.title && (
                <div
                  className={`px-3 pb-1.5 flex items-center justify-between ${
                    idx > 0 ? "pt-3 border-t border-border/40 mt-3" : "pt-1"
                  }`}
                >
                  <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-muted-foreground/75">
                    {section.title}
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground/45">
                    {section.items.length}
                  </span>
                </div>
              )}
              {section.items.map(({ to, label, icon: Icon }) => {
                const active = isItemActive(to, pathname);
                return (
                  <Link
                    key={`${section.title}-${to}`}
                    to={to}
                    onClick={() => setMobileOpen(false)}
                    suppressHydrationWarning
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-primary/15 text-primary font-semibold shadow-xs"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    }`}
                  >
                    <Icon className={`size-4 shrink-0 ${active ? "text-primary" : ""}`} />
                    <span className="truncate">{label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-border/40 pt-3 text-xs space-y-1.5">
          {!isOwnerView && profile.role === "owner" && (
            <Link
              to="/owner"
              onClick={() => setMobileOpen(false)}
              className="block truncate text-muted-foreground hover:text-foreground transition"
            >
              &larr; Switch to Owner panel
            </Link>
          )}
          <Link
            to="/"
            onClick={() => setMobileOpen(false)}
            className="block truncate text-muted-foreground hover:text-foreground transition"
          >
            &larr; Back to customer storefront
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={`transition-all duration-200 ease-in-out ${collapsed ? "lg:pl-16" : "lg:pl-64"}`}
      >
        <header className="sticky top-0 z-30 border-b border-border bg-background/90 px-3 sm:px-6 py-3 sm:py-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {/* Mobile hamburger menu toggle */}
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation menu"
                className="flex lg:hidden items-center justify-center size-9 rounded-xl border border-border bg-secondary/40 text-foreground hover:bg-secondary transition shrink-0"
              >
                <Menu className="size-4" />
              </button>

              {/* Desktop sidebar collapse toggle */}
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                className="hidden lg:flex items-center justify-center size-9 rounded-xl border border-border bg-secondary/40 text-foreground hover:bg-secondary transition shrink-0"
              >
                {collapsed ? (
                  <PanelLeftOpen className="size-4" />
                ) : (
                  <PanelLeft className="size-4" />
                )}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-lg sm:text-xl font-bold">{title}</h1>
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-primary shrink-0">
                    {roleLabel}
                  </span>
                </div>
                {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
              </div>
            </div>
            {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
          </div>

          <div className="no-scrollbar -mx-3 sm:-mx-6 mt-2.5 flex gap-1.5 overflow-x-auto px-3 sm:px-6 lg:hidden">
            {flatNav.map(({ to, label }) => {
              const isActive = isItemActive(to, pathname);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs font-bold"
                      : "border border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </header>

        <main className="px-3 sm:px-6 py-4 sm:py-6 pb-20">{children}</main>
      </div>
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="glow-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="glow-card space-y-3 p-4">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export const fieldClass =
  "mt-1 w-full rounded-xl border border-input bg-secondary/40 px-3 py-2.5 text-sm outline-none focus:border-primary";
