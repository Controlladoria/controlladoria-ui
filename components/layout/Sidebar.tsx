"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import OrgSwitcher from "@/components/layout/OrgSwitcher";
import {
  LayoutDashboard,
  FileText,
  Upload,
  ClipboardCheck,
  TrendingUp,
  CreditCard,
  LogOut,
  Mail,
  Shield,
  Menu,
  X,
  User,
  Users,
  Bell,
  Building2,
} from "lucide-react";

interface NavItem {
  label: string;
  href?: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
  onClick?: () => void;
  ownerOnly?: boolean;  // Only visible to owners
  adminOnly?: boolean;  // Visible to owners and admins
  superAdminOnly?: boolean;  // Deprecated: use ownerOnly instead
  hidden?: boolean;  // Dynamically hide item
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isTrialing, trialDaysLeft } = useSubscription();
  const { pendingInvitationsCount } = useOrganization();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingValidationCount, setPendingValidationCount] = useState(0);

  // Fetch pending validation count
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const { api } = await import("@/lib/api");
        const response = await api.get("/documents/pending-validation/count");
        setPendingValidationCount(response.data?.count || 0);
      } catch {
        // Silently ignore - user may not be authenticated yet
      }
    };

    fetchPendingCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
    },
    {
      label: "Documentos",
      href: "/documents",
      icon: FileText,
    },
    {
      label: "Upload",
      href: "/upload",
      icon: Upload,
    },
    {
      label: "Validação",
      href: "/validation",
      icon: ClipboardCheck,
      badge: pendingValidationCount > 0 ? `${pendingValidationCount}` : undefined,
      badgeColor: "bg-amber-500 text-white",
    },
    {
      label: "Relatórios",
      href: "/dre-balanco",
      icon: TrendingUp,
    },
    {
      label: "Empresa",
      href: "/account/organization",
      icon: Building2,
      adminOnly: true,  // Owners and admins can manage org settings
    },
    {
      label: "Assinatura",
      href: "/account/subscription",
      icon: CreditCard,
      ownerOnly: true,  // Only owners can manage subscription
    },
    {
      label: "Gerenciar Equipe",
      href: "/account/team",
      icon: Users,
      adminOnly: true,  // Owners and admins can manage team
    },
    {
      label: "Convites",
      href: "/organizations/invitations",
      icon: Bell,
      badge: pendingInvitationsCount > 0 ? `${pendingInvitationsCount}` : undefined,
      badgeColor: "bg-amber-500 text-white",
      hidden: pendingInvitationsCount === 0,  // Only show when there are pending invitations
    },
    {
      label: "Contato",
      href: "/contato",
      icon: Mail,
    },
    {
      label: "Admin",
      href: "/admin",
      icon: Shield,
      adminOnly: true,
    },
  ];

  return (
    <>
      {/* Mobile Menu Button - Only visible on mobile */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-gradient-to-br from-[#0d767b] to-[#095a5e] text-white p-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Backdrop - Only visible when mobile menu is open */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar - Hidden on mobile by default, overlay when open */}
      <div className={`
        flex flex-col h-screen bg-gradient-to-br from-[#0d767b]/5 via-muted to-background dark:from-[#0d767b]/8 dark:via-card text-foreground w-96 shadow-2xl border-r-2 border-border
        fixed lg:relative z-50
        transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
      {/* Logo Section */}
      <div className="p-4 border-b-2 border-border relative bg-gradient-to-r from-[#0d767b]/5 to-transparent dark:from-[#0d767b]/8">
        {/* Close button - Only visible on mobile */}
        <button
          onClick={closeMobileMenu}
          className="lg:hidden absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          aria-label="Close menu"
        >
          <X className="w-6 h-6" />
        </button>

        <Link href="/" className="flex items-center justify-center py-2" onClick={closeMobileMenu}>
          <img src="/logo-horizontal.svg" alt="ControlladorIA" className="w-full h-20 object-contain px-4" />
        </Link>
      </div>

      {/* User Info */}
      <div className="p-6 border-b border-border bg-card relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-[#0d767b] to-[#f86a15] rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg ring-2 ring-[#0d767b]/50">
            {user?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate text-xl">
              {user?.full_name || user?.email?.split('@')[0] || "Usuário"}
            </p>
            <p className="text-base text-muted-foreground truncate">{user?.email}</p>
          </div>
          <Link
            href="/account/profile"
            onClick={closeMobileMenu}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
            title="Meu Perfil"
          >
            <User className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Organization Switcher */}
      <div className="px-4 py-3 border-b border-border">
        <OrgSwitcher />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
        {navItems.map((item) => {
          // Dynamically hidden items
          if (item.hidden) return null;
          // Owner-only items require owner role
          if (item.ownerOnly && user?.role !== 'owner') return null;
          // Admin-only items require owner or admin role
          if (item.adminOnly && user?.role !== 'owner' && user?.role !== 'admin') return null;
          // Super admin items require owner role (deprecated, use ownerOnly)
          if (item.superAdminOnly && user?.role !== 'owner') return null;

          const isActive = pathname === item.href;

          return (
            <Link
              key={item.label}
              href={item.href || "#"}
              onClick={(e) => {
                closeMobileMenu();
                if (item.onClick) item.onClick();
              }}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group ${
                isActive
                  ? "bg-gradient-to-r from-[#0d767b] to-[#095a5e] text-white shadow-lg scale-105"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <item.icon className={`w-6 h-6 ${isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground"}`} />
              <span className="font-semibold flex-1 text-xl">{item.label}</span>
              {item.badge && (
                <span className={`text-base font-bold px-3 py-1.5 rounded-full ${item.badgeColor} text-white`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t-2 border-border space-y-2 bg-gradient-to-t from-[#0d767b]/5 to-transparent dark:from-[#0d767b]/8">
        <button
          onClick={() => {
            closeMobileMenu();
            handleLogout();
          }}
          className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-all w-full"
        >
          <LogOut className="w-6 h-6" />
          <span className="font-semibold text-xl">Sair</span>
        </button>
      </div>

      {/* Version */}
      <div className="p-4 text-center border-t border-border bg-muted/10">
        <p className="text-sm text-muted-foreground font-medium">v1.0.0 • © 2026 ControlladorIA</p>
      </div>
    </div>
    </>
  );
}
