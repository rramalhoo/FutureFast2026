-- Genvity — seed de DESENVOLVIMENTO LOCAL.
-- Contém apenas um catálogo de referência de medicamentos (nomes genéricos e
-- apresentações comuns). Não há dados de pacientes. Em produção, o catálogo
-- deve ser sincronizado com base oficial (ANVISA/CMED) e revisado por
-- farmacêutico responsável.

insert into public.medications (name, active_ingredient, presentation, dosage_form, is_antimicrobial, requires_special_control, source)
values
  ('Losartana potássica', 'losartana potássica', '50 mg — caixa com 30 comprimidos', 'comprimido', false, false, 'dev-reference'),
  ('Enalapril', 'maleato de enalapril', '10 mg — caixa com 30 comprimidos', 'comprimido', false, false, 'dev-reference'),
  ('Anlodipino', 'besilato de anlodipino', '5 mg — caixa com 30 comprimidos', 'comprimido', false, false, 'dev-reference'),
  ('Hidroclorotiazida', 'hidroclorotiazida', '25 mg — caixa com 30 comprimidos', 'comprimido', false, false, 'dev-reference'),
  ('Metformina', 'cloridrato de metformina', '850 mg — caixa com 30 comprimidos', 'comprimido', false, false, 'dev-reference'),
  ('Sinvastatina', 'sinvastatina', '20 mg — caixa com 30 comprimidos', 'comprimido', false, false, 'dev-reference'),
  ('Atorvastatina', 'atorvastatina cálcica', '20 mg — caixa com 30 comprimidos', 'comprimido', false, false, 'dev-reference'),
  ('Levotiroxina sódica', 'levotiroxina sódica', '50 mcg — caixa com 30 comprimidos', 'comprimido', false, false, 'dev-reference'),
  ('Omeprazol', 'omeprazol', '20 mg — caixa com 28 cápsulas', 'cápsula', false, false, 'dev-reference'),
  ('Dipirona monoidratada', 'dipirona monoidratada', '500 mg — caixa com 10 comprimidos', 'comprimido', false, false, 'dev-reference'),
  ('Paracetamol', 'paracetamol', '750 mg — caixa com 20 comprimidos', 'comprimido', false, false, 'dev-reference'),
  ('Amoxicilina', 'amoxicilina', '500 mg — caixa com 21 cápsulas', 'cápsula', true, false, 'dev-reference'),
  ('Azitromicina', 'azitromicina', '500 mg — caixa com 3 comprimidos', 'comprimido', true, false, 'dev-reference'),
  ('Cefalexina', 'cefalexina', '500 mg — caixa com 8 cápsulas', 'cápsula', true, false, 'dev-reference'),
  ('Sertralina', 'cloridrato de sertralina', '50 mg — caixa com 30 comprimidos', 'comprimido', false, true, 'dev-reference'),
  ('Fluoxetina', 'cloridrato de fluoxetina', '20 mg — caixa com 30 cápsulas', 'cápsula', false, true, 'dev-reference'),
  ('Clonazepam', 'clonazepam', '2 mg — caixa com 30 comprimidos', 'comprimido', false, true, 'dev-reference'),
  ('Salbutamol', 'sulfato de salbutamol', '100 mcg/dose — aerossol com 200 doses', 'aerossol', false, false, 'dev-reference'),
  ('Ácido acetilsalicílico', 'ácido acetilsalicílico', '100 mg — caixa com 30 comprimidos', 'comprimido', false, false, 'dev-reference'),
  ('Ibuprofeno', 'ibuprofeno', '400 mg — caixa com 10 comprimidos', 'comprimido', false, false, 'dev-reference')
on conflict (name, presentation) do nothing;

-- Em ambiente local, permite testar o fluxo de dispensação com o provedor de
-- assinatura de desenvolvimento (sem validade jurídica). NUNCA em produção.
update public.platform_settings set value = 'false' where key = 'dispensation.require_legally_valid_signature';
