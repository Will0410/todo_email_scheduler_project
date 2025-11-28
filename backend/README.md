# Backend - Todo API with Email Scheduler
## Como rodar (local)
1. Copie `.env.example` para `.env` e ajuste `MONGO_URI` e credenciais de e-mail.
2. Instale dependências: `npm install`
3. Rodar em dev: `npm run dev` (precisa nodemon) ou `npm start`
4. Verifique logs: o scheduler roda a cada minuto e enviará e-mails para tarefas com `due` <= agora e `sent: false`.
