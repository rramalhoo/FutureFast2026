# Arquitetura do Genvity

## Visão geral

```
Navegador ──► Next.js 16 (proxy.ts → layouts com DAL → Server Components / Server Actions / Route Handlers)
                 │  sessão via cookies (@supabase/ssr)              │ service_role (somente servidor)
                 ▼                                                  ▼
          Supabase PostgREST + Auth + Storage + Realtime  ◄── RLS + funções SECURITY DEFINER
                 │
                 ▼
          PostgreSQL 17 (41 tabelas, 89 políticas, 73 funções, triggers de auditoria/notificação)
```

- **`proxy.ts`** renova a sessão a cada requisição e redireciona visitantes fora das áreas privadas.
- **Camada de acesso (`src/lib/auth.ts`)**: `getSession()` valida o token no Auth (`getUser`) e carrega o perfil; `requireRole()` aplica papel e onboarding em cada layout.
- **Server Actions (`src/server/actions/*`)** validam a entrada com Zod e chamam o banco com o cliente do usuário (sujeito a RLS). Erros do banco passam por `safeDbError`, que só repassa mensagens intencionais e nunca detalhes internos.
- **service_role** é usado apenas em: finalizar emissão assinada (`finalize_prescription_issue`), Auth Admin (suspender usuário, listar e-mails no admin) e rate limit. O módulo `src/lib/supabase/admin.ts` importa `server-only`.

## Modelo de dados

### Identidade e cadastro
| Tabela | Conteúdo |
| --- | --- |
| `profiles` | id (= auth.users), papel, nome, preferências. Papel nunca muda por update do usuário (coluna sem grant + trigger). |
| `patients` | dados pessoais (nascimento, CPF opcional, telefone, cidade, contato de emergência) — leitura só pelo titular e médicos com vínculo ativo. |
| `doctors` | CRM/UF, especialidade, RQE, modalidades, aceitação de novos pacientes, chat, status de verificação (alterável só pela administração). |
| `pharmacies`, `pharmacy_members` | CNPJ, AFE, responsável técnico/CRF, endereço e coordenadas, verificação; equipe com papéis. |
| `clinics`, `clinic_members` | base para o plano Clínicas. |
| `verification_requests` | pedidos de verificação com caminhos dos documentos (bucket privado) e decisão. |

### Cuidado
| Tabela | Conteúdo |
| --- | --- |
| `care_relationships` | vínculo médico↔paciente (`pending`/`active`/`revoked`) com consentimentos `share_history` e `share_documents`. |
| `care_invitations` | convites por e-mail (o médico nunca descobre se o e-mail existe). |
| `doctor_availability`, `schedule_blocks`, `appointments` | agenda; *exclusion constraint* impede dupla marcação. |
| `consultations`, `clinical_notes` | registro do atendimento; notas privadas ou compartilhadas com o paciente. |
| `medications` | catálogo de referência. |
| `prescriptions`, `prescription_items` | prescrição com estados, hash do conteúdo, código de verificação, dados de assinatura. |
| `patient_medications`, `dose_logs`, `reminders` | acompanhamento; registro de doses não altera a prescrição. |
| `documents` | metadados de arquivos no bucket `medical-documents`. |
| `conversations`, `messages`, `doctor_tasks` | chat seguro e tarefas do médico. |

### Farmácia, negócio e governança
`pharmacy_inventory`, `pharmacy_requests`, `pharmacy_request_events`, `prescription_pharmacy_access`, `dispensations`, `plans`, `subscriptions`, `payments`, `support_tickets`, `notifications`, `audit_logs`, `platform_settings`, `data_subject_requests`, `favorites`, `rate_limits`.

## Migrations

| Arquivo | Conteúdo |
| --- | --- |
| `0100_extensions_and_types` | pgcrypto, btree_gist, citext; enums de domínio |
| `0200_core_tables` | perfis, pacientes, médicos, farmácias, clínicas, verificações |
| `0300_clinical_tables` | vínculos, agenda, consultas, catálogo, prescrições, acompanhamento, documentos, mensagens, tarefas |
| `0400_operations_tables` | estoque, solicitações, dispensação, planos/assinaturas/pagamentos, suporte, notificações, auditoria, configurações, LGPD, favoritos, rate limit |
| `0500_helpers_and_triggers` | funções de autorização, auditoria, notificação, rate limit; criação de perfil no cadastro; proteção de colunas; **imutabilidade de prescrições**; triggers de auditoria e notificações |
| `0600_rls_policies` | RLS em todas as tabelas; grants por coluna; anon só lê planos e configurações públicas |
| `0700_rpc_functions` | onboarding, verificação, agenda, convites/consentimentos, prescrição (submeter, voltar a rascunho, **finalizar — só service_role**, cancelar, expirar), farmácia (verificar, dispensar, solicitações, busca), mensagens, planos, administração, exportação LGPD; permissões de execução |
| `0800_storage_realtime_jobs` | buckets privados e políticas de Storage; publicação Realtime; agendamento `pg_cron` |
| `0900_reference_data` | planos comerciais e parâmetros da plataforma |
| `1000_admin_reports` | relatórios agregados para a administração |

## Fluxo principal

1. **Agendamento** — `request_appointment` valida o horário contra `get_available_slots` (fuso de Brasília), cria a consulta `requested` e um vínculo `pending` com os consentimentos escolhidos.
2. **Confirmação** — `doctor_update_appointment('confirm')` ativa o vínculo. Só então o médico lê dados do paciente.
3. **Consulta** — insert em `consultations`/`clinical_notes` (RLS exige médico verificado + vínculo ativo).
4. **Prescrição** — rascunho editável → `submit_prescription` calcula o SHA-256 canônico do conteúdo e congela-o (`pending_signature`).
5. **Assinatura e emissão** — a Server Action lê o hash do banco, o `SignatureProvider` assina e `finalize_prescription_issue` (executável apenas com service_role) confere o hash recalculado, gera o código de verificação aleatório (128 bits), cria os medicamentos do paciente com horários sugeridos, audita e notifica.
6. **Paciente** — vê a receita, o QR (que aponta para `/verificar/<código>`, sem dados médicos) e os medicamentos.
7. **Farmácia** — `pharmacy_verify_prescription` exige farmácia verificada, aplica rate limit (20/min), audita, notifica o paciente e retorna apenas o necessário à dispensação, com checagem de integridade.
8. **Dispensação** — `pharmacy_dispense` revalida situação, validade, integridade e (por configuração) assinatura juridicamente válida; registra farmacêutico/CRF; marca a receita como dispensada.

Depois de sair de rascunho, nenhuma alteração de conteúdo é possível — nem por service_role — exceto pelas transições controladas pelas funções acima (trigger `guard_prescription_update` + `genvity.trusted` local à transação).

## Decisões técnicas

- **Cache Components desativado**: praticamente todas as rotas dependem da sessão; o ganho de pré-renderização não compensa a complexidade e o risco de cachear dados pessoais.
- **Fuso horário fixo America/Sao_Paulo** para agenda e doses (sem horário de verão desde 2019). Para atendimento em outros fusos, parametrizar por usuário.
- **Nomes via `profiles`** em listas: joins por `patients` só funcionam com vínculo ativo; usar `profiles` mantém nomes em solicitações pendentes e históricos sem expor dados pessoais.
- **Formulários com `ActionForm`**: envio via transition para não perder dados digitados em erros de validação (o reset automático do React 19 é evitado).
- **OCR no cliente**: a foto da receita não sai do dispositivo; o resultado só é salvo após confirmação, como registro pessoal.
