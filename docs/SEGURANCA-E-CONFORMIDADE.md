# Segurança, privacidade e conformidade

> Este documento descreve controles **técnicos**. Ele não é parecer jurídico. Antes de operar com dados reais, os itens marcados como **Revisão necessária** devem ser validados por assessoria jurídica, encarregado de dados (DPO) e especialistas regulatórios (prescrição eletrônica e vigilância sanitária).

## Controles implementados

| Controle | Implementação |
| --- | --- |
| Isolamento de dados | RLS em todas as 41 tabelas; 89 políticas; anon sem acesso a dados de usuários. Testado em `tests/integration/security.test.ts`. |
| Separação de papéis | Papel definido no cadastro (nunca `admin`), sem permissão de update; verificação profissional/cadastral só pela administração (trigger + grants por coluna). |
| Acesso clínico condicionado | Médico verificado + vínculo ativo; histórico e documentos só com consentimento específico, revogável a qualquer momento. |
| Funções privilegiadas | `SECURITY DEFINER` com `search_path` vazio; execução revogada de `public/anon`; finalização de emissão só com service_role; auxiliares de vínculo recusam sondagem por terceiros. |
| Imutabilidade | Prescrição emitida não pode ser alterada (nem pelo service_role); correções exigem cancelamento com motivo e nova emissão. |
| Integridade | Hash SHA-256 do conteúdo canônico, recalculado na emissão, na verificação e na dispensação. |
| QR Code | Contém apenas URL com código aleatório de 128 bits; consulta exige farmácia verificada, é limitada (20/min), auditada e notificada ao paciente. |
| Auditoria | `audit_logs` só recebe inserts via funções; o titular vê os acessos aos próprios dados; administração vê a trilha completa sem conteúdo clínico. |
| Armazenamento | Buckets privados; leitura condicionada a metadados e vínculo; URLs assinadas de 60 s geradas após checagem. |
| Enumeração de contas | Cadastro, recuperação e convite respondem de forma idêntica para e-mails existentes ou não. |
| Rate limiting | Tabela `rate_limits` (funciona em múltiplas instâncias): login, cadastro, recuperação, agendamento, convites, mensagens, solicitações, consultas de receita, exportação. Somado aos limites nativos do Supabase Auth. |
| Sessões | Cookies httpOnly do Supabase com rotação de refresh token; “encerrar outras sessões”; suspensão via Auth Admin. |
| Erros | Mensagens intencionais em português; erros inesperados viram mensagem genérica e log sem dados pessoais. |
| Cabeçalhos | CSP restritiva, HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`. |
| Open redirect | `safeInternalPath` em todos os parâmetros `next`. |
| Segredos | Service role e chaves de IA/assinatura apenas no servidor (`server-only`); validação de env com Zod; bloqueio do selo de desenvolvimento quando `APP_ENV=production`. |
| LGPD — titular | Exportação JSON completa (portabilidade), registro de acessos, solicitações de correção/exclusão/relatório com fluxo administrativo. |

## LGPD

- **Bases legais** (Revisão necessária): tutela da saúde (art. 11, II, f) para o atendimento; consentimento específico (art. 11, I) para o compartilhamento de histórico/documentos com outros médicos e para o envio de receita a farmácias — implementado como opções explícitas e revogáveis.
- **Minimização**: farmácia recebe só nome, data de nascimento, prescritor e itens; administração não lê dados clínicos individuais (relatórios agregados).
- **Retenção e exclusão** (Revisão necessária): prescrições, dispensações e registros de prontuário têm prazos legais próprios (CFM, vigilância sanitária). A exclusão é tratada como solicitação administrativa justamente para aplicar essas retenções; definir política formal de retenção e anonimização.
- **Operadores e transferência internacional** (Revisão necessária): Supabase (hospedagem), provedor de e-mail, OpenStreetMap (tiles), jsDelivr (modelo de OCR baixado pelo navegador) e Anthropic (assistente, opcional). Formalizar DPAs e avaliar transferência internacional; considerar self-hosting do modelo de OCR e de tiles.
- **Incidentes**: definir plano de resposta e comunicação à ANPD e aos titulares.
- **Política de privacidade e termos**: as páginas atuais são minutas marcadas como tal.

## Prescrição eletrônica (Revisão necessária)

- Validade jurídica exige assinatura digital com certificado **ICP-Brasil** (ou o que a norma vigente aceitar) e atendimento às regras do CFM, do ITI e do Ministério da Saúde para receituário eletrônico. O código atual **não** emite receitas juridicamente válidas: o provedor `dev-unsigned` é apenas para testes e todas as telas, a impressão e a verificação da farmácia exibem “sem validade jurídica”.
- Tipos de receita (simples, antimicrobiano, controle especial) e validades máximas são **parâmetros configuráveis** (`prescription.max_validity_days`); conferir com a RDC de antimicrobianos e a Portaria SVS/MS 344/98 e atualizações. Medicamentos sob controle especial podem exigir receituário específico/notificação de receita que não é coberto por receita digital simples — **validar antes de habilitar esse tipo em produção**.
- Verificar requisitos de conteúdo obrigatório (identificação completa do prescritor, endereço, data, quantidade por extenso, etc.).

## Dispensação farmacêutica (Revisão necessária)

- A plataforma **não** substitui a conferência farmacêutica nem a escrituração (ex.: SNGPC para controlados). O registro de “dispensação” é uma conclusão operacional.
- `dispensation.require_legally_valid_signature` vem **ligado** por padrão (bloqueia dispensação de receitas sem assinatura válida). O seed local o desliga apenas para testes.
- Dispensação parcial, retenção de receita e escrituração precisam de modelagem adicional conforme o tipo de medicamento.

## Telemedicina e mensagens

- O chat é explicitamente não emergencial e habilitado por escolha do médico. Teleconsulta (vídeo) não está implementada; quando estiver, seguir a Lei 14.510/2022 e resoluções do CFM.

## Inteligência artificial

- O assistente só processa o texto colado pelo médico, não acessa prontuários, recusa decisões clínicas (prompt de sistema + aviso na interface) e todo conteúdo é rotulado como rascunho a revisar. O leitor OCR nunca transforma a leitura em prescrição.

## Itens recomendados antes de produção

1. Pentest externo e revisão de código focada em segurança.
2. MFA obrigatório para médicos, farmácias e administradores (Supabase Auth MFA).
3. CAPTCHA em cadastro/login (Turnstile/hCaptcha, suportados pelo Supabase).
4. Monitoramento de logs de auditoria e alertas de acesso anômalo.
5. Revisão das políticas RLS a cada mudança de schema (os testes de integração devem acompanhar).
