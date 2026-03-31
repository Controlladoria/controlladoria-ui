'use client';

import { useState, useEffect } from 'react';
import { api, apiClient } from '@/lib/api';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Sidebar from '@/components/layout/Sidebar';
import SubscriptionGuard from '@/components/stripe/SubscriptionGuard';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import {
  Users, Search, PlusCircle, Edit, Trash2, Building, Mail, Phone, MapPin, X
} from 'lucide-react';

interface Client {
  id: number;
  name: string;
  legal_name?: string;
  tax_id?: string;
  email?: string;
  phone?: string;
  address?: string;
  client_type: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface ClientFormData {
  name: string;
  legal_name: string;
  tax_id: string;
  email: string;
  phone: string;
  address: string;
  client_type: string;
  notes: string;
}

function ClientsPageContent() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientTypeFilter, setClientTypeFilter] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    legal_name: '',
    tax_id: '',
    email: '',
    phone: '',
    address: '',
    client_type: 'customer',
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchClients();
  }, [clientTypeFilter]);

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (clientTypeFilter) params.client_type = clientTypeFilter;

      const response = await apiClient.listClients(params);
      setClients(response.clients);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Erro ao carregar clientes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        legal_name: client.legal_name || '',
        tax_id: client.tax_id || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        client_type: client.client_type,
        notes: client.notes || '',
      });
    } else {
      setEditingClient(null);
      setFormData({
        name: '',
        legal_name: '',
        tax_id: '',
        email: '',
        phone: '',
        address: '',
        client_type: 'customer',
        notes: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
    setFormData({
      name: '',
      legal_name: '',
      tax_id: '',
      email: '',
      phone: '',
      address: '',
      client_type: 'customer',
      notes: '',
    });
  };

  const handleSaveClient = async () => {
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setIsSaving(true);
    try {
      if (editingClient) {
        // Update existing client
        await api.patch(`/clients/${editingClient.id}`, formData);
        toast.success('Cliente atualizado com sucesso');
      } else {
        // Create new client
        await api.post('/clients', formData);
        toast.success('Cliente criado com sucesso');
      }
      handleCloseModal();
      fetchClients();
    } catch (error: any) {
      console.error('Error saving client:', error);
      toast.error(error.response?.data?.detail || 'Erro ao salvar cliente');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClientClick = (client: Client) => {
    setClientToDelete(client);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteClientConfirm = async () => {
    if (!clientToDelete) return;

    try {
      await api.delete(`/clients/${clientToDelete.id}`);
      toast.success('Cliente excluído com sucesso');
      fetchClients();
    } catch (error: any) {
      console.error('Error deleting client:', error);
      toast.error(error.response?.data?.detail || 'Erro ao excluir cliente');
    } finally {
      setClientToDelete(null);
    }
  };

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.legal_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.tax_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getClientTypeBadge = (type: string) => {
    switch (type) {
      case 'customer':
        return <span className="px-4 py-2 text-base font-bold rounded-full bg-[#0d767b]/10 dark:bg-[#0d767b]/20 text-[#0d767b] dark:text-[#095a5e]">Cliente</span>;
      case 'supplier':
        return <span className="px-4 py-2 text-base font-bold rounded-full bg-[#0d767b]/10 dark:bg-[#0d767b]/20 text-[#0d767b] dark:text-[#f86a15]">Fornecedor</span>;
      case 'both':
        return <span className="px-4 py-2 text-base font-bold rounded-full bg-accent text-foreground">Ambos</span>;
      default:
        return <span className="px-4 py-2 text-base font-bold rounded-full bg-muted text-foreground">{type}</span>;
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-muted/30 to-accent/20">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Top Nav Bar with Gradient */}
        <div className="hidden lg:block h-2 bg-gradient-to-r from-[#0d767b] via-[#0d767b] to-[#1a9da3] dark:from-[#0d767b] dark:via-[#f86a15] dark:to-[#FB923C]"></div>

        <div className="flex-1 p-8">
        <SubscriptionGuard>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Users className="w-8 h-8 text-[#0d767b] dark:text-[#0d767b]" />
                Clientes e Fornecedores
              </h1>
              <p className="text-muted-foreground mt-2">
                Gerencie seus clientes, fornecedores e parceiros
              </p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#0d767b] to-[#f86a15] hover:from-[#f86a15] hover:to-[#0d767b] text-white rounded-lg transition-colors"
            >
              <PlusCircle className="w-5 h-5" />
              Novo Cliente
            </button>
          </div>

          {/* Filters */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nome, CNPJ/CPF, email..."
                    className="w-full pl-10 pr-4 py-2 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d767b]"
                  />
                </div>
              </div>
              <select
                value={clientTypeFilter}
                onChange={(e) => setClientTypeFilter(e.target.value)}
                className="px-4 py-2 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d767b]"
              >
                <option value="">Todos os Tipos</option>
                <option value="customer">Clientes</option>
                <option value="supplier">Fornecedores</option>
                <option value="both">Ambos</option>
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-4 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Total: <strong className="text-foreground">{filteredClients.length}</strong> {filteredClients.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>
          </div>

          {/* Clients Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              <div className="col-span-full flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0d767b]"></div>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum cliente encontrado</p>
                <button
                  onClick={() => handleOpenModal()}
                  className="mt-4 text-[#0d767b] hover:text-[#f86a15] font-medium"
                >
                  Criar primeiro cliente
                </button>
              </div>
            ) : (
              filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="bg-card rounded-lg shadow-sm border border-border p-6 hover:shadow-md hover:border-[#0d767b] dark:hover:border-[#f86a15] transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Building className="w-5 h-5 text-[#0d767b] dark:text-[#0d767b]" />
                        <h3 className="font-semibold text-foreground">{client.name}</h3>
                      </div>
                      {client.legal_name && (
                        <p className="text-sm text-muted-foreground mb-2">{client.legal_name}</p>
                      )}
                      <div className="mb-3">
                        {getClientTypeBadge(client.client_type)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenModal(client)}
                        className="p-2 text-[#0d767b] hover:bg-[#0d767b]/10 dark:hover:bg-[#0d767b]/20 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClientClick(client)}
                        className="p-2 text-red-600 dark:text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    {client.tax_id && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="font-medium">CNPJ/CPF:</span>
                        <span>{client.tax_id}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4 mt-0.5" />
                        <span className="line-clamp-2">{client.address}</span>
                      </div>
                    )}
                  </div>

                  {client.notes && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground line-clamp-2">{client.notes}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        </SubscriptionGuard>
      </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-foreground">
                  {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Nome * (Nome Fantasia)
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d767b]"
                      placeholder="Ex: Empresa XYZ"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Razão Social
                    </label>
                    <input
                      type="text"
                      value={formData.legal_name}
                      onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d767b]"
                      placeholder="Ex: Empresa XYZ Ltda"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      CNPJ/CPF
                    </label>
                    <input
                      type="text"
                      value={formData.tax_id}
                      onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d767b]"
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Tipo
                    </label>
                    <select
                      value={formData.client_type}
                      onChange={(e) => setFormData({ ...formData, client_type: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d767b]"
                    >
                      <option value="customer">Cliente</option>
                      <option value="supplier">Fornecedor</option>
                      <option value="both">Ambos</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d767b]"
                      placeholder="contato@empresa.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Telefone
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d767b]"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Endereço
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d767b]"
                    placeholder="Rua, número, bairro, cidade - UF"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Observações
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0d767b]"
                    placeholder="Informações adicionais..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2 border border-border text-foreground bg-background rounded-lg hover:bg-accent transition-colors"
                    disabled={isSaving}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveClient}
                    disabled={isSaving}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-[#0d767b] to-[#f86a15] hover:from-[#f86a15] hover:to-[#0d767b] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Salvando...' : editingClient ? 'Atualizar' : 'Criar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setClientToDelete(null);
        }}
        onConfirm={handleDeleteClientConfirm}
        title="Excluir Cliente"
        message={`Tem certeza que deseja excluir ${clientToDelete?.name || 'este cliente'}? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
}

export default function ClientsPage() {
  return (
    <ProtectedRoute>
      <ClientsPageContent />
    </ProtectedRoute>
  );
}
