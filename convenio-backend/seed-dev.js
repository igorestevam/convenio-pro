// Popula uma conta de teste no banco de DESENVOLVIMENTO.
// Uso: npm run seed:dev   (lê o .env.dev)
// Rodar de novo apaga e recria os dados da conta de teste.
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Empresa, Cliente, FatExtra, Funcionario, FolhaExtra } = require('./models');

const EMAIL = 'teste@conveniopro.dev';
const SENHA = 'teste123';
const NOME = 'Restaurante Teste';

// ids no mesmo formato do front (timestamp incremental = ordem de registro)
let _uid = Date.now() - 1e7;
const uid = () => String(++_uid);

const pad = (n) => String(n).padStart(2, '0');
const monthKey = (offset) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - offset); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const dateIn = (offset, day) => {
  const [y, m] = monthKey(offset).split('-').map(Number);
  const last = offset === 0 ? new Date().getDate() : new Date(y, m, 0).getDate();
  return `${y}-${pad(m)}-${pad(Math.min(day, last))}`;
};
// gerador determinístico para os dados saírem sempre iguais
let seed = 42;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const between = (a, b) => Math.round((a + rnd() * (b - a)) * 100) / 100;

const CLIENTES = [
  ['Construtora Alicerce Ltda', 'financeiro@alicerce.com.br', '(11) 98765-4321', 'BOLETO'],
  ['Clínica Bem Viver', 'contato@bemviver.med.br', '(11) 97654-3210', 'PIX'],
  ['Transportadora Rota Sul', 'adm@rotasul.com.br', '(11) 96543-2109', 'BOLETO'],
  ['Escritório Martins & Costa', 'martinscosta@adv.br', '(11) 95432-1098', 'PIX'],
  ['Academia Corpo em Forma', 'gerencia@corpoemforma.com', '(11) 94321-0987', 'PIX'],
  ['Mercado Bom Preço', 'compras@bompreco.com.br', '(11) 93210-9876', 'BOLETO'],
  ['Auto Peças Veloz', 'veloz.pecas@gmail.com', '(11) 92109-8765', 'BOLETO'],
  ['Escola Pequeno Saber', 'secretaria@pequenosaber.edu.br', '(11) 91098-7654', 'PIX'],
  ['Gráfica Impressão Rápida', '', '(11) 90987-6543', 'BOLETO'],
  ['Ana Paula Ferreira', 'anapaula.f@gmail.com', '', 'PIX'],
  ['Oficina do Zé', '', '(11) 98888-1111', 'BOLETO', false],
  ['Padaria Pão Quente', 'paoquente@hotmail.com', '(11) 97777-2222', 'PIX', false, true],
];

const FUNCIONARIOS = [
  ['Carlos Eduardo Souza', 2800, 'carlos@email.com', '(11) 98111-2233', '123.456.789-00', true],
  ['Mariana Lima', 2200, 'mari.lima@email.com', '(11) 98222-3344', 'mari.lima@email.com', true],
  ['João Pedro Alves', 1900, '', '(11) 98333-4455', '', false],
  ['Fernanda Rocha', 3500, 'fernanda.r@email.com', '(11) 98444-5566', '(11) 98444-5566', true],
  ['Ricardo Gomes', 2100, '', '(11) 98555-6677', 'b7c1e2a0-chave-aleatoria', false],
  ['Juliana Santos', 2400, 'ju.santos@email.com', '', '', true, false],
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.name;
  if (!/-dev$/i.test(db)) {
    console.error(`Abortado: o banco "${db}" não parece ser de desenvolvimento (nome precisa terminar em -dev).`);
    process.exit(1);
  }

  const antiga = await Empresa.findOne({ email: EMAIL });
  if (antiga) {
    await Promise.all([Cliente, FatExtra, Funcionario, FolhaExtra].map(M => M.deleteMany({ empresaId: antiga._id })));
    await Empresa.deleteOne({ _id: antiga._id });
  }

  const empresa = await Empresa.create({ name: NOME, email: EMAIL, password: await bcrypt.hash(SENHA, 10) });
  const empresaId = empresa._id;

  // Clientes e consumos (últimos 6 meses)
  const clientes = CLIENTES.map(([name, email, phone, method, active = true, semConsumo = false]) => {
    const c = { id: uid(), empresaId, name, email, phone, method, active, consumos: [] };
    if (!semConsumo) {
      for (let off = 5; off >= (active ? 0 : 3); off--) {
        const qtd = 2 + Math.floor(rnd() * 6);
        const dias = Array.from({ length: qtd }, () => 1 + Math.floor(rnd() * 28)).sort((a, b) => a - b);
        dias.forEach(d => c.consumos.push({ id: uid(), date: dateIn(off, d), value: between(18, 180) }));
      }
    }
    return c;
  });
  // Lançamentos recentes com data antiga, para testar "últimos 15 registrados"
  clientes[2].consumos.push({ id: uid(), date: dateIn(2, 10), value: 95.5 });
  clientes[0].consumos.push({ id: uid(), date: dateIn(1, 25), value: 142.9 });
  await Cliente.insertMany(clientes);

  // Status das faturas: meses antigos pagos, mês passado em andamento, atual pendente
  const fatExtras = [];
  clientes.forEach((c, i) => {
    const meses = [...new Set(c.consumos.map(x => x.date.slice(0, 7)))];
    meses.forEach(m => {
      let status;
      if (m <= monthKey(2)) status = (i === 6 && m === monthKey(2)) ? 'ENVIADA' : 'PAGA';
      else if (m === monthKey(1)) status = ['PAGA', 'ENVIADA', 'FEITA', 'PENDENTE'][i % 4];
      if (status) fatExtras.push({ key: `${c.id}_${m}`, empresaId, status });
    });
  });
  await FatExtra.insertMany(fatExtras);

  // Funcionários, vales e folhas
  const funcionarios = FUNCIONARIOS.map(([name, salary, email, phone, pixKey, hasPayslip, active = true]) => {
    const f = { id: uid(), empresaId, name, salary, email, phone, pixKey, hasPayslip, active, consumo: 0, entries: [] };
    for (let off = 3; off >= (active ? 0 : 2); off--) {
      const qtd = Math.floor(rnd() * 3);
      for (let k = 0; k < qtd; k++) f.entries.push({ id: uid(), date: dateIn(off, 5 + Math.floor(rnd() * 20)), value: between(50, 400) });
    }
    return f;
  });
  await Funcionario.insertMany(funcionarios);

  const folhaExtras = [];
  funcionarios.forEach((f, i) => {
    for (let off = 3; off >= 0; off--) {
      if (!f.active && off < 2) continue;
      const consumo = i % 2 === 0 ? between(30, 250) : 0;
      folhaExtras.push({ key: `${f.id}_${monthKey(off)}`, empresaId, status: off >= 1 ? 'PAGO' : undefined, consumo });
    }
  });
  await FolhaExtra.insertMany(folhaExtras);

  const totalConsumos = clientes.reduce((s, c) => s + c.consumos.length, 0);
  console.log(`Banco: ${db}`);
  console.log(`Conta criada: ${EMAIL} / ${SENHA}`);
  console.log(`${clientes.length} clientes, ${totalConsumos} consumos, ${funcionarios.length} funcionários.`);
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
