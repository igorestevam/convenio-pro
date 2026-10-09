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

const { Empresa, Cliente, FatExtra, Funcionario, FolhaExtra, Fornecedor, FormaPagamento } = require('./models');

const authMiddleware = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) return res.status(401).json({ erro: 'Acesso negado.' });
  try {
    req.empresa = jwt.verify(authHeader.replace('Bearer ', ''), JWT_SECRET);
    next();
  } catch (err) { res.status(401).json({ erro: 'Token inválido.' }); }
};

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

// ROTAS DE CLIENTES
app.get('/api/clientes', authMiddleware, async (req, res) => res.json(await Cliente.find({ empresaId: req.empresa.id })));
app.post('/api/clientes', authMiddleware, async (req, res) => res.json(await (new Cliente({ ...req.body, empresaId: req.empresa.id })).save()));

// NOVA ROTA: Editar Cliente (Nome, Email, Telefone, Ativo)
app.put('/api/clientes/:id', authMiddleware, async (req, res) => {
  const { name, email, phone, active } = req.body;
  const c = await Cliente.findOneAndUpdate(
    { id: req.params.id, empresaId: req.empresa.id },
    { name, email, phone, active },
    { new: true }
  );
  if (!c) return res.status(404).json({ erro: 'Não encontrado' });
  res.json(c);
});

// NOVA ROTA: Excluir Cliente
app.delete('/api/clientes/:id', authMiddleware, async (req, res) => {
  const c = await Cliente.findOne({ id: req.params.id, empresaId: req.empresa.id });
  if (!c) return res.status(404).json({ erro: 'Não encontrado' });
  if (c.consumos.length > 0) return res.status(400).json({ erro: 'Não é possível excluir um cliente com consumos.' });
  await Cliente.deleteOne({ _id: c._id });
  res.json({ success: true });
});

// ROTAS DE CONSUMOS
app.post('/api/clientes/:id/consumos', authMiddleware, async (req, res) => {
  const c = await Cliente.findOne({ id: req.params.id, empresaId: req.empresa.id });
  if (!c) return res.status(404).json({ erro: 'Não encontrado' });
  c.consumos.push(req.body); await c.save(); res.json(c);
});
app.patch('/api/clientes/:id/consumos/:consumoId', authMiddleware, async (req, res) => {
  const value = Number(req.body.value);
  if (!(value > 0)) return res.status(400).json({ erro: 'Valor inválido.' });
  const c = await Cliente.findOne({ id: req.params.id, empresaId: req.empresa.id });
  const consumo = c && c.consumos.find(x => x.id === req.params.consumoId);
  if (!consumo) return res.status(404).json({ erro: 'Não encontrado' });
  consumo.value = value; await c.save(); res.json(consumo);
});
app.delete('/api/clientes/:id/consumos/:consumoId', authMiddleware, async (req, res) => {
  const c = await Cliente.findOne({ id: req.params.id, empresaId: req.empresa.id });
  if (c) { c.consumos = c.consumos.filter(x => x.id !== req.params.consumoId); await c.save(); }
  res.json({ success: true });
});

app.patch('/api/clientes/:id/method', authMiddleware, async (req, res) => {
  await Cliente.findOneAndUpdate({ id: req.params.id, empresaId: req.empresa.id }, { method: req.body.method }); res.json({ success: true });
});

app.get('/api/fatextras', authMiddleware, async (req, res) => {
  const m = {}; (await FatExtra.find({ empresaId: req.empresa.id })).forEach(e => m[e.key] = { status: e.status, method: e.method }); res.json(m);
});
app.post('/api/fatextras/:key', authMiddleware, async (req, res) => {
  const update = {}; if(req.body.status) update.status = req.body.status; if(req.body.method) update.method = req.body.method;
  await FatExtra.findOneAndUpdate({ key: req.params.key, empresaId: req.empresa.id }, { $set: update }, { upsert: true }); res.json({ success: true });
});

// ROTAS DE FUNCIONÁRIOS
app.get('/api/funcionarios', authMiddleware, async (req, res) => res.json(await Funcionario.find({ empresaId: req.empresa.id })));
app.post('/api/funcionarios', authMiddleware, async (req, res) => res.json(await (new Funcionario({ ...req.body, empresaId: req.empresa.id })).save()));

app.put('/api/funcionarios/:id', authMiddleware, async (req, res) => {
  const { name, salary, consumo, hasPayslip, pixKey, active, email, phone } = req.body;
  const f = await Funcionario.findOneAndUpdate(
    { id: req.params.id, empresaId: req.empresa.id },
    { name, salary, consumo, hasPayslip, pixKey, active, email, phone },
    { new: true }
  );
  if (!f) return res.status(404).json({ erro: 'Não encontrado' });
  res.json(f);
});

app.delete('/api/funcionarios/:id', authMiddleware, async (req, res) => {
  const f = await Funcionario.findOne({ id: req.params.id, empresaId: req.empresa.id });
  if (!f) return res.status(404).json({ erro: 'Não encontrado' });
  if (f.entries.length > 0) return res.status(400).json({ erro: 'Não é possível excluir um funcionário com histórico.' });
  await Funcionario.deleteOne({ _id: f._id });
  res.json({ success: true });
});

// ROTAS DE ENTRADAS (VALES/CONSUMOS)
app.post('/api/funcionarios/:id/entries', authMiddleware, async (req, res) => {
  const f = await Funcionario.findOne({ id: req.params.id, empresaId: req.empresa.id });
  if (!f) return res.status(404).json({ erro: 'Não encontrado' });
  f.entries.push(req.body); await f.save(); res.json(f);
});
app.delete('/api/funcionarios/:id/entries/:entryId', authMiddleware, async (req, res) => {
  const f = await Funcionario.findOne({ id: req.params.id, empresaId: req.empresa.id });
  if (f) { f.entries = f.entries.filter(x => x.id !== req.params.entryId); await f.save(); }
  res.json({ success: true });
});

// ROTAS DE FOLHA EXTRA (STATUS DO MÊS)
app.get('/api/folhaextras', authMiddleware, async (req, res) => {
  const m = {}; (await FolhaExtra.find({ empresaId: req.empresa.id })).forEach(e => m[e.key] = { status: e.status, consumo: e.consumo || 0 }); res.json(m);
});
app.post('/api/folhaextras/:key', authMiddleware, async (req, res) => {
  const update = {};
  if (req.body.status !== undefined) update.status = req.body.status;
  if (req.body.consumo !== undefined) update.consumo = req.body.consumo;
  await FolhaExtra.findOneAndUpdate(
    { key: req.params.key, empresaId: req.empresa.id },
    { $set: update },
    { upsert: true }
  );
  res.json({ success: true });
});

// ROTAS DE FORNECEDORES
const FORNECEDOR_CAMPOS = ['name', 'tradeName', 'cnpj', 'email', 'phone', 'category', 'pixKey', 'notes', 'address', 'active'];
const pickFornecedor = (body) => Object.fromEntries(FORNECEDOR_CAMPOS.filter(k => body[k] !== undefined).map(k => [k, body[k]]));

app.get('/api/fornecedores', authMiddleware, async (req, res) => res.json(await Fornecedor.find({ empresaId: req.empresa.id })));
app.post('/api/fornecedores', authMiddleware, async (req, res) => {
  res.json(await (new Fornecedor({ ...pickFornecedor(req.body), id: req.body.id, empresaId: req.empresa.id })).save());
});
app.put('/api/fornecedores/:id', authMiddleware, async (req, res) => {
  const f = await Fornecedor.findOneAndUpdate({ id: req.params.id, empresaId: req.empresa.id }, pickFornecedor(req.body), { new: true });
  if (!f) return res.status(404).json({ erro: 'Não encontrado' });
  res.json(f);
});
app.delete('/api/fornecedores/:id', authMiddleware, async (req, res) => {
  const f = await Fornecedor.findOne({ id: req.params.id, empresaId: req.empresa.id });
  if (!f) return res.status(404).json({ erro: 'Não encontrado' });
  if (f.despesas.length > 0) return res.status(400).json({ erro: 'Não é possível excluir um fornecedor com despesas.' });
  await Fornecedor.deleteOne({ _id: f._id });
  res.json({ success: true });
});

// ROTAS DE DESPESAS (dentro do fornecedor)
app.post('/api/fornecedores/:id/despesas', authMiddleware, async (req, res) => {
  const f = await Fornecedor.findOne({ id: req.params.id, empresaId: req.empresa.id });
  if (!f) return res.status(404).json({ erro: 'Não encontrado' });
  const { id, date, value, methodId, status } = req.body;
  f.despesas.push({ id, date, value, methodId, status }); await f.save(); res.json(f);
});
app.patch('/api/fornecedores/:id/despesas/:despesaId', authMiddleware, async (req, res) => {
  const f = await Fornecedor.findOne({ id: req.params.id, empresaId: req.empresa.id });
  const d = f && f.despesas.find(x => x.id === req.params.despesaId);
  if (!d) return res.status(404).json({ erro: 'Não encontrado' });
  ['date', 'value', 'methodId', 'status'].forEach(k => { if (req.body[k] !== undefined) d[k] = req.body[k]; });
  await f.save(); res.json(d);
});
app.delete('/api/fornecedores/:id/despesas/:despesaId', authMiddleware, async (req, res) => {
  const f = await Fornecedor.findOne({ id: req.params.id, empresaId: req.empresa.id });
  if (f) { f.despesas = f.despesas.filter(x => x.id !== req.params.despesaId); await f.save(); }
  res.json({ success: true });
});

// ROTAS DE FORMAS DE PAGAMENTO (já nascem com Boleto, PIX, Dinheiro e Cartão)
const FORMAS_PADRAO = [['boleto', 'Boleto'], ['pix', 'PIX'], ['dinheiro', 'Dinheiro'], ['cartao', 'Cartão']];
app.get('/api/formas-pagamento', authMiddleware, async (req, res) => {
  let formas = await FormaPagamento.find({ empresaId: req.empresa.id });
  if (formas.length === 0) formas = await FormaPagamento.insertMany(FORMAS_PADRAO.map(([id, name]) => ({ id, name, empresaId: req.empresa.id })));
  res.json(formas);
});
app.post('/api/formas-pagamento', authMiddleware, async (req, res) => {
  res.json(await (new FormaPagamento({ id: req.body.id, name: req.body.name, empresaId: req.empresa.id })).save());
});
app.put('/api/formas-pagamento/:id', authMiddleware, async (req, res) => {
  const fp = await FormaPagamento.findOneAndUpdate({ id: req.params.id, empresaId: req.empresa.id }, { name: req.body.name }, { new: true });
  if (!fp) return res.status(404).json({ erro: 'Não encontrado' });
  res.json(fp);
});
app.delete('/api/formas-pagamento/:id', authMiddleware, async (req, res) => {
  const emUso = await Fornecedor.exists({ empresaId: req.empresa.id, 'despesas.methodId': req.params.id });
  if (emUso) return res.status(400).json({ erro: 'Esta forma de pagamento está em uso por alguma despesa.' });
  if (await FormaPagamento.countDocuments({ empresaId: req.empresa.id }) <= 1) return res.status(400).json({ erro: 'Mantenha pelo menos uma forma de pagamento.' });
  await FormaPagamento.deleteOne({ id: req.params.id, empresaId: req.empresa.id });
  res.json({ success: true });
});

app.get('/', (req, res) => res.send('API Online e Segura!'));
app.listen(5000, () => console.log('Servidor rodando na porta 5000'));

// Rota para atualizar o perfil e a senha da empresa
app.put('/api/auth/profile', authMiddleware, async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;
    
    // Pega o ID da empresa logada que veio do seu authMiddleware
    const empresaId = req.empresa.id; 

    // Busca a empresa real no MongoDB usando o Mongoose
    const empresa = await Empresa.findById(empresaId); 

    if (!empresa) {
      return res.status(404).json({ erro: "Empresa não encontrada." });
    }

    // Verifica e troca a senha (se o usuário preencheu o campo de nova senha)
    if (newPassword) {
      const senhaValida = await bcrypt.compare(currentPassword, empresa.password);
      
      if (!senhaValida) {
        return res.status(400).json({ erro: "A senha atual está incorreta." });
      }
      
      const hashedNovaSenha = await bcrypt.hash(newPassword, 10);
      empresa.password = hashedNovaSenha; 
    }

    // Prepara o novo nome e email para salvar
    if (name) empresa.name = name;
    if (email) empresa.email = email;

    // Salva tudo de uma vez no banco de dados
    await empresa.save();

    return res.json({ sucesso: true, mensagem: "Conta atualizada com sucesso!" });

  } catch (erro) {
    console.error("Erro na atualização de perfil:", erro);
    if (erro.code === 11000) {
      return res.status(400).json({ erro: "Este e-mail já está sendo usado por outra conta." });
    }
    return res.status(500).json({ erro: "Erro interno ao atualizar o perfil." });
  }
});