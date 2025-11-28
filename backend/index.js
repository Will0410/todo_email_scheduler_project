require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./db');
const todosRouter = require('./routes/todos');
const { startScheduler } = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('API TODO - Backend funcionando'));

app.use('/api/todos', todosRouter);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    // start scheduler after DB connected
    startScheduler();
  });
}).catch(err => {
  console.error('Falha ao conectar DB:', err);
});
