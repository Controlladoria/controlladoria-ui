'use client';

/**
 * Terms of Service Page
 * Legal terms for using ControlladorIA platform
 */

import Link from 'next/link';

export default function TermsOfServicePage() {
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
            Termos de Serviço
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
              1. Aceitação dos Termos
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Bem-vindo ao ControlladorIA! Estes Termos de Serviço ("Termos") regem seu
              acesso e uso da plataforma ControlladorIA, incluindo nosso website,
              aplicações e serviços relacionados (coletivamente, o "Serviço").
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              Ao criar uma conta ou utilizar nosso Serviço, você concorda em estar
              vinculado a estes Termos. Se você não concorda com estes Termos, não
              utilize o Serviço.
            </p>
          </section>

          {/* Service Description */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              2. Descrição do Serviço
            </h2>
            <p className="text-gray-700 leading-relaxed">
              O ControlladorIA é uma plataforma SaaS (Software as a Service) que oferece:
            </p>
            <ul className="list-disc pl-6 mt-2 text-gray-700 space-y-1">
              <li>Processamento automático de documentos financeiros com IA</li>
              <li>Extração de dados estruturados de PDFs, Excel, imagens e XML</li>
              <li>Geração de relatórios financeiros (DRE, Fluxo de Caixa, Balanço)</li>
              <li>Armazenamento seguro de documentos na nuvem</li>
              <li>Ferramentas de análise e visualização de dados</li>
            </ul>
          </section>

          {/* Account Registration */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              3. Cadastro de Conta
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              3.1. Requisitos
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Para utilizar o Serviço, você deve:
            </p>
            <ul className="list-disc pl-6 mt-2 text-gray-700">
              <li>Ser maior de 18 anos</li>
              <li>Possuir capacidade legal para celebrar contratos</li>
              <li>Representar uma empresa legalmente constituída (se aplicável)</li>
              <li>Fornecer informações verdadeiras e atualizadas</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              3.2. Segurança da Conta
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Você é responsável por:
            </p>
            <ul className="list-disc pl-6 mt-2 text-gray-700">
              <li>Manter a confidencialidade de sua senha</li>
              <li>Todas as atividades realizadas com sua conta</li>
              <li>Notificar imediatamente sobre acesso não autorizado</li>
            </ul>

            <div className="bg-red-50 border-l-4 border-red-400 p-4 mt-4">
              <p className="text-gray-800">
                <strong>⚠️ Importante:</strong> Não compartilhe suas credenciais
                com terceiros. A ControlladorIA não é responsável por perdas resultantes
                de acesso não autorizado à sua conta.
              </p>
            </div>
          </section>

          {/* Subscription and Payment */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              4. Assinatura e Pagamento
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              4.1. Período de Teste Gratuito
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Oferecemos um período de teste gratuito de 15 dias para novos
              usuários. Durante este período:
            </p>
            <ul className="list-disc pl-6 mt-2 text-gray-700">
              <li>Você tem acesso total a todas as funcionalidades</li>
              <li>Não é necessário fornecer cartão de crédito inicialmente</li>
              <li>Ao final do período, você deve assinar um plano pago</li>
              <li>Você pode cancelar a qualquer momento sem custos</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              4.2. Planos Pagos
            </h3>
            <div className="bg-blue-50 p-4 rounded-lg mt-4">
              <p className="text-gray-700">
                <strong>Plano Mensal:</strong> R$ 99,00/mês
              </p>
              <p className="text-gray-700 mt-2">
                Cobrança recorrente mensal processada através do Stripe.
              </p>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              4.3. Renovação e Cancelamento
            </h3>
            <ul className="list-disc pl-6 mt-2 text-gray-700">
              <li>
                <strong>Renovação Automática:</strong> Sua assinatura renova
                automaticamente até que você cancele
              </li>
              <li>
                <strong>Cancelamento:</strong> Pode ser feito a qualquer momento
                através do Portal do Cliente
              </li>
              <li>
                <strong>Política de Cancelamento:</strong> Você mantém acesso até
                o final do período pago
              </li>
              <li>
                <strong>Sem Reembolso:</strong> Não oferecemos reembolsos por
                períodos parcialmente utilizados
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              4.4. Alterações de Preço
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Reservamo-nos o direito de alterar nossos preços a qualquer momento.
              Você será notificado com 30 dias de antecedência sobre qualquer
              alteração de preço que afete sua assinatura.
            </p>
          </section>

          {/* Account Sharing - MOST IMPORTANT */}
          <section className="mb-8">
            <div className="bg-red-50 border-2 border-red-400 rounded-lg p-6">
              <h2 className="text-2xl font-semibold text-red-900 mb-4">
                5. 🚨 PROIBIÇÃO DE COMPARTILHAMENTO DE CONTA
              </h2>
              <p className="text-gray-800 leading-relaxed mb-4">
                <strong className="text-red-700">ATENÇÃO ESPECIAL:</strong> O compartilhamento de conta é estritamente proibido e
                resultará em encerramento imediato da sua assinatura sem reembolso.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">
                5.1. Regras de Uso de Conta
              </h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  <strong>Uso Pessoal Apenas:</strong> Cada conta é pessoal e intransferível. Suas credenciais
                  de login não devem ser compartilhadas com ninguém, mesmo dentro da mesma empresa.
                </li>
                <li>
                  <strong>Limite de Dispositivos:</strong> Você pode acessar sua conta em até 2 dispositivos
                  simultâneos: UM dispositivo móvel E UM computador (desktop/laptop/tablet).
                </li>
                <li>
                  <strong>Logout Automático:</strong> Se você tentar fazer login em um terceiro dispositivo,
                  o dispositivo mais antigo será automaticamente desconectado.
                </li>
                <li>
                  <strong>Múltiplos Usuários:</strong> Se você precisa dar acesso a outras pessoas da sua
                  empresa, deve adicionar usuários adicionais através da funcionalidade "Gestão de Equipe"
                  na plataforma.
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">
                5.2. Monitoramento e Detecção
              </h3>
              <p className="text-gray-700 leading-relaxed mb-3">
                Monitoramos ativamente o uso de contas para detectar compartilhamento não autorizado:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Logins simultâneos de localizações geograficamente distantes</li>
                <li>Múltiplos endereços IP em curtos períodos de tempo</li>
                <li>Padrões de uso inconsistentes com um único usuário</li>
                <li>Dispositivos e navegadores em excesso</li>
              </ul>

              <h3 className="text-xl font-semibold text-red-900 mb-3 mt-6">
                5.3. Consequências de Violação
              </h3>
              <div className="bg-red-100 p-4 rounded-lg">
                <p className="text-gray-800 mb-2">
                  <strong>Se detectarmos compartilhamento de conta, tomaremos as seguintes ações:</strong>
                </p>
                <ul className="list-decimal pl-6 text-gray-700 space-y-1">
                  <li><strong>Primeira Ocorrência:</strong> Aviso por email e desconexão de todas as sessões</li>
                  <li><strong>Segunda Ocorrência:</strong> Suspensão da conta por 7 dias</li>
                  <li><strong>Terceira Ocorrência:</strong> Encerramento permanente da conta SEM REEMBOLSO</li>
                  <li><strong>Violações Graves:</strong> Encerramento imediato + possível ação legal para recuperar danos</li>
                </ul>
              </div>

              <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400">
                <p className="text-gray-800">
                  <strong>⚠️ Por que esta política existe:</strong> O compartilhamento de conta prejudica
                  nossa capacidade de fornecer um serviço de qualidade a todos os usuários e constitui
                  fraude contra nossa plataforma. Custos operacionais aumentam significativamente quando
                  múltiplas pessoas usam uma única conta.
                </p>
              </div>
            </div>
          </section>

          {/* Acceptable Use */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              6. Uso Aceitável
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              6.1. Uso Permitido
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Você pode utilizar o Serviço para:
            </p>
            <ul className="list-disc pl-6 mt-2 text-gray-700">
              <li>Processar documentos financeiros da sua empresa</li>
              <li>Gerar relatórios e análises para uso interno</li>
              <li>Armazenar documentos de forma segura</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              6.2. Uso Proibido
            </h3>
            <p className="text-gray-700 leading-relaxed">Você NÃO pode:</p>
            <div className="bg-red-50 p-4 rounded-lg mt-2">
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Compartilhar sua conta ou credenciais com outras pessoas (VEJA SEÇÃO 5)</li>
                <li>Violar leis ou regulamentos aplicáveis</li>
                <li>
                  Fazer upload de documentos que não sejam de sua propriedade ou
                  sem autorização
                </li>
                <li>Tentar acessar dados de outros usuários</li>
                <li>
                  Fazer engenharia reversa, descompilar ou desmontar o Serviço
                </li>
                <li>
                  Utilizar o Serviço para transmitir malware ou código malicioso
                </li>
                <li>Sobrecarregar ou interferir com a infraestrutura</li>
                <li>Revender ou redistribuir o Serviço sem autorização</li>
                <li>
                  Remover ou modificar avisos de propriedade intelectual
                </li>
                <li>
                  Utilizar automação (bots, scrapers) sem autorização prévia
                </li>
              </ul>
            </div>
          </section>

          {/* Intellectual Property */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              6. Propriedade Intelectual
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              6.1. Propriedade da ControlladorIA
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Todos os direitos de propriedade intelectual do Serviço, incluindo
              mas não limitado a software, código-fonte, design, interface, logos,
              marcas e conteúdo, pertencem à ControlladorIA e são protegidos por leis de
              direitos autorais e outras leis de propriedade intelectual.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              6.2. Seus Dados
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Você mantém todos os direitos sobre os documentos e dados que faz
              upload no Serviço. Ao usar o Serviço, você nos concede uma licença
              limitada para:
            </p>
            <ul className="list-disc pl-6 mt-2 text-gray-700">
              <li>Processar seus documentos para fornecer o Serviço</li>
              <li>Armazenar dados em nossos servidores</li>
              <li>Fazer backup de seus dados</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Esta licença termina quando você exclui seus dados ou encerra sua
              conta.
            </p>
          </section>

          {/* Data and Privacy */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              7. Privacidade e Proteção de Dados
            </h2>
            <p className="text-gray-700 leading-relaxed">
              O tratamento dos seus dados pessoais é regido pela nossa{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline">
                Política de Privacidade
              </Link>
              , que está em conformidade com a LGPD (Lei nº 13.709/2018).
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              Comprometemo-nos a:
            </p>
            <ul className="list-disc pl-6 mt-2 text-gray-700">
              <li>Proteger seus dados com medidas de segurança adequadas</li>
              <li>Não vender seus dados para terceiros</li>
              <li>
                Processar dados apenas conforme necessário para prestar o Serviço
              </li>
              <li>Respeitar seus direitos sob a LGPD</li>
            </ul>
          </section>

          {/* Service Availability */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              8. Disponibilidade do Serviço
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              8.1. Uptime
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Buscamos manter o Serviço disponível 99,5% do tempo, mas não
              garantimos disponibilidade ininterrupta. O Serviço pode estar
              indisponível devido a:
            </p>
            <ul className="list-disc pl-6 mt-2 text-gray-700">
              <li>Manutenção programada (com aviso prévio)</li>
              <li>Manutenção emergencial</li>
              <li>Problemas de infraestrutura</li>
              <li>Eventos fora do nosso controle (força maior)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              8.2. Modificações
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Reservamo-nos o direito de:
            </p>
            <ul className="list-disc pl-6 mt-2 text-gray-700">
              <li>Modificar ou descontinuar funcionalidades</li>
              <li>Atualizar a plataforma</li>
              <li>Alterar requisitos técnicos</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Faremos o possível para notificá-lo sobre mudanças significativas com
              antecedência razoável.
            </p>
          </section>

          {/* Warranties Disclaimer */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              9. Isenções de Garantia
            </h2>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="text-gray-800">
                <strong>⚠️ IMPORTANTE:</strong>
              </p>
              <p className="text-gray-700 mt-2">
                O SERVIÇO É FORNECIDO "COMO ESTÁ" E "CONFORME DISPONÍVEL", SEM
                GARANTIAS DE QUALQUER TIPO, EXPRESSAS OU IMPLÍCITAS, INCLUINDO MAS
                NÃO LIMITADO A:
              </p>
              <ul className="list-disc pl-6 mt-2 text-gray-700">
                <li>Garantias de comercialização</li>
                <li>Adequação a uma finalidade específica</li>
                <li>Precisão absoluta na extração de dados</li>
                <li>Ausência de erros ou interrupções</li>
              </ul>
            </div>
            <p className="text-gray-700 leading-relaxed mt-4">
              Embora nos esforcemos para fornecer extração de dados precisa através
              de IA, você deve sempre revisar e validar os dados extraídos. A
              ControlladorIA não se responsabiliza por decisões tomadas com base em
              dados extraídos automaticamente.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              10. Limitação de Responsabilidade
            </h2>
            <p className="text-gray-700 leading-relaxed">
              NA EXTENSÃO MÁXIMA PERMITIDA POR LEI, A DRESYSTEM E SEUS DIRETORES,
              FUNCIONÁRIOS E REPRESENTANTES NÃO SERÃO RESPONSÁVEIS POR:
            </p>
            <ul className="list-disc pl-6 mt-2 text-gray-700 space-y-1">
              <li>Danos indiretos, incidentais, especiais ou consequenciais</li>
              <li>Perda de lucros, receita ou dados</li>
              <li>Interrupção de negócios</li>
              <li>Erros ou imprecisões na extração de dados</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              NOSSA RESPONSABILIDADE TOTAL LIMITADA AO VALOR PAGO POR VOCÊ NOS
              ÚLTIMOS 12 MESES, OU R$ 100,00, O QUE FOR MAIOR.
            </p>
          </section>

          {/* Indemnification */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              11. Indenização
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Você concorda em indenizar, defender e isentar a ControlladorIA de
              quaisquer reivindicações, danos, obrigações, perdas, responsabilidades,
              custos ou dívidas resultantes de:
            </p>
            <ul className="list-disc pl-6 mt-2 text-gray-700">
              <li>Seu uso do Serviço</li>
              <li>Violação destes Termos</li>
              <li>Violação de direitos de terceiros</li>
              <li>Documentos que você faz upload</li>
            </ul>
          </section>

          {/* Termination */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              12. Rescisão
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              12.1. Por Você
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Você pode cancelar sua assinatura a qualquer momento através do
              Portal do Cliente. O acesso permanece até o final do período pago.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              12.2. Por Nós
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Podemos suspender ou encerrar sua conta imediatamente se:
            </p>
            <ul className="list-disc pl-6 mt-2 text-gray-700">
              <li>Você violar estes Termos</li>
              <li>Houver atividade fraudulenta ou ilegal</li>
              <li>Houver falta de pagamento</li>
              <li>For necessário para proteção da plataforma ou outros usuários</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              12.3. Efeitos da Rescisão
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Após o encerramento da conta:
            </p>
            <ul className="list-disc pl-6 mt-2 text-gray-700">
              <li>Seu acesso ao Serviço será imediatamente revogado</li>
              <li>
                Seus dados serão retidos por 30 dias para possível recuperação
              </li>
              <li>Após 30 dias, seus dados serão permanentemente excluídos</li>
              <li>Dados fiscais serão retidos conforme exigido por lei (5 anos)</li>
            </ul>
          </section>

          {/* Governing Law */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              13. Lei Aplicável e Jurisdição
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Estes Termos são regidos pelas leis da República Federativa do
              Brasil. Qualquer disputa relacionada a estes Termos será submetida à
              jurisdição exclusiva dos tribunais da comarca de [Sua Cidade], Brasil.
            </p>
          </section>

          {/* General Provisions */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              14. Disposições Gerais
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              14.1. Acordo Integral
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Estes Termos, juntamente com nossa Política de Privacidade,
              constituem o acordo integral entre você e a ControlladorIA.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              14.2. Modificações
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Podemos modificar estes Termos a qualquer momento. Notificaremos você
              sobre mudanças materiais com 30 dias de antecedência. O uso
              continuado do Serviço após mudanças constitui aceitação dos novos
              Termos.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              14.3. Severabilidade
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Se qualquer disposição destes Termos for considerada inválida ou
              inexequível, as demais disposições permanecerão em pleno vigor e
              efeito.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              14.4. Renúncia
            </h3>
            <p className="text-gray-700 leading-relaxed">
              A falha em exercer ou fazer cumprir qualquer direito ou disposição
              destes Termos não constitui renúncia a tal direito ou disposição.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              14.5. Cessão
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Você não pode ceder ou transferir estes Termos sem nosso consentimento
              prévio por escrito. Podemos ceder livremente estes Termos.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              15. Contato
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Para questões sobre estes Termos de Serviço:
            </p>
            <div className="bg-gray-50 p-6 rounded-lg">
              <p className="text-gray-700">
                <strong>ControlladorIA</strong>
              </p>
              <p className="text-gray-700 mt-2">
                E-mail: suporte@controllad oria.com
              </p>
              <p className="text-gray-700">Legal: legal@controllad oria.com</p>
            </div>
          </section>
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <Link
            href="/privacy"
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            Política de Privacidade →
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
