# GUIA DE DEPLOY - Rastreador Pessoal

## O que você precisa (gratuito)

| Serviço | Para | URL |
|---------|------|-----|
| Supabase | Banco PostgreSQL | https://supabase.com |
| Render | Backend (API) | https://render.com |
| Vercel | Painel Web (site) | https://vercel.com |
| Android Studio | Gerar o APK | já está instalado |

---

## PASSO 1 — CRIAR O BANCO DE DADOS (Supabase)

1. Acesse https://supabase.com e clique **"Start your project"**
2. Faça login com GitHub
3. Clique **"New project"**
4. Escolha um nome (ex: `rastreador-db`)
5. Crie uma senha forte **e guarde**
6. Escolha um servidor perto de você
7. Clique **"Create new project"** (aguarde 1-2 min)
8. No menu esquerdo, vá em **Project Settings → Database → Connection string**
9. Copie a string **URI** que aparece (começa com `postgresql://...`)
10. **Guarde essa string**, você vai usar no PASSO 2

---

## PASSO 2 — HOSPEDAR O BACKEND (Render)

1. Acesse https://render.com e clique **"Get started"**
2. Faça login com GitHub
3. Clique **"New +" → "Web Service"**
4. Conecte seu GitHub e selecione o repositório do projeto
5. Configure:
   - **Name:** `rastreador-backend`
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npx prisma generate && npm run build`
   - **Start Command:** `npm start`
6. Na seção **Environment Variables**, adicione:
   - `DATABASE_URL` → cole a string do Supabase (PASSO 1)
   - `JWT_SECRET` → gere uma chave com: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `PORT` → `3001`
7. Escolha o plano **Free**
8. Clique **"Create Web Service"**
9. **Aguarde 3-5 minutos** o deploy terminar
10. Quando aparecer **"Live"**, clique no nome do serviço para ver a URL
11. Exemplo de URL: `https://rastreador-backend.onrender.com`
12. **Guarde essa URL**, você vai usar no PASSO 3 e PASSO 4

---

## PASSO 3 — HOSPEDAR O PAINEL WEB (Vercel)

1. Acesse https://vercel.com e clique **"Sign Up"**
2. Faça login com GitHub
3. Clique **"Add New..." → "Project"**
4. Selecione o repositório do projeto
5. Configure:
   - **Root Directory:** `web-panel`
   - **Framework Preset:** Next.js (deve detectar automático)
6. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_API_URL` → cole a URL do backend (PASSO 2)
7. Clique **"Deploy"**
8. **Aguarde 1-2 minutos**
9. Pronto! A Vercel dá uma URL tipo: `https://rastreador-web.vercel.app`
10. Acesse essa URL no navegador — você verá a tela de login

> **Netlify também funciona**, mas precisa configurar o plugin Next.js. Vercel é mais simples.

---

## PASSO 4 — CONFIGURAR E GERAR O APK (Android)

1. Abra o **Android Studio**
2. Clique **"Open an existing project"**
3. Selecione a pasta `android-app` dentro do projeto
4. Aguarde o Gradle sincronizar (pode levar alguns minutos na primeira vez)
5. No explorador de arquivos, abra:  
   `app → build.gradle.kts`
6. Localize a linha:  
   `buildConfigField("String", "API_URL", "\"http://SEU_IP_AQUI:3001\"")`
7. Troque `http://SEU_IP_AQUI:3001` pela URL do backend (PASSO 2)  
   Exemplo: `"https://rastreador-backend.onrender.com"`
8. Vá em **Build → Build Bundle(s) / APK(s) → Build APK**
9. Aguarde finalizar
10. O APK estará em: `android-app/app/build/outputs/apk/debug/app-debug.apk`
11. Transfira o APK para seu celular e instale

---

## PASSO 5 — USAR

1. No celular, abra o app **Rastreador**
2. Faça login com email e senha (ou crie uma conta)
3. No site (Vercel), faça login com a mesma conta
4. No app, crie um dispositivo e ative o rastreamento
5. Pronto! A localização aparece no mapa do site em tempo real

---

## DICAS IMPORTANTES

- **O backend gratuito do Render "dorme" após 15 minutos sem uso.** Quando você abrir o site, a primeira requisição pode demorar 30-60 segundos enquanto ele acorda. Depois funciona normal.
- **Supabase free tem 500MB de armazenamento** — suficiente pra anos de rastreamento pessoal.
- **Vercel free** funciona perfeitamente para sites com poucos acessos como este.
- Se quiser pagar algo muito barato, um servidor de **$3-5/mês na Hetzner ou DigitalOcean** pode hospedar tudo em um lugar só (mais rápido).

---

## TESTAR LOCALMENTE (antes do deploy)

```bash
# 1. Backend
cd backend
npm install
npx prisma db push     # cria as tabelas
npm run dev            # http://localhost:3001

# 2. Web panel (outro terminal)
cd web-panel
npm install
npm run dev            # http://localhost:3000
```
