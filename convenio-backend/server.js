const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. CONEXÃO
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Conectado ao MongoDB com sucesso!'))
  .catch(err => console.error('Erro ao conectar no banco:', err));

// O Segredo para os Tokens (Podes definir um JWT_SECRET no .env depois, mas usamos um fallback para teste)
const JWT_SECRET = process.env.JWT_SECRET || 'super_segredo_convenio_pro_2026';

// 2. SCHEMAS
const EmpresaSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const ConsumoSchema = new mongoose.Schema({
  id: String,
  date: String,
  desc: String,
  value: Number
});

const ClienteSchema = new mongoose.Schema({
  id: String,
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true }, // NOVO: Liga o cliente à empresa
  name: String,
  email: String,
  phone: String,
  method: String,
  consumos: [ConsumoSchema]
});

const FatExtraSchema = new mongoose.Schema({
  key: String,
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true }, // NOVO
  status: String,
  method: String
});

const Empresa = mongoose.model('Empresa', EmpresaSchema);
const Cliente = mongoose.model('Cliente', ClienteSchema);
const FatExtra = mongoose.model('FatExtra', FatExtraSchema);

// 3. MIDDLEWARE DE AUTENTICAÇÃO (Verifica se quem faz o pedido tem o "crachá"/token)
const authMiddleware = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) return res.status(401).json({ erro: 'Acesso negado. Token não fornecido.' });

  const token = authHeader.replace('Bearer ', '');
  try {
    const decodificado = jwt.verify(token, JWT_SECRET);
    req.empresa = decodificado; // Guarda o ID da empresa para usar nas rotas
    next();
  } catch (err) {
    res.status(401).json({ erro: 'Token inválido.' });
  }
};

// 4. ROTAS DE AUTENTICAÇÃO
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    let empresa = await Empresa.findOne({ email });
    if (empresa) return res.status(400).json({ erro: 'Email já registado.' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    empresa = new Empresa({ email, password: hashedPassword });
    await empresa.save();

    const token = jwt.sign({ id: empresa._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, email });
  } catch (err) {
    res.status(500).json({ erro: 'Erro no servidor.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const empresa = await Empresa.findOne({ email });
    if (!empresa) return res.status(400).json({ erro: 'Credenciais inválidas.' });

    const isMatch = await bcrypt.compare(password, empresa.password);
    if (!isMatch) return res.status(400).json({ erro: 'Credenciais inválidas.' });

    const token = jwt.sign({ id: empresa._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, email });
  } catch (err) {
    res.status(500).json({ erro: 'Erro no servidor.' });
  }
});

// 5. ROTAS DE CLIENTES E CONSUMOS (Agora protegidas pelo authMiddleware)
app.get('/api/clientes', authMiddleware, async (req, res) => {
  const clientes = await Cliente.find({ empresaId: req.empresa.id }); // Só encontra os da empresa logada
  res.json(clientes);
});

app.post('/api/clientes', authMiddleware, async (req, res) => {
  const novoCliente = new Cliente({ ...req.body, empresaId: req.empresa.id });
  await novoCliente.save();
  res.json(novoCliente);
});

app.post('/api/clientes/:id/consumos', authMiddleware, async (req, res) => {
  const cliente = await Cliente.findOne({ id: req.params.id, empresaId: req.empresa.id });
  if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado' });
  
  cliente.consumos.push(req.body);
  await cliente.save();
  res.json(cliente);
});

app.delete('/api/clientes/:id/consumos/:consumoId', authMiddleware, async (req, res) => {
  const cliente = await Cliente.findOne({ id: req.params.id, empresaId: req.empresa.id });
  if (cliente) {
    cliente.consumos = cliente.consumos.filter(c => c.id !== req.params.consumoId);
    await cliente.save();
  }
  res.json({ success: true });
});

app.patch('/api/clientes/:id', authMiddleware, async (req, res) => {
  await Cliente.findOneAndUpdate({ id: req.params.id, empresaId: req.empresa.id }, { method: req.body.method });
  res.json({ success: true });
});

// 6. ROTAS DE STATUS E MÉTODOS DE FATURAS (FatExtras)
app.get('/api/fatextras', authMiddleware, async (req, res) => {
  const extras = await FatExtra.find({ empresaId: req.empresa.id });
  const map = {};
  extras.forEach(e => { map[e.key] = { status: e.status, method: e.method }; });
  res.json(map);
});

app.post('/api/fatextras/:key', authMiddleware, async (req, res) => {
  const { status, method } = req.body;
  const update = {};
  if (status) update.status = status;
  if (method) update.method = method;

  await FatExtra.findOneAndUpdate(
    { key: req.params.key, empresaId: req.empresa.id },
    { $set: update },
    { upsert: true, new: true }
  );
  res.json({ success: true });
});

app.get('/', (req, res) => res.send('API Online e Segura!'));

app.listen(5000, () => console.log('Servidor rodando na porta 5000'));