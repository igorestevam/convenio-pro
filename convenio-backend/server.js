const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. CONEXÃO
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Conectado ao MongoDB com sucesso!'))
  .catch(err => console.error('Erro ao conectar no banco:', err));

// 2. SCHEMAS
const ConsumoSchema = new mongoose.Schema({
  id: String,
  date: String,
  desc: String,
  value: Number
});

const ClienteSchema = new mongoose.Schema({
  id: String,
  name: String,
  email: String,
  phone: String,
  method: String,
  consumos: [ConsumoSchema]
});

// Novo Schema para guardar as configurações manuais de cada fatura (Status e Método)
const FatExtraSchema = new mongoose.Schema({
  key: String,
  status: String,
  method: String
});

const Cliente = mongoose.model('Cliente', ClienteSchema);
const FatExtra = mongoose.model('FatExtra', FatExtraSchema);

// 3. ROTAS DE CLIENTES E CONSUMOS
app.get('/api/clientes', async (req, res) => {
  const clientes = await Cliente.find();
  res.json(clientes);
});

app.post('/api/clientes', async (req, res) => {
  const novoCliente = new Cliente(req.body);
  await novoCliente.save();
  res.json(novoCliente);
});

app.post('/api/clientes/:id/consumos', async (req, res) => {
  const cliente = await Cliente.findOne({ id: req.params.id });
  if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado' });
  
  cliente.consumos.push(req.body);
  await cliente.save();
  res.json(cliente);
});

// NOVA ROTA: Excluir consumo
app.delete('/api/clientes/:id/consumos/:consumoId', async (req, res) => {
  const cliente = await Cliente.findOne({ id: req.params.id });
  if (cliente) {
    cliente.consumos = cliente.consumos.filter(c => c.id !== req.params.consumoId);
    await cliente.save();
  }
  res.json({ success: true });
});

// NOVA ROTA: Atualizar método padrão do cliente
app.patch('/api/clientes/:id', async (req, res) => {
  await Cliente.findOneAndUpdate({ id: req.params.id }, { method: req.body.method });
  res.json({ success: true });
});

// 4. ROTAS DE STATUS E MÉTODOS DE FATURAS (FatExtras)
app.get('/api/fatextras', async (req, res) => {
  const extras = await FatExtra.find();
  const map = {};
  extras.forEach(e => { map[e.key] = { status: e.status, method: e.method }; });
  res.json(map);
});

app.post('/api/fatextras/:key', async (req, res) => {
  const { status, method } = req.body;
  const update = {};
  if (status) update.status = status;
  if (method) update.method = method;

  await FatExtra.findOneAndUpdate(
    { key: req.params.key },
    { $set: update },
    { upsert: true, new: true } // Se não existir, cria. Se existir, atualiza.
  );
  res.json({ success: true });
});

app.get('/', (req, res) => res.send('API Online!'));

app.listen(5000, () => console.log('Servidor rodando na porta 5000'));