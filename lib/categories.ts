/**
 * DRE Category Mappings for Frontend Display
 * Mirrors the backend accounting/categories.py (V2 — 52 categories)
 * Maps raw category keys to human-readable display names with account codes
 */

export interface CategoryInfo {
  displayName: string;
  accountCode: string;
  nature: string;
  group: string;
}

/**
 * Maps raw category keys (e.g. "receita_vendas_produtos") to display info.
 */
export const CATEGORY_MAP: Record<string, CategoryInfo> = {
  // 1.1 - Receita Bruta
  receita_vendas_produtos: { displayName: "Receita de Vendas de Produtos", accountCode: "1.1.01", nature: "Receita", group: "Receita Bruta" },
  receita_servicos: { displayName: "Receita de Prestação de Serviços", accountCode: "1.1.02", nature: "Receita", group: "Receita Bruta" },
  receita_locacao: { displayName: "Receita de Locação", accountCode: "1.1.03", nature: "Receita", group: "Receita Bruta" },
  receita_comissoes: { displayName: "Receita de Comissões", accountCode: "1.1.04", nature: "Receita", group: "Receita Bruta" },
  receita_contratos_recorrentes: { displayName: "Receita de Contratos Recorrentes", accountCode: "1.1.05", nature: "Receita", group: "Receita Bruta" },

  // 1.2 - Deduções
  impostos_sobre_vendas: { displayName: "Impostos sobre Vendas", accountCode: "1.2.01", nature: "Dedução", group: "(-) Deduções" },
  devolucoes: { displayName: "Devoluções", accountCode: "1.2.02", nature: "Dedução", group: "(-) Deduções" },
  descontos_concedidos: { displayName: "Descontos Concedidos", accountCode: "1.2.03", nature: "Dedução", group: "(-) Deduções" },

  // 1.4 - Outras Receitas
  receita_financeira: { displayName: "Receita Financeira", accountCode: "1.4.01", nature: "Receita", group: "Outras Receitas" },
  juros_ativos: { displayName: "Juros Ativos", accountCode: "1.4.02", nature: "Receita", group: "Outras Receitas" },
  descontos_obtidos: { displayName: "Descontos Obtidos", accountCode: "1.4.03", nature: "Receita", group: "Outras Receitas" },
  recuperacao_despesas: { displayName: "Recuperação de Despesas", accountCode: "1.4.04", nature: "Receita", group: "Outras Receitas" },

  // 1.5 - Receitas Não Operacionais
  venda_imobilizado: { displayName: "Venda de Imobilizado", accountCode: "1.5.01", nature: "Receita", group: "Receitas Não Operacionais" },
  indenizacoes_recebidas: { displayName: "Indenizações", accountCode: "1.5.02", nature: "Receita", group: "Receitas Não Operacionais" },
  outras_receitas_eventuais: { displayName: "Outras Receitas Eventuais", accountCode: "1.5.03", nature: "Receita", group: "Receitas Não Operacionais" },

  // 2.1 - Custos Diretos (Variáveis)
  cmv: { displayName: "Custo das Mercadorias Vendidas (CMV)", accountCode: "2.1.01", nature: "Custo", group: "(-) Custos" },
  csp: { displayName: "Custo dos Serviços Prestados (CSP)", accountCode: "2.1.02", nature: "Custo", group: "(-) Custos" },
  materia_prima: { displayName: "Matéria-Prima", accountCode: "2.1.03", nature: "Custo", group: "(-) Custos" },
  insumos: { displayName: "Insumos", accountCode: "2.1.04", nature: "Custo", group: "(-) Custos" },
  comissoes_sobre_vendas: { displayName: "Comissões sobre Vendas", accountCode: "2.1.05", nature: "Custo", group: "(-) Custos" },

  // 2.2 - Custos Indiretos de Produção
  salarios_producao: { displayName: "Salários Produção", accountCode: "2.2.01", nature: "Custo", group: "(-) Custos" },
  encargos_sociais_producao: { displayName: "Encargos Sociais Produção", accountCode: "2.2.02", nature: "Custo", group: "(-) Custos" },
  energia_producao: { displayName: "Energia Produção", accountCode: "2.2.03", nature: "Custo", group: "(-) Custos" },
  manutencao_equipamentos_producao: { displayName: "Manutenção Equipamentos", accountCode: "2.2.04", nature: "Custo", group: "(-) Custos" },

  // 3.1 - Despesas Administrativas (Fixas)
  salarios_administrativos: { displayName: "Salários Administrativos", accountCode: "3.1.01", nature: "Despesa", group: "(-) Despesas Operacionais" },
  pro_labore: { displayName: "Pró-labore", accountCode: "3.1.02", nature: "Despesa", group: "(-) Despesas Operacionais" },
  encargos_sociais_administrativos: { displayName: "Encargos Sociais Administrativos", accountCode: "3.1.03", nature: "Despesa", group: "(-) Despesas Operacionais" },
  aluguel: { displayName: "Aluguel", accountCode: "3.1.04", nature: "Despesa", group: "(-) Despesas Operacionais" },
  condominio: { displayName: "Condomínio", accountCode: "3.1.05", nature: "Despesa", group: "(-) Despesas Operacionais" },
  agua_energia: { displayName: "Água e Energia", accountCode: "3.1.06", nature: "Despesa", group: "(-) Despesas Operacionais" },
  material_escritorio: { displayName: "Material de Escritório", accountCode: "3.1.07", nature: "Despesa", group: "(-) Despesas Operacionais" },
  honorarios_contabeis: { displayName: "Honorários Contábeis", accountCode: "3.1.08", nature: "Despesa", group: "(-) Despesas Operacionais" },
  sistemas_softwares: { displayName: "Sistemas e Softwares", accountCode: "3.1.09", nature: "Despesa", group: "(-) Despesas Operacionais" },
  telefonia_internet: { displayName: "Telefonia e Internet", accountCode: "3.1.10", nature: "Despesa", group: "(-) Despesas Operacionais" },

  // 3.2 - Despesas Comerciais (Fixas)
  marketing_publicidade: { displayName: "Marketing e Publicidade", accountCode: "3.2.01", nature: "Despesa", group: "(-) Despesas Operacionais" },
  propaganda_digital: { displayName: "Propaganda Digital", accountCode: "3.2.02", nature: "Despesa", group: "(-) Despesas Operacionais" },
  comissao_vendas: { displayName: "Comissão de Vendas", accountCode: "3.2.03", nature: "Despesa", group: "(-) Despesas Operacionais" },
  fretes: { displayName: "Fretes", accountCode: "3.2.04", nature: "Despesa", group: "(-) Despesas Operacionais" },
  representantes_comerciais: { displayName: "Representantes Comerciais", accountCode: "3.2.05", nature: "Despesa", group: "(-) Despesas Operacionais" },

  // 3.3 - Resultado Financeiro
  juros_passivos: { displayName: "Juros Passivos", accountCode: "3.3.01", nature: "Despesa", group: "Resultado Financeiro" },
  tarifas_bancarias: { displayName: "Tarifas Bancárias", accountCode: "3.3.02", nature: "Despesa", group: "Resultado Financeiro" },
  iof: { displayName: "IOF", accountCode: "3.3.03", nature: "Despesa", group: "Resultado Financeiro" },
  multas_encargos: { displayName: "Multas e Encargos", accountCode: "3.3.04", nature: "Despesa", group: "Resultado Financeiro" },

  // 3.4 - Tributos
  irpj: { displayName: "IRPJ", accountCode: "3.4.01", nature: "Despesa", group: "(-) Tributos" },
  csll: { displayName: "CSLL", accountCode: "3.4.02", nature: "Despesa", group: "(-) Tributos" },
  simples_nacional: { displayName: "Simples Nacional", accountCode: "3.4.03", nature: "Despesa", group: "(-) Tributos" },
  iptu: { displayName: "IPTU", accountCode: "3.4.04", nature: "Despesa", group: "(-) Tributos" },
  taxas_municipais: { displayName: "Taxas Municipais", accountCode: "3.4.05", nature: "Despesa", group: "(-) Tributos" },

  // 3.5 - Outras Despesas
  perdas: { displayName: "Perdas", accountCode: "3.5.01", nature: "Despesa", group: "Outras Despesas" },
  indenizacoes_pagas: { displayName: "Indenizações", accountCode: "3.5.02", nature: "Despesa", group: "Outras Despesas" },
  doacoes: { displayName: "Doações", accountCode: "3.5.03", nature: "Despesa", group: "Outras Despesas" },
  provisoes: { displayName: "Provisões", accountCode: "3.5.04", nature: "Despesa", group: "Outras Despesas" },

  // Depreciação e Amortização
  depreciacao: { displayName: "Depreciação", accountCode: "8.1.01", nature: "Despesa", group: "Depreciação e Amortização" },
  amortizacao: { displayName: "Amortização", accountCode: "8.1.02", nature: "Despesa", group: "Depreciação e Amortização" },

  // Genéricos
  outras_despesas_operacionais: { displayName: "Outras Despesas Operacionais", accountCode: "6.9.01", nature: "Despesa", group: "(-) Despesas Operacionais" },
  nao_categorizado: { displayName: "Não Categorizado", accountCode: "9.9.99", nature: "Despesa", group: "(-) Despesas Operacionais" },
};

/**
 * Get human-readable display name for a category.
 * Format: "Natureza - Código - Nome" (e.g. "Despesa - 3.1.04 - Aluguel")
 */
export function formatCategory(raw: string | null | undefined): string {
  if (!raw) return "Sem categoria";

  const info = CATEGORY_MAP[raw.toLowerCase().trim()];
  if (!info) {
    // Try to make unknown categories readable (replace underscores, capitalize)
    return raw
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return `${info.nature} - ${info.accountCode} - ${info.displayName}`;
}

/**
 * Get just the display name without the account code prefix.
 */
export function getCategoryDisplayName(raw: string | null | undefined): string {
  if (!raw) return "Sem categoria";

  const info = CATEGORY_MAP[raw.toLowerCase().trim()];
  if (!info) {
    return raw
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return info.displayName;
}

/**
 * Get the category info object (null if unknown).
 */
export function getCategoryInfo(raw: string | null | undefined): CategoryInfo | null {
  if (!raw) return null;
  return CATEGORY_MAP[raw.toLowerCase().trim()] || null;
}
