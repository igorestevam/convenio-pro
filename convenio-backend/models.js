const mongoose = require('mongoose');

const EmpresaSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

// REMOVIDO: campo 'desc'
const ConsumoSchema = new mongoose.Schema({ id: String, date: String, value: Number });

// ADICIONADO: campo 'active'
const ClienteSchema = new mongoose.Schema({
  id: String, empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  name: String, email: String, phone: String, method: String, active: { type: Boolean, default: true }, consumos: [ConsumoSchema]
});

const FatExtraSchema = new mongoose.Schema({
  key: String, empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true }, status: String, method: String
});

const Empresa = mongoose.model('Empresa', EmpresaSchema);
const Cliente = mongoose.model('Cliente', ClienteSchema);
const FatExtra = mongoose.model('FatExtra', FatExtraSchema);

const EntrySchema = new mongoose.Schema({ id: String, date: String, value: Number, type: String });

const FuncionarioSchema = new mongoose.Schema({
  id: String, empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  name: String, email: String, phone: String, salary: Number, consumo: { type: Number, default: 0 }, hasPayslip: Boolean, pixKey: String, active: { type: Boolean, default: true }, entries: [EntrySchema]
});

const FolhaExtraSchema = new mongoose.Schema({
  key: String, empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true }, status: String, consumo: Number
});

const Funcionario = mongoose.model('Funcionario', FuncionarioSchema);
const FolhaExtra = mongoose.model('FolhaExtra', FolhaExtraSchema);

const DespesaSchema = new mongoose.Schema({ id: String, date: String, value: Number, methodId: String, status: { type: String, default: 'PENDENTE' } });

const FornecedorSchema = new mongoose.Schema({
  id: String, empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  name: String, tradeName: String, cnpj: String, email: String, phone: String, category: String, pixKey: String, notes: String,
  address: { cep: String, street: String, number: String, complement: String, district: String, city: String, uf: String },
  active: { type: Boolean, default: true }, createdAt: { type: Date, default: Date.now }, despesas: [DespesaSchema]
});

const FormaPagamentoSchema = new mongoose.Schema({
  id: String, empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true }, name: String
});

const Fornecedor = mongoose.model('Fornecedor', FornecedorSchema);
const FormaPagamento = mongoose.model('FormaPagamento', FormaPagamentoSchema);

module.exports = { Empresa, Cliente, FatExtra, Funcionario, FolhaExtra, Fornecedor, FormaPagamento };
