# Publicação em produção

## Checklist

**Infraestrutura**
- [ ] Projeto Supabase dedicado (plano pago, região `sa-east-1`), com **PITR** (point-in-time recovery) habilitado.
- [ ] `supabase db push` com as migrations; **não** aplicar `supabase/seed.sql`.
- [ ] Catálogo `medications` carregado a partir de fonte oficial e revisado por farmacêutico.
- [ ] `pg_cron` ativo (expiração diária de receitas) ou agendamento externo de `select public.expire_prescriptions()`.
- [ ] Hospedagem Next.js (ex.: Vercel/Node 20+) com `npm run build` e `npm start`.
- [ ] Domínio com HTTPS; `NEXT_PUBLIC_APP_URL` e Site URL/Redirect URLs do Supabase apontando para ele.

**Variáveis**
- [ ] `APP_ENV=production`.
- [ ] `SIGNATURE_PROVIDER` diferente de `dev-unsigned` (o build falha se estiver).
- [ ] `SUPABASE_SERVICE_ROLE_KEY` apenas no ambiente do servidor.
- [ ] `ANTHROPIC_API_KEY` somente após DPA/avaliação de transferência internacional.

**Auth**
- [ ] SMTP próprio com SPF/DKIM/DMARC; templates de `supabase/templates/`.
- [ ] Confirmação de e-mail, senha forte, *secure password change*, CAPTCHA e MFA para perfis profissionais.
- [ ] Primeiro administrador promovido via SQL; demais papéis nunca alterados manualmente sem registro.

**Regulatório e jurídico**
- [ ] Itens “Revisão necessária” de [SEGURANCA-E-CONFORMIDADE.md](SEGURANCA-E-CONFORMIDADE.md) resolvidos.
- [ ] Termos de uso e política de privacidade finais publicados; DPO nomeado.
- [ ] Integração de assinatura ICP-Brasil homologada antes de permitir emissão.

**Qualidade**
- [ ] `npm run check` verde; `npm run test:integration` e `npm run test:e2e` contra um ambiente de staging com as mesmas migrations.
- [ ] Pentest e revisão de acessibilidade com usuários reais (incluindo idosos e leitores de tela).

## Backup e recuperação

- **PITR** do Supabase cobre recuperação a um ponto no tempo do banco. Testar restauração trimestralmente em projeto separado.
- **Storage**: os buckets `medical-documents` e `verification-documents` não entram no PITR do banco — configurar replicação/backup do bucket (ex.: cópia periódica para storage externo criptografado).
- **Migrations versionadas** permitem recriar o schema do zero (`supabase db reset` em staging).
- Registrar RPO/RTO esperados e o procedimento de comunicação em caso de incidente.

## Operação

- Painel **Admin → Configurações** mostra o estado real das integrações.
- **Admin → Verificações**: conferir CRM no portal do conselho regional e AFE/CNPJ antes de aprovar.
- **Admin → Suporte e LGPD**: responder solicitações de titulares no prazo legal.
- **Admin → Auditoria**: revisar periodicamente consultas de receitas sem resultado (`prescription.lookup_not_found`) e ações administrativas.
- Limpeza: a tabela `rate_limits` remove janelas antigas automaticamente; avaliar arquivamento de `audit_logs` e `notifications` antigas conforme a política de retenção.
