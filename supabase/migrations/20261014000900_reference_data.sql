-- Genvity :: 0900 — dados de referência da plataforma (não são dados de usuários)

-- Planos comerciais. Preços são hipóteses de referência e editáveis pelo admin.
insert into public.plans (slug, name, audience, description, price_min_cents, price_max_cents, custom_pricing, features, sort_order)
values
  ('paciente', 'Pacientes', 'patient',
    'Acesso gratuito às funcionalidades essenciais de acompanhamento.',
    0, 0, false,
    array['Receitas digitais em um só lugar', 'Lembretes de medicação', 'Calendário de saúde', 'Busca de médicos e farmácias', 'Histórico de saúde'],
    10),
  ('basico', 'Genvity Básico', 'doctor',
    'Gratuito para profissionais elegíveis após verificação do CRM.',
    0, 0, false,
    array['Cadastro e perfil profissional verificado', 'Agenda essencial', 'Gestão de pacientes vinculados', 'Prescrição digital (sujeita à integração de assinatura)'],
    20),
  ('pro', 'Genvity Pro', 'doctor',
    'Ferramentas de produtividade para consultórios.',
    7900, 14900, false,
    array['Agenda avançada com bloqueios e remarcações', 'Organização de pacientes e tarefas', 'Assistente de produtividade', 'Relatórios', 'Recursos administrativos adicionais'],
    30),
  ('clinicas', 'Genvity Clínicas', 'clinic',
    'Gestão de equipes e agenda compartilhada.',
    29900, null, false,
    array['Equipes e gestão de profissionais', 'Agenda compartilhada', 'Organização de atendimentos', 'Ferramentas administrativas'],
    40),
  ('farmacias', 'Genvity Farmácias', 'pharmacy',
    'Preço personalizado conforme porte e integrações.',
    null, null, true,
    array['Integração com sistemas de estoque', 'Conferência digital de receitas', 'Fluxo de solicitações e separação', 'Indicadores de atendimento'],
    50)
on conflict (slug) do nothing;

insert into public.platform_settings (key, value, description, is_public)
values
  ('prescription.max_validity_days', '{"simple": 365, "antimicrobial": 10, "special_control": 30}',
    'Validade máxima por tipo de receita, em dias. Requer revisão regulatória.', false),
  ('dispensation.require_legally_valid_signature', 'true',
    'Bloqueia o registro de dispensação de receitas sem assinatura digital com validade jurídica.', false),
  ('assistant.enabled', 'true',
    'Habilita o assistente de produtividade para médicos (requer chave de IA configurada no servidor).', false),
  ('public.announcement', 'null',
    'Aviso exibido no topo dos painéis (texto ou null).', true)
on conflict (key) do nothing;
