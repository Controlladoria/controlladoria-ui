'use client';

/**
 * Privacy Policy Page
 * LGPD Compliance - Brazilian Data Protection Law
 */

import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8 md:p-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors mb-4 inline-block"
          >
            ← Voltar para o início
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mt-4">
            Política de Privacidade
          </h1>
          <p className="text-gray-600 mt-2">
            Última atualização: 24 de janeiro de 2026
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-gray max-w-none">
          {/* Introduction */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              1. Introdução
            </h2>
            <p className="text-gray-700 leading-relaxed">
              A ControlladorIA ("nós", "nosso" ou "nossa") está comprometida em proteger
              sua privacidade e seus dados pessoais. Esta Política de Privacidade
              descreve como coletamos, usamos, armazenamos e protegemos suas
              informações em conformidade com a Lei Geral de Proteção de Dados
              (LGPD - Lei nº 13.709/2018).
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              Ao utilizar nossos serviços, você concorda com as práticas descritas
              nesta política.
            </p>
          </section>

          {/* Data Controller */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              2. Controlador de Dados
            </h2>
            <p className="text-gray-700 leading-relaxed">
              A ControlladorIA é a controladora dos dados pessoais coletados através de
              nossa plataforma. Para questões relacionadas à privacidade, entre em
              contato conosco através de:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mt-4">
              <p className="text-gray-700">
                <strong>Email:</strong> privacidade@controllad oria.com
              </p>
              <p className="text-gray-700 mt-2">
                <strong>Encarregado de Dados (DPO):</strong> dpo@controllad oria.com
              </p>
            </div>
          </section>

          {/* Data Collection */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              3. Dados Coletados
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              3.1. Dados Fornecidos por Você
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Coletamos as seguintes informações quando você se cadastra ou utiliza
              nossos serviços:
            </p>
            <ul className="list-disc pl-6 mt-2 text-gray-700">
              <li>Nome completo</li>
              <li>Endereço de e-mail</li>
              <li>Nome da empresa</li>
              <li>CNPJ (Cadastro Nacional da Pessoa Jurídica)</li>
              <li>Telefone (quando fornecido voluntariamente)</li>
              <li>Senha (armazenada de forma criptografada)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              3.2. Documentos Enviados
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Você pode fazer upload dos seguintes tipos de documentos:
            </p>
            <ul className="list-disc pl-6 mt-2 text-gray-700">
              <li>Documentos PDF</li>
              <li>Planilhas Excel (.xlsx, .xls)</li>
              <li>Imagens (JPG, PNG, WebP, GIF)</li>
              <li>Documentos XML (NFe, NFSe, CTe)</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Os documentos são processados por inteligência artificial para extrair
              dados financeiros e são armazenados de forma segura em nossos
              servidores.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              3.3. Dados Coletados Automaticamente
            </h3>
            <ul className="list-disc pl-6 mt-2 text-gray-700">
              <li>Endereço IP</li>
              <li>Tipo de navegador e sistema operacional</li>
              <li>Data e hora de acesso</li>
              <li>Páginas visitadas</li>
              <li>Cookies e tecnologias similares</li>
            </ul>
          </section>

          {/* Purpose of Processing */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              4. Finalidade do Tratamento de Dados
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Utilizamos seus dados pessoais para as seguintes finalidades:
            </p>

            <div className="mt-4 space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900">
                  Prestação de Serviços
                </h4>
                <p className="text-gray-700 mt-1">
                  Processar seus documentos, extrair dados financeiros e gerar
                  relatórios.
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900">
                  Gestão de Conta
                </h4>
                <p className="text-gray-700 mt-1">
                  Criar e gerenciar sua conta de usuário, autenticação e
                  segurança.
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900">
                  Processamento de Pagamentos
                </h4>
                <p className="text-gray-700 mt-1">
                  Gerenciar sua assinatura e processar pagamentos através do
                  Stripe.
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900">
                  Comunicação
                </h4>
                <p className="text-gray-700 mt-1">
                  Enviar e-mails transacionais (confirmações, redefinição de
                  senha, notificações de conta).
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900">
                  Melhoria do Serviço
                </h4>
                <p className="text-gray-700 mt-1">
                  Analisar o uso da plataforma para melhorar funcionalidades e
                  experiência do usuário.
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900">
                  Cumprimento Legal
                </h4>
                <p className="text-gray-700 mt-1">
                  Cumprir obrigações legais e regulatórias aplicáveis.
                </p>
              </div>
            </div>
          </section>

          {/* Legal Basis */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              5. Base Legal (LGPD)
            </h2>
            <p className="text-gray-700 leading-relaxed">
              O tratamento dos seus dados pessoais é fundamentado nas seguintes
              bases legais da LGPD:
            </p>
            <ul className="list-disc pl-6 mt-2 text-gray-700 space-y-2">
              <li>
                <strong>Execução de contrato (Art. 7º, V):</strong> Para prestar
                os serviços contratados
              </li>
              <li>
                <strong>Consentimento (Art. 7º, I):</strong> Para comunicações
                promocionais (quando aplicável)
              </li>
              <li>
                <strong>Legítimo interesse (Art. 7º, IX):</strong> Para melhoria
                dos serviços e segurança
              </li>
              <li>
                <strong>Cumprimento de obrigação legal (Art. 7º, II):</strong>{' '}
                Para atender requisitos legais e fiscais
              </li>
            </ul>
          </section>

          {/* Data Sharing */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              6. Compartilhamento de Dados
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Não vendemos seus dados pessoais. Compartilhamos dados apenas com:
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <h4 className="font-semibold text-gray-900">
                  Provedores de Serviço
                </h4>
                <ul className="list-disc pl-6 mt-1 text-gray-700">
                  <li>
                    <strong>Stripe:</strong> Processamento de pagamentos
                  </li>
                  <li>
                    <strong>OpenAI/Anthropic:</strong> Processamento de documentos
                    com IA
                  </li>
                  <li>
                    <strong>Resend:</strong> Envio de e-mails transacionais
                  </li>
                  <li>
                    <strong>Railway/Render:</strong> Hospedagem e infraestrutura
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mt-4">
                  Autoridades Públicas
                </h4>
                <p className="text-gray-700 mt-1">
                  Quando exigido por lei ou ordem judicial.
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
              <p className="text-gray-800">
                <strong>⚠️ Importante:</strong> Todos os nossos fornecedores são
                obrigados contratualmente a proteger seus dados e utilizá-los
                apenas para os fins especificados.
              </p>
            </div>
          </section>

          {/* Data Storage */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              7. Armazenamento e Segurança
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              7.1. Localização dos Dados
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Seus dados são armazenados em servidores localizados no Brasil ou em
              países com nível adequado de proteção de dados, em conformidade com
              a LGPD.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              7.2. Medidas de Segurança
            </h3>
            <ul className="list-disc pl-6 mt-2 text-gray-700">
              <li>Criptografia de dados em trânsito (HTTPS/TLS)</li>
              <li>Criptografia de senhas (bcrypt)</li>
              <li>Autenticação JWT com tokens de curta duração</li>
              <li>Isolamento de dados entre usuários (multi-tenancy)</li>
              <li>Backups automáticos diários</li>
              <li>Monitoramento de segurança 24/7</li>
              <li>Controle de acesso baseado em funções</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              7.3. Período de Retenção
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Mantemos seus dados pelo período necessário para:
            </p>
            <ul className="list-disc pl-6 mt-2 text-gray-700">
              <li>
                <strong>Dados de conta:</strong> Enquanto sua conta estiver ativa
              </li>
              <li>
                <strong>Documentos:</strong> 12 meses após o upload (ou até
                exclusão manual)
              </li>
              <li>
                <strong>Dados fiscais:</strong> 5 anos (conforme legislação
                brasileira)
              </li>
              <li>
                <strong>Logs de acesso:</strong> 6 meses
              </li>
            </ul>
          </section>

          {/* User Rights */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              8. Seus Direitos (LGPD Art. 18)
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              De acordo com a LGPD, você tem os seguintes direitos sobre seus
              dados:
            </p>

            <div className="space-y-3">
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900">
                  ✓ Confirmação e Acesso
                </h4>
                <p className="text-gray-700 mt-1">
                  Confirmar se tratamos seus dados e solicitar acesso aos mesmos.
                </p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900">✓ Correção</h4>
                <p className="text-gray-700 mt-1">
                  Solicitar correção de dados incompletos, inexatos ou
                  desatualizados.
                </p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900">
                  ✓ Portabilidade
                </h4>
                <p className="text-gray-700 mt-1">
                  Solicitar a portabilidade dos seus dados para outro fornecedor.
                </p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900">✓ Eliminação</h4>
                <p className="text-gray-700 mt-1">
                  Solicitar a exclusão de dados tratados com seu consentimento.
                </p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900">
                  ✓ Revogação do Consentimento
                </h4>
                <p className="text-gray-700 mt-1">
                  Revogar o consentimento a qualquer momento.
                </p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900">✓ Oposição</h4>
                <p className="text-gray-700 mt-1">
                  Opor-se ao tratamento realizado com base em legítimo interesse.
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-6">
              <p className="text-gray-800">
                <strong>📧 Como exercer seus direitos:</strong>
                <br />
                Envie um e-mail para <strong>privacidade@controllad oria.com</strong> com
                o assunto "Exercício de Direito LGPD". Responderemos em até 15
                dias úteis.
              </p>
            </div>
          </section>

          {/* Cookies */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              9. Cookies e Tecnologias Similares
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Utilizamos cookies essenciais para o funcionamento da plataforma:
            </p>
            <ul className="list-disc pl-6 mt-2 text-gray-700">
              <li>
                <strong>Cookies de autenticação:</strong> Para manter sua sessão
                ativa
              </li>
              <li>
                <strong>Cookies de preferência:</strong> Para lembrar suas
                configurações
              </li>
              <li>
                <strong>Cookies de segurança:</strong> Para proteção contra fraude
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Você pode configurar seu navegador para recusar cookies, mas isso
              pode afetar a funcionalidade da plataforma.
            </p>
          </section>

          {/* Children */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              10. Menores de Idade
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Nossos serviços são destinados a empresas e profissionais maiores de
              18 anos. Não coletamos intencionalmente dados de menores de idade. Se
              tomarmos conhecimento de que coletamos dados de um menor, excluiremos
              essas informações imediatamente.
            </p>
          </section>

          {/* Changes */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              11. Alterações nesta Política
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Podemos atualizar esta Política de Privacidade periodicamente. A data
              da "Última atualização" será sempre atualizada no topo desta página.
              Notificaremos você sobre mudanças significativas através de e-mail ou
              aviso na plataforma.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              12. Contato
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Para questões sobre esta política ou sobre o tratamento dos seus
              dados:
            </p>
            <div className="bg-gray-50 p-6 rounded-lg">
              <p className="text-gray-700">
                <strong>ControlladorIA</strong>
              </p>
              <p className="text-gray-700 mt-2">
                E-mail: privacidade@controllad oria.com
              </p>
              <p className="text-gray-700">DPO: dpo@controllad oria.com</p>
              <p className="text-gray-700 mt-4">
                <strong>Direitos LGPD:</strong> privacidade@controllad oria.com
              </p>
            </div>
          </section>

          {/* ANPD */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              13. Autoridade Nacional de Proteção de Dados (ANPD)
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Você também pode entrar em contato com a Autoridade Nacional de
              Proteção de Dados (ANPD) para esclarecer dúvidas ou apresentar
              reclamações sobre o tratamento de dados pessoais:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mt-4">
              <p className="text-gray-700">
                Website:{' '}
                <a
                  href="https://www.gov.br/anpd"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  www.gov.br/anpd
                </a>
              </p>
            </div>
          </section>
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <Link
            href="/terms"
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            Termos de Serviço →
          </Link>
          <Link
            href="/"
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Voltar para o início
          </Link>
        </div>
      </div>
    </div>
  );
}
