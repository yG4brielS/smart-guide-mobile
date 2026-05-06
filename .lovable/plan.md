## Por que está dando erro hoje

Você está tentando criar usuário direto pelo painel do Cloud (Profiles → Add user). O backend tem um trigger (`handle_new_user`) que **exige** o campo `code` no metadata e que o código já exista em `allowed_codes`. O painel não envia esse metadata, então cai no erro "Código do aluno é obrigatório / Database error creating new user".

A solução correta é fazer o cadastro **dentro do app**, com uma tela própria que: (1) registra o código em `allowed_codes`, (2) cria o usuário no Auth com `email = codigo@bem-estar.app` e `senha = código`, passando o metadata correto. O trigger então cria profile + role + marca o código como usado, e o aluno já consegue logar usando só o código (no primeiro acesso senha = código, e o app já força a troca).

## O que vou construir

### 1. Novo papel `moderador`
- Adicionar `moderador` ao enum `app_role` (migration).
- Criar uma função `is_moderador(uid)` (security definer) e RLS para deixar moderador ler tudo que precisar.
- Para criar o **primeiro moderador**, vou rodar um update no `user_roles` promovendo a conta que você indicar (me diga o código depois — enquanto isso deixo um SQL pronto para você executar com 1 clique e te aviso na hora certa).

### 2. Server function `createAthleteUser`
Arquivo novo: `src/server/users.functions.ts`
- Protegida por middleware que valida que o caller tem role `moderador`.
- Recebe `{ code, full_name }` (validados com zod: code 1–50 alfanumérico, nome 1–120).
- Usa `supabaseAdmin` (service role) para:
  1. `INSERT INTO allowed_codes (code, full_name, role='atleta', used=false)` — falha amigável se já existe.
  2. `supabaseAdmin.auth.admin.createUser({ email, password: code, email_confirm: true, user_metadata: { code } })`.
- O trigger `handle_new_user` faz o resto (profile + user_roles + marca used).
- Se o `createUser` falhar, faz rollback do `allowed_codes`.

### 3. Nova tela `Adicionar atleta`
Arquivo novo: `src/routes/app.usuarios.tsx`
- Visível apenas para moderador (`AuthGate allow={["moderador"]}`).
- Form com 2 campos: **Código do aluno** e **Nome completo**.
- Botão "Cadastrar". Em sucesso: toast verde "Atleta cadastrado. Senha inicial: <código>" + limpa o form.
- Lista abaixo dos últimos códigos cadastrados (de `allowed_codes`, com badge "já acessou" / "pendente").

### 4. Item no menu
`src/components/AppShell.tsx`: adicionar "Adicionar atleta" no NAV, com ícone `UserPlus`, visível só para moderador.

### 5. Mensagem clara no Login
Ajustar o texto auxiliar do `login.tsx` para reforçar: "No primeiro acesso, digite seu código nos dois campos (usuário e senha). Depois o sistema pede para você criar uma senha pessoal."

## Arquivos

- `supabase/migrations/...` — adiciona `moderador` ao enum + função `is_moderador`.
- `src/server/users.functions.ts` (novo) — `createAthleteUser` server function.
- `src/routes/app.usuarios.tsx` (novo) — tela de cadastro.
- `src/components/AppShell.tsx` — item de menu.
- `src/routes/login.tsx` — texto de ajuda.
- `src/routeTree.gen.ts` — regenerado automaticamente.

## Pergunta

Para promover a conta de moderador inicial, qual código deve virar moderador? (Pode me passar o código agora ou depois — sem isso, ninguém consegue ver a tela "Adicionar atleta".)
