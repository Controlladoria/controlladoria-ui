/**
 * Organizations API Client
 * Handles all multi-org related API calls
 */

import { api } from './api';

// Types
export interface Organization {
  id: number;
  company_name: string;
  cnpj: string;
  trade_name?: string | null;
  role: string;
  is_active: boolean;
  logo_url?: string | null;
}

export interface SwitchOrgResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  organization: Organization;
}

export interface InviteRequest {
  email: string;
  role: string;
}

export interface InviteResponse {
  message: string;
  invitation_id: number;
  target_email: string;
  role: string;
  expires_at: string;
}

export interface InvitationDetail {
  id: number;
  organization_name: string;
  organization_cnpj: string;
  inviter_name: string;
  inviter_email: string;
  role: string;
  expires_at: string;
  is_expired: boolean;
}

export interface AcceptInvitationResponse {
  message: string;
  organization: Organization;
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface CreateOrgRequest {
  cnpj: string;
  company_name: string;
  trade_name?: string | null;
  cnae_code?: string | null;
  cnae_description?: string | null;
  company_address_street?: string | null;
  company_address_number?: string | null;
  company_address_complement?: string | null;
  company_address_district?: string | null;
  company_address_city?: string | null;
  company_address_state?: string | null;
  company_address_zip?: string | null;
  capital_social?: number | null;
  company_size?: string | null;
  legal_nature?: string | null;
  company_phone?: string | null;
  company_email?: string | null;
  company_status?: string | null;
  company_opened_at?: string | null;
  is_simples_nacional?: boolean | null;
  is_mei?: boolean | null;
  qsa_partners?: any[] | null;
  cnaes_secundarios?: any[] | null;
  company_address_type?: string | null;
  is_headquarters?: boolean | null;
  ibge_code?: string | null;
  regime_tributario?: string | null;
  simples_desde?: string | null;
  simples_excluido_em?: string | null;
  main_partner_name?: string | null;
  main_partner_qualification?: string | null;
}

export interface OrgInvitationListItem {
  id: number;
  target_email: string;
  role: string;
  inviter_name: string;
  inviter_email: string;
  created_at: string;
  expires_at: string;
  is_expired: boolean;
  accepted_at: string | null;
  declined_at: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
}

// API client
export const orgApiClient = {
  /**
   * List all organizations the current user belongs to
   */
  async listOrganizations(): Promise<Organization[]> {
    const response = await api.get<Organization[]>('/organizations/');
    return response.data;
  },

  /**
   * Switch active organization (returns new tokens)
   */
  async switchOrganization(orgId: number): Promise<SwitchOrgResponse> {
    const response = await api.post<SwitchOrgResponse>(`/organizations/${orgId}/switch`);
    return response.data;
  },

  /**
   * Invite a user to an organization
   */
  async inviteToOrg(orgId: number, data: InviteRequest): Promise<InviteResponse> {
    const response = await api.post<InviteResponse>(`/organizations/${orgId}/invite`, data);
    return response.data;
  },

  /**
   * Get invitation details by token (public, no auth needed)
   */
  async getInvitationDetails(token: string): Promise<InvitationDetail> {
    const response = await api.get<InvitationDetail>(`/organizations/invitations/${token}`);
    return response.data;
  },

  /**
   * Accept an organization invitation
   */
  async acceptInvitation(token: string): Promise<AcceptInvitationResponse> {
    const response = await api.post<AcceptInvitationResponse>(
      `/organizations/invitations/${token}/accept`
    );
    return response.data;
  },

  /**
   * Decline an organization invitation
   */
  async declineInvitation(token: string): Promise<{ message: string }> {
    const response = await api.post(`/organizations/invitations/${token}/decline`);
    return response.data;
  },

  /**
   * List pending invitations for current user
   */
  async listMyInvitations(): Promise<InvitationDetail[]> {
    const response = await api.get<InvitationDetail[]>('/organizations/invitations');
    return response.data;
  },

  /**
   * List all invitations for an organization (admin)
   */
  async listOrgInvitations(orgId: number): Promise<OrgInvitationListItem[]> {
    const response = await api.get<OrgInvitationListItem[]>(`/organizations/${orgId}/invitations`);
    return response.data;
  },

  /**
   * Cancel a pending org invitation (admin)
   */
  async cancelInvitation(orgId: number, invitationId: number): Promise<{ message: string }> {
    const response = await api.delete(`/organizations/${orgId}/invitations/${invitationId}`);
    return response.data;
  },

  /**
   * Create a new organization (owner only)
   */
  async createOrganization(data: CreateOrgRequest): Promise<SwitchOrgResponse> {
    const response = await api.post<SwitchOrgResponse>('/organizations/create', data);
    return response.data;
  },
};

export default orgApiClient;
