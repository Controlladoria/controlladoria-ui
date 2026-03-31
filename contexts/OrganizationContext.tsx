'use client';

/**
 * Organization Context
 * Provides multi-org state and switching functionality to all components.
 * Must be nested inside AuthProvider.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { orgApiClient, type Organization, type CreateOrgRequest } from '@/lib/org-api';
import { authTokens } from '@/lib/auth-api';

interface OrganizationContextType {
  organizations: Organization[];
  activeOrg: Organization | null;
  isLoading: boolean;
  switchOrg: (orgId: number) => Promise<void>;
  createOrg: (data: CreateOrgRequest) => Promise<void>;
  refreshOrgs: () => Promise<void>;
  pendingInvitationsCount: number;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingInvitationsCount, setPendingInvitationsCount] = useState(0);

  // Derive active org from the list
  const activeOrg = organizations.find((o) => o.is_active) || null;

  // Fetch organizations list
  const refreshOrgs = useCallback(async () => {
    if (!isAuthenticated) {
      setOrganizations([]);
      return;
    }

    setIsLoading(true);
    try {
      const orgs = await orgApiClient.listOrganizations();
      setOrganizations(orgs);
    } catch (error) {
      console.error('Failed to load organizations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch pending invitations count
  const fetchPendingInvitations = useCallback(async () => {
    if (!isAuthenticated) {
      setPendingInvitationsCount(0);
      return;
    }

    try {
      const invitations = await orgApiClient.listMyInvitations();
      const pending = invitations.filter((inv) => !inv.is_expired);
      setPendingInvitationsCount(pending.length);
    } catch {
      // Silently ignore
    }
  }, [isAuthenticated]);

  // Load orgs when user changes
  useEffect(() => {
    if (isAuthenticated) {
      refreshOrgs();
      fetchPendingInvitations();
    } else {
      setOrganizations([]);
      setPendingInvitationsCount(0);
    }
  }, [isAuthenticated, refreshOrgs, fetchPendingInvitations]);

  // Switch active organization
  const switchOrg = useCallback(
    async (orgId: number) => {
      setIsLoading(true);
      try {
        const response = await orgApiClient.switchOrganization(orgId);

        // Update tokens with new org-scoped ones
        authTokens.setTokens(response.access_token, response.refresh_token);

        // Refresh the org list to update is_active flags
        const orgs = await orgApiClient.listOrganizations();
        setOrganizations(orgs);

        // Refresh user data (role may have changed)
        await refreshUser();
      } catch (error) {
        console.error('Failed to switch organization:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshUser]
  );

  // Create a new organization
  const createOrg = useCallback(
    async (data: CreateOrgRequest) => {
      setIsLoading(true);
      try {
        const response = await orgApiClient.createOrganization(data);

        // Update tokens with new org-scoped ones
        authTokens.setTokens(response.access_token, response.refresh_token);

        // Refresh the org list
        const orgs = await orgApiClient.listOrganizations();
        setOrganizations(orgs);

        // Refresh user data
        await refreshUser();
      } catch (error) {
        console.error('Failed to create organization:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshUser]
  );

  const value: OrganizationContextType = {
    organizations,
    activeOrg,
    isLoading,
    switchOrg,
    createOrg,
    refreshOrgs,
    pendingInvitationsCount,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

// Custom hook to use organization context
export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}

export default OrganizationContext;
