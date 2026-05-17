const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Permite receber dados no formato JSON e requisições do React
app.use(cors());
app.use(express.json());

// 1. CONEXÃO COM O MONGODB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Conectado ao banco com sucesso!'))
  .catch(err => console.error('Erro ao conectar no banco:', err));

// 2. DEFININDO O "MOLDE" DOS DADOS (SCHEMA)
// Vamos manter o formato exato que você já usa no React
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

// Criando a Coleção "Clientes" no MongoDB
const Cliente = mongoose.model('Cliente', ClienteSchema);

// 3. CRIANDO AS ROTAS (A PONTE COM O REACT)

// Rota para buscar todos os clientes (GET)
app.get('/api/clientes', async (req, res) => {
  try {
    const clientes = await Cliente.find();
    res.json(clientes);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar clientes' });
  }
});

// Rota para salvar um novo cliente (POST)
app.post('/api/clientes', async (req, res) => {
  try {
    const novoCliente = new Cliente(req.body);
    await novoCliente.save();
    res.json(novoCliente);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao salvar cliente' });
  }
});

// Rota para adicionar um consumo a um cliente existente (POST)
app.post('/api/clientes/:id/consumos', async (req, res) => {
  try {
    const cliente = await Cliente.findOne({ id: req.params.id });
    if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado' });
    
    cliente.consumos.push(req.body);
    await cliente.save();
    res.json(cliente);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao adicionar consumo' });
  }
});

// 4. LIGANDO O SERVIDOR
app.listen(5000, () => {
  console.log('Servidor rodando na porta 5000');
});