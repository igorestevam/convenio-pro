const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Conectado ao MongoDB com sucesso!'))
  .catch(err => console.error('Erro ao conectar no banco:', err));

const JWT_SECRET = process.env.JWT_SECRET || 'super_segredo_convenio_pro_2026';

// 1. ATUALIZADO: Esquema da Empresa agora tem 'name'
const EmpresaSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const ConsumoSchema = new mongoose.Schema({ id: String, date: String, desc: String, value: Number });
const ClienteSchema = new mongoose.Schema({
  id: String, empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  name: String, email: String, phone: String, method: String, consumos: [ConsumoSchema]
});
const FatExtraSchema = new mongoose.Schema({
  key: String, empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true }, status: String, method: String
});

const Empresa = mongoose.model('Empresa', EmpresaSchema);
const Cliente = mongoose.model('Cliente', ClienteSchema);
const FatExtra = mongoose.model('FatExtra', FatExtraSchema);

const authMiddleware = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) return res.status(401).json({ erro: 'Acesso negado.' });
  try {
    req.empresa = jwt.verify(authHeader.replace('Bearer ', ''), JWT_SECRET);
    next();
  } catch (err) { res.status(401).json({ erro: 'Token inválido.' }); }
};

// 2. ATUALIZADO: Rota de Registro agora recebe o 'name'
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (await Empresa.findOne({ email })) return res.status(400).json({ erro: 'Email já registado.' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const empresa = new Empresa({ name, email, password: hashedPassword });
    await empresa.save();

    const token = jwt.sign({ id: empresa._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, email: empresa.email, name: empresa.name });
  } catch (err) { res.status(500).json({ erro: 'Erro no servidor.' }); }
});

// 3. ATUALIZADO: Rota de Login agora devolve o 'name'
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const empresa = await Empresa.findOne({ email });
    if (!empresa || !(await bcrypt.compare(password, empresa.password))) 
      return res.status(400).json({ erro: 'Credenciais inválidas.' });

    const token = jwt.sign({ id: empresa._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, email: empresa.email, name: empresa.name });
  } catch (err) { res.status(500).json({ erro: 'Erro no servidor.' }); }
});

// Rotas de dados
app.get('/api/clientes', authMiddleware, async (req, res) => res.json(await Cliente.find({ empresaId: req.empresa.id })));
app.post('/api/clientes', authMiddleware, async (req, res) => res.json(await (new Cliente({ ...req.body, empresaId: req.empresa.id })).save()));
app.post('/api/clientes/:id/consumos', authMiddleware, async (req, res) => {
  const c = await Cliente.findOne({ id: req.params.id, empresaId: req.empresa.id });
  if (!c) return res.status(404).json({ erro: 'Não encontrado' });
  c.consumos.push(req.body); await c.save(); res.json(c);
});
app.delete('/api/clientes/:id/consumos/:consumoId', authMiddleware, async (req, res) => {
  const c = await Cliente.findOne({ id: req.params.id, empresaId: req.empresa.id });
  if (c) { c.consumos = c.consumos.filter(x => x.id !== req.params.consumoId); await c.save(); }
  res.json({ success: true });
});
app.patch('/api/clientes/:id', authMiddleware, async (req, res) => {
  await Cliente.findOneAndUpdate({ id: req.params.id, empresaId: req.empresa.id }, { method: req.body.method }); res.json({ success: true });
});
app.get('/api/fatextras', authMiddleware, async (req, res) => {
  const m = {}; (await FatExtra.find({ empresaId: req.empresa.id })).forEach(e => m[e.key] = { status: e.status, method: e.method }); res.json(m);
});
app.post('/api/fatextras/:key', authMiddleware, async (req, res) => {
  const update = {}; if(req.body.status) update.status = req.body.status; if(req.body.method) update.method = req.body.method;
  await FatExtra.findOneAndUpdate({ key: req.params.key, empresaId: req.empresa.id }, { $set: update }, { upsert: true }); res.json({ success: true });
});

app.get('/', (req, res) => res.send('API Online e Segura!'));
app.listen(5000, () => console.log('Servidor rodando na porta 5000'));