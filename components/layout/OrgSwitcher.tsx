'use client';

/**
 * Organization Switcher
 * Dropdown in the sidebar for switching between organizations.
 * Shows all orgs the user belongs to with their role badges.
 */

import { useState, useRef, useEffect } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  Building2,
  ChevronDown,
  Check,
  Bell,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import CreateOrgDialog from '@/components/organizations/CreateOrgDialog';

// Role display config
const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
  owner: { label: 'Proprietário', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  admin: { label: 'Admin', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  accountant: { label: 'Contador', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  bookkeeper: { label: 'Auxiliar', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300' },
  viewer: { label: 'Visualizador', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300' },
  api_user: { label: 'API', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
};

export default function OrgSwitcher() {
  const { organizations, activeOrg, switchOrg, isLoading, pendingInvitationsCount } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check if user is owner of any org
  const isOwner = organizations.some((org) => org.role === 'owner');

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Don't render if user has only 1 org, no pending invitations, and is not an owner
  if (organizations.length <= 1 && pendingInvitationsCount === 0 && !isOwner) {
    return null;
  }

  const handleSwitch = async (orgId: number) => {
    if (activeOrg?.id === orgId) {
      setIsOpen(false);
      return;
    }

    setIsSwitching(true);
    try {
      await switchOrg(orgId);
      setIsOpen(false);
      toast.success('Empresa alterada com sucesso!');
      // Reload to refresh all data with new org context
      window.location.reload();
    } catch (error) {
      toast.error('Erro ao trocar de empresa.');
    } finally {
      setIsSwitching(false);
    }
  };

  const getRoleConfig = (role: string) => {
    return ROLE_CONFIG[role] || { label: role, color: 'bg-gray-100 text-gray-700' };
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-accent/50 hover:bg-accent transition-all text-left group"
      >
        {activeOrg?.logo_url ? (
          <img src={activeOrg.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover shadow-md flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 bg-gradient-to-br from-[#0d767b] to-[#095a5e] rounded-lg flex items-center justify-center text-white shadow-md flex-shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {activeOrg?.company_name || 'Selecionar Empresa'}
          </p>
          {activeOrg && (
            <p className="text-xs text-muted-foreground truncate">
              {activeOrg.cnpj} • {getRoleConfig(activeOrg.role).label}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {pendingInvitationsCount > 0 && (
            <span className="w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {pendingInvitationsCount}
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="py-2 max-h-64 overflow-y-auto">
            {organizations.map((org) => {
              const roleConfig = getRoleConfig(org.role);
              const isActive = org.id === activeOrg?.id;

              return (
                <button
                  key={org.id}
                  onClick={() => handleSwitch(org.id)}
                  disabled={isSwitching}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-all text-left ${
                    isActive ? 'bg-accent/30' : ''
                  }`}
                >
                  {org.logo_url ? (
                    <img src={org.logo_url} alt="" className={`w-8 h-8 rounded-lg object-cover shadow-sm flex-shrink-0 ${isActive ? 'ring-2 ring-[#0d767b]' : ''}`} />
                  ) : (
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm flex-shrink-0 ${
                        isActive
                          ? 'bg-gradient-to-br from-[#0d767b] to-[#095a5e]'
                          : 'bg-muted-foreground/20'
                      }`}
                    >
                      {org.company_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {org.company_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{org.cnpj}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${roleConfig.color}`}>
                        {roleConfig.label}
                      </span>
                    </div>
                  </div>
                  {isActive && <Check className="w-4 h-4 text-[#0d767b] flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Pending invitations link */}
          {pendingInvitationsCount > 0 && (
            <div className="border-t border-border px-4 py-3">
              <a
                href="/organizations/invitations"
                className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium"
                onClick={() => setIsOpen(false)}
              >
                <Bell className="w-4 h-4" />
                {pendingInvitationsCount} convite{pendingInvitationsCount > 1 ? 's' : ''} pendente{pendingInvitationsCount > 1 ? 's' : ''}
              </a>
            </div>
          )}

          {/* Create new org button (owners only) */}
          {isOwner && (
            <div className="border-t border-border px-4 py-3">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowCreateDialog(true);
                }}
                className="flex items-center gap-2 text-sm text-[#0d767b] dark:text-[#0d767b] hover:text-[#095a5e] dark:hover:text-[#0d767b]/80 font-semibold w-full"
              >
                <Plus className="w-4 h-4" />
                Criar Nova Empresa
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading overlay */}
      {isSwitching && (
        <div className="absolute inset-0 bg-background/50 rounded-xl flex items-center justify-center z-50">
          <div className="w-5 h-5 border-2 border-[#0d767b] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Create Org Dialog */}
      <CreateOrgDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </div>
  );
}
