# Genvity

Plataforma de saúde que conecta **médicos, pacientes e farmácias** em um único ecossistema: receitas digitais verificáveis, acompanhamento de medicamentos, agenda, histórico de saúde, mensagens seguras e conferência farmacêutica — com privacidade e segurança desde o banco de dados.

> O Genvity não substitui atendimento médico e não é serviço de emergência. A conformidade legal **não** é garantida apenas pela implementação técnica — veja [docs/SEGURANCA-E-CONFORMIDADE.md](docs/SEGURANCA-E-CONFORMIDADE.md).

## Sumário

- [Stack](#stack)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Funcionalidades implementadas](#funcionalidades-implementadas)
- [Instalação local](#instalação-local)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Supabase](#supabase)
- [Testes](#testes)
- [Integrações pendentes](#integrações-pendentes)
- [Documentação adicional](#documentação-adicional)

## Stack

| Camada | Tecnologia |
| --- | --- |
| Frontend | Next.js 16 (App Router, Turbopack, `proxy.ts`), React 19, TypeScript estrito |
| UI | Tailwind CSS 4, componentes próprios sobre Radix UI (padrão shadcn), Lucide, Motion, Recharts, Sonner, cmdk, Leaflet |
| Backend | Supabase: PostgreSQL 17, Auth, Storage, Realtime, Row Level Security, funções `SECURITY DEFINER` |
| Validação | Zod 4 (cliente e servidor) |
| OCR | tesseract.js (executa no dispositivo; a imagem não sai do navegador) |
| IA (opcional) | Claude API (`@anthropic-ai/sdk`) — apenas assistente administrativo do médico |
| Testes | Vitest (unitário e integração contra Postgres real), Playwright + axe-core (E2E, acessibilidade, responsividade) |

Por que não um backend separado? As regras de negócio sensíveis (máquinas de estado de consultas, prescrições e dispensação, consentimentos, auditoria) vivem **no banco**, em funções transacionais e políticas RLS. Isso garante as mesmas proteções para qualquer cliente (web, app futuro, integrações) e elimina a classe de bugs “a API esqueceu de checar a permissão”. O Next.js usa Server Actions/Route Handlers apenas para orquestração, validação e integrações com segredos (assinatura, IA, Auth Admin).

## Estrutura do projeto

```
├── src/
│   ├── app/
│   │   ├── (public)/          landing, funcionalidades, para-*, planos, sobre, termos, privacidade
│   │   ├── (auth)/            login, cadastro, recuperar/redefinir senha, verifique-email
│   │   ├── (shared)/          conta, notificações, central de ajuda (todos os perfis)
│   │   ├── paciente/          painel, medicamentos, calendário, receitas, histórico, médicos, farmácias, mensagens, leitor (OCR)
│   │   ├── medico/            painel, agenda, pacientes, consultas, prescrições, mensagens, assistente, perfil
│   │   ├── farmacia/          painel, leitor QR, prescrições, estoque, solicitações, configurações
│   │   ├── admin/             dashboard, usuários, verificações, assinaturas, relatórios, auditoria, suporte/LGPD, configurações
│   │   ├── onboarding/        etapa por perfil (CRM, AFE/CNPJ…)
│   │   ├── verificar/[code]/  destino do QR Code (só farmácias verificadas veem dados)
│   │   ├── receita/[id]/imprimir/  versão para impressão/PDF
│   │   ├── auth/              confirmação de e-mail (token_hash/PKCE) e logout
│   │   └── api/               assistente (streaming) e exportação LGPD
│   ├── components/            ui/ (design system), layout/, marketing/, patient/, doctor/, pharmacy/, admin/, shared/
│   ├── lib/                   supabase (clientes), auth (DAL), validation (Zod, CPF/CNPJ), signature, ai, format, doses…
│   ├── server/                actions/ (Server Actions por domínio) e queries/
│   └── proxy.ts               renovação de sessão e bloqueio de áreas privadas
├── supabase/
│   ├── migrations/            10 migrations SQL (schema, RLS, RPCs, storage, dados de referência)
│   ├── templates/             e-mails de confirmação e recuperação em português
│   ├── seed.sql               catálogo de referência de medicamentos (somente desenvolvimento)
│   └── config.toml
├── tests/                     unit/, integration/ (RLS e fluxo no Postgres real), e2e/ (Playwright)
├── scripts/seed-dev.ts        contas fictícias de demonstração (somente local)
├── docs/                      arquitetura, segurança/conformidade, produção
└── legacy/                    protótipo anterior (Express + HTML), preservado para referência
```

## Funcionalidades implementadas

Tudo abaixo funciona com dados reais no banco (sem mocks) e é coberto por testes de integração e/ou E2E.

**Autenticação e contas** — cadastro com escolha de perfil (paciente, médico, farmácia; *admin nunca* por cadastro), confirmação de e-mail, login, recuperação/redefinição de senha, logout e “encerrar outras sessões”, proteção de rotas no `proxy.ts` + checagem de papel na camada de dados, onboarding por perfil, verificação de CRM e de farmácia (AFE/CNPJ/RT) com documentos em bucket privado, rate limit persistente (login, cadastro, recuperação), respostas neutras contra enumeração de contas.

**Paciente** — painel com saudação, próxima dose (tomei/pular), progresso do dia, consultas, receitas, avisos (convites, receitas vencendo, tratamentos terminando); medicamentos agrupados por tratamento, horários de lembrete editáveis, histórico de doses, registro pessoal; calendário dia/semana/mês com doses, consultas, retornos e lembretes; receitas com QR Code seguro, código copiável, requisitos de dispensação, aviso de validade jurídica e impressão; histórico (consultas, observações compartilhadas, receitas, medicamentos, alergias, documentos privados com links temporários); busca de médicos (nome, especialidade, cidade, modalidade, disponibilidade — ordenação neutra, sem destaque pago), perfil e agendamento com consentimento granular, remarcação/cancelamento, convites; busca de farmácias com mapa, distância, disponibilidade informada + data de atualização, favoritos e solicitações com consentimento explícito; mensagens em tempo real; leitor auxiliar de receitas (OCR local, palavras incertas destacadas, confirmação humana obrigatória, salvo apenas como registro pessoal).

**Médico** — painel com indicadores e gráfico da semana; agenda com horários de atendimento, bloqueios, solicitações (confirmar/recusar), remarcação, ausência, agendamento direto; pacientes vinculados, convite por e-mail, prontuário autorizado (alergias, consultas, prescrições, medicamentos e adesão quando compartilhados, documentos, observações), registro de acesso visível ao paciente; registro de consultas com resumo ao paciente, observações privadas/compartilhadas e retorno; prescrição em etapas (rascunho → revisão com hash SHA-256 → assinatura → emitida; cancelamento com motivo; expiração), alertas de alergia e de tipo de receita; mensagens; assistente (tarefas + IA administrativa opcional); perfil profissional.

**Farmácia** — painel com indicadores e alertas de estoque; leitor de QR pela câmera e por código; verificação automática (integridade, situação, validade, assinatura, prescritor verificado) sem substituir a conferência farmacêutica; registro de dispensação com farmacêutico responsável/CRF; quadro de solicitações (recebida → conferência → separação → pronta → concluída) com notificações ao paciente; estoque com status e data de atualização; configurações e equipe.

**Administração** — métricas reais (usuários por papel, verificações, MRR, assinaturas, receitas/consultas/dispensações em 30 dias, gráficos semanais), usuários (suspensão via Auth Admin), verificações com documentos e decisão auditada, planos editáveis e assinaturas com pagamentos manuais, relatórios agregados (sem dados clínicos individuais), trilha de auditoria filtrável, chamados e solicitações LGPD, configurações e status real das integrações.

**Transversal** — notificações in-app em tempo real, pesquisa global (Ctrl+K) respeitando RLS, modo claro/escuro, fonte ampliada, alto contraste, reduzir movimento, tour inicial, central de ajuda, manifesto PWA, layouts responsivos com navegação inferior no celular, skeletons, estados vazios, toasts, modais e confirmações acessíveis (sem `alert`/`confirm` nativos), CSP e cabeçalhos de segurança.

## Instalação local

Pré-requisitos: Node.js ≥ 20.9, Docker e o [Supabase CLI](https://supabase.com/docs/guides/local-development).

```bash
npm install
supabase start                      # sobe Postgres, Auth, Storage, Realtime e Mailpit locais
cp .env.example .env.local          # preencha com as chaves exibidas pelo `supabase start`
npm run db:reset                    # aplica migrations + seed de referência
npm run seed:dev                    # (opcional) contas fictícias de demonstração
npm run dev                         # http://localhost:3000
```

E-mails de confirmação/recuperação em desenvolvimento ficam no Mailpit: http://127.0.0.1:54324.

Contas de demonstração (`npm run seed:dev`, senha `Genvity2026!`): `paciente@`, `medica@`, `farmacia@` e `admin@demo.genvity.local`. São dados **fictícios**, criados apenas no Supabase local.

## Variáveis de ambiente

| Variável | Onde | Descrição |
| --- | --- | --- |
| `APP_ENV` | servidor | `development` \| `staging` \| `production`. Em `production`, recursos exclusivos de desenvolvimento são bloqueados (o build falha se `SIGNATURE_PROVIDER=dev-unsigned`). |
| `NEXT_PUBLIC_APP_URL` | público | URL da aplicação (QR Codes, redirecionamentos). |
| `NEXT_PUBLIC_SUPABASE_URL` | público | URL do projeto Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | público | Chave anon/publishable — pública por design; a proteção é feita por RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | **somente servidor** | Finaliza emissões assinadas, Auth Admin (suspensão, listagem de e-mails) e rate limit. Nunca use prefixo `NEXT_PUBLIC_`. |
| `SIGNATURE_PROVIDER` | servidor | `none` (emissão bloqueada) ou `dev-unsigned` (selo HMAC de desenvolvimento, **sem validade jurídica**). |
| `SIGNATURE_DEV_SECRET` | servidor | Segredo (≥ 32 caracteres) do selo de desenvolvimento. |
| `ANTHROPIC_API_KEY` | servidor (opcional) | Habilita o assistente de IA do médico. Sem ela, a interface sinaliza “não configurado”. |
| `ANTHROPIC_MODEL` | servidor (opcional) | Modelo do assistente (padrão `claude-opus-5-5`). |

## Supabase

1. Crie um projeto (região `sa-east-1` recomendada para dados de brasileiros).
2. Aplique as migrations: `supabase link --project-ref <ref>` e `supabase db push`. **Não** rode `seed.sql` em produção — o catálogo de medicamentos deve vir de base oficial (ANVISA/CMED).
3. Em *Authentication → URL Configuration*, defina **Site URL** = `NEXT_PUBLIC_APP_URL` e adicione `https://<domínio>/**` em Redirect URLs.
4. Em *Authentication → Email Templates*, use os templates de `supabase/templates/` (links `token_hash` para `/auth/confirm`). Configure SMTP próprio (o SMTP padrão do Supabase é limitado).
5. Em *Authentication → Providers → Email*: confirmação de e-mail **ligada**, senha mínima 8 com letras e números, “secure password change” ligado. Considere habilitar CAPTCHA e MFA.
6. Verifique se `pg_cron` está habilitado (a migration agenda `expire_prescriptions()` diariamente); caso contrário, agende externamente.
7. Crie o primeiro administrador: cadastre-se normalmente e promova via SQL Editor: `update public.profiles set role = 'admin', onboarding_completed = true where id = '<uuid>';`
8. Gere os tipos após mudanças no schema: `npm run db:types`.

Detalhes do modelo de dados e das funções: [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Testes

| Comando | O que cobre |
| --- | --- |
| `npm run lint` / `npm run typecheck` | ESLint (regras do React Compiler) e TypeScript estrito |
| `npm test` | Unitários: validação (CPF/CNPJ, cadastro, prescrição, dispensação), agenda de doses e fuso horário, utilitários (open redirect, datas) |
| `npm run test:integration` | Contra o Supabase local: papéis e escalonamento de privilégio, isolamento entre pacientes, acesso médico por vínculo/consentimento/verificação, convite sem enumeração, imutabilidade de prescrições, funções privilegiadas inacessíveis, rate limit, storage privado, chat, dupla marcação e **o fluxo completo médico → paciente → farmácia** (com hash adulterado e autor errado rejeitados) |
| `npm run build && npm run test:e2e` | Playwright: páginas públicas e navegação, acessibilidade (axe, WCAG 2.1 AA) em páginas públicas e nos painéis de cada perfil, responsividade (sem rolagem horizontal; projeto “mobile”), cadastro com confirmação real de e-mail via Mailpit, onboarding, preferências, logout, pesquisa global e o **fluxo completo pela interface** |
| `npm run check` | lint + typecheck + unit + build |

Resultado da última execução: 20 unitários, 24 de integração e 17 E2E aprovados; lint, typecheck e build de produção sem erros.

## Integrações pendentes

Estas funcionalidades estão **preparadas e sinalizadas na interface**, mas dependem de fornecedores/configuração externa:

| Integração | Situação atual | O que falta |
| --- | --- | --- |
| Assinatura digital ICP-Brasil | Interface `SignatureProvider` + hash SHA-256 do conteúdo; emissão finalizada no servidor. Provedor `dev-unsigned` apenas para testes, rotulado “sem validade jurídica” em todas as telas e na impressão. | Contratar PSC/certificado em nuvem, implementar o provedor, validar formato (CMS/PAdES) e requisitos do CFM/ITI. |
| Validação externa de CRM/AFE | Verificação manual pela administração, com documentos. | Integração com bases dos conselhos/ANVISA quando disponível. |
| Gateway de pagamento | Planos, assinaturas e pagamentos manuais; colunas `provider`/`provider_reference`. Nenhuma cobrança real. | Integrar gateway (ex.: cartão/Pix), webhooks e emissão fiscal. |
| Push e e-mail transacional | Notificações in-app em tempo real; e-mails de Auth via SMTP do Supabase. | Web Push (VAPID) / FCM e provedor de e-mail transacional. |
| Estoque integrado (ERP) | Cadastro manual com data de atualização e coluna `source`. | Conectores por sistema de gestão. |
| IA do assistente | Funciona com `ANTHROPIC_API_KEY`; restrito a tarefas administrativas. | Avaliação de DPA/transferência internacional antes de produção. |
| Mapas | Tiles do OpenStreetMap (uso público limitado). | Provedor de tiles com SLA/geocodificação em produção. |
| Teleconsulta | Modalidade registrada na agenda. | Plataforma de vídeo. |
| Gestão de clínicas/equipes de farmácia | Tabelas e políticas criadas (`clinics`, `clinic_members`, `pharmacy_members`). | Telas de convite e gestão de membros. |

## Documentação adicional

- [docs/ARQUITETURA.md](docs/ARQUITETURA.md) — modelo de dados, migrations, funções, fluxos e decisões técnicas.
- [docs/SEGURANCA-E-CONFORMIDADE.md](docs/SEGURANCA-E-CONFORMIDADE.md) — controles implementados, LGPD, prescrição eletrônica, dispensação e o que exige revisão jurídica/regulatória.
- [docs/PRODUCAO.md](docs/PRODUCAO.md) — checklist de publicação, backup/recuperação e operação.
