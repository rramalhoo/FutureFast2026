# Genvity

## Estrutura
- `public/`: interface que vai para o navegador.
- `public/css/`: estilos.
- `public/js/`: scripts do front-end.
- `public/assets/`: imagens e recursos.
- `server/`: backend, autenticação e integração Gemini.
- `data/`: dados locais.
- `tests/`: testes.
- `.env`: segredos locais.

## Executar
```bash
npm install
cp .env.example .env
npm start
```
Abra `http://localhost:3000`.
