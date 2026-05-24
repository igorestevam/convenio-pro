import { useState, useMemo, useEffect } from "react";
import { ArrowLeft, LogOut, Wallet, Search, Plus, FileText, CheckCircle2, Clock, Edit, Trash2, X, Users, DollarSign, AlertCircle, Download, ChevronRight, User, Mail, Phone } from "lucide-react";
import * as XLSX from "xlsx";
import AppFooter from "./AppFooter";

/* ─── API BASE URL ─── */
const API_URL = 'https://convenio-api-nrfx.onrender.com/api';

/* ─── Constants & Helpers ─── */
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const STATUS_CFG = {
  PENDENTE: { color: "#D97706", bg: "#FEF3C7", Icon: Clock },
  PAGO: { color: "#15803D", bg: "#DCFCE7", Icon: CheckCircle2 },
};

const BRL = (n) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
const fmtD = (d) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
const todayStr = () => new Date().toISOString().slice(0, 10);
const mkKey = (d) => d.slice(0, 7);
let _uid = Date.now();
const uid = () => String(++_uid);

/* ─── Shared UI ─── */
function Chip({ children, color = "#059669", bg = "#D1FAE5", style = {} }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 800, color, background: bg, padding: "2px 8px", borderRadius: 99, letterSpacing: .4, whiteSpace: "nowrap", ...style }}>{children}</span>;
}

function Card({ children, style = {}, padding = 20 }) {
  return <div style={{ background: "#fff", borderRadius: 16, padding, boxShadow: "0 1px 4px rgba(0,0,0,.08)", ...style }}>{children}</div>;
}

function Btn({ children, onClick, disabled = false, variant = "primary", style = {} }) {
  const themes = {
    primary: { background: "linear-gradient(135deg, #059669, #10B981)", color: "#fff", border: "none" },
    secondary: { background: "#fff", color: "#374151", border: "1px solid #E5E7EB" },
    success: { background: "#DCFCE7", color: "#15803D", border: "none" },
    danger: { background: "#FEE2E2", color: "#DC2626", border: "none" },
  };
  return (
    <button onClick={disabled ? undefined : onClick} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .5 : 1, transition: "opacity .15s", fontFamily: "inherit", ...themes[variant], ...style }}>
      {children}
    </button>
  );
}

function StatusSel({ value, onChange }) {
  const s = STATUS_CFG[value] || STATUS_CFG.PENDENTE;
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ background: s.bg, color: s.color, border: "none", borderRadius: 99, padding: "4px 10px", fontSize: 11, fontWeight: 800, cursor: "pointer", outline: "none", fontFamily: "inherit" }}>
      {Object.keys(STATUS_CFG).map(k => <option key={k} value={k}>{k}</option>)}
    </select>
  );
}

function Lbl({ children }) { return <div style={{ fontSize: 11, fontWeight: 800, color: "#6B7280", letterSpacing: .6, marginBottom: 6 }}>{children}</div>; }
function Inp({ value, onChange, placeholder, type="text", style={} }) { return <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{ width:"100%",boxSizing:"border-box",padding:"10px 12px",borderRadius:10, border:"1px solid #E5E7EB",fontSize:14,background:"#fff",outline:"none", fontFamily:"inherit", color:"#111827", ...style }} />; }

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, []);
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, background: type === "error" ? "#FEE2E2" : "#DCFCE7", color: type === "error" ? "#DC2626" : "#15803D", padding: "12px 18px", borderRadius: 12, fontWeight: 700, fontSize: 13, boxShadow: "0 4px 20px rgba(0,0,0,.15)", animation: "toastIn .3s ease" }}>
      {msg}
    </div>
  );
}

/* ─── Lógica de Formulário Inline (Tabela) ─── */
const _formState = {};
function getForm(id) { if (!_formState[id]) _formState[id] = { val: "", dt: todayStr(), _subs: [] }; return _formState[id]; }

function useFormField(id, field) {
  const [value, setValue] = useState(() => getForm(id)[field]);
  useEffect(() => {
    const form = getForm(id);
    const sub = () => setValue(form[field]);
    form._subs.push(sub);
    return () => { form._subs = form._subs.filter(fn => fn !== sub); };
  }, [id, field]);
  const set = (v) => { const form = getForm(id); form[field] = v; form._subs.forEach(fn => fn()); };
  return [value, set];
}

const inpBase = { boxSizing: "border-box", padding: "7px 10px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13, background: "#FAFAFA", outline: "none", fontFamily: "inherit" };

function InlineConsumo({ value, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(value === 0 ? "" : value);
  useEffect(() => { setVal(value === 0 ? "" : value); }, [value]);
  const handleCommit = () => {
    const v = typeof parseBrValue === 'function' ? parseBrValue(val) : parseFloat(String(val).replace(",", "."));
    const finalV = isNaN(v) || v < 0 ? 0 : v;
    if (finalV !== value) onSave(finalV);
    setVal(finalV === 0 ? "" : finalV);
    setIsEditing(false);
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ color: "#6B7280", fontSize: 12, fontWeight: 700 }}>Consumos:</span>
      {!isEditing ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <b style={{ color: "#4F46E5" }}>{BRL(value)}</b>
          <button type="button" onClick={() => setIsEditing(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280", padding: 2, display: "flex" }} title="Editar Consumo"><Edit size={13} /></button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input type="text" value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCommit()} placeholder="0,00" style={{ ...inpBase, width: 80, textAlign: "right", padding: "6px 8px", color: "#4F46E5", fontWeight: 800 }} autoFocus />
          <button type="button" onClick={handleCommit} style={{ background: "linear-gradient(135deg, #059669, #10B981)", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 800, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }} title="Salvar Consumo"><CheckCircle2 size={13} /> Salvar</button>
          <button type="button" onClick={() => { setIsEditing(false); setVal(value === 0 ? "" : value); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: 4, display: "flex" }} title="Cancelar"><X size={14} /></button>
        </div>
      )}
    </div>
  );
}

function InlineRowInputs({ funcId, onAddEntry }) {
  const [dt, setDt] = useFormField(funcId, "dt");
  const [val, setVal] = useFormField(funcId, "val");

  const handleLancar = () => {
    const v = parseFloat(String(val).replace(",", "."));
    if (!val || isNaN(v) || v <= 0) return alert("Informe um valor válido.");
    onAddEntry(funcId, dt, v);
    const form = getForm(funcId); form.val = ""; form.dt = todayStr(); form._subs.forEach(fn => fn());
  };

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <input type="date" value={dt} onChange={e => setDt(e.target.value)} style={{ ...inpBase, width: 125 }} />
      <input type="text" value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLancar()} placeholder="R$ 0,00" style={{ ...inpBase, width: 85, textAlign: "right" }} />
      <button onClick={handleLancar} disabled={!val} style={{ display: "flex", alignItems: "center", gap: 4, padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 800, background: val ? "linear-gradient(135deg, #059669, #10B981)" : "#E5E7EB", color: val ? "#fff" : "#9CA3AF", border: "none", cursor: val ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
        <Plus size={14} /> Lançar Vale
      </button>
    </div>
  );
}

/* ─── Detalhes do Funcionário (Página Interna) ─── */
function FuncionarioDetail({ func, folhaStatus, onAddEntry, onDeleteEntry, onUpdateFolhaExtra, onOpenEdit }) {
  const [dt, setDt] = useState(todayStr());
  const [val, setVal] = useState("");

  const handleLancar = () => {
    const v = parseFloat(String(val).replace(",", "."));
    if (!val || isNaN(v) || v <= 0) return alert("Informe um valor válido.");
    onAddEntry(func.id, dt, v);
    setVal(""); setDt(todayStr());
  };

  const grouped = useMemo(() => {
    const mSet = new Set([mkKey(todayStr())]);
    (func.entries || []).forEach(e => mSet.add(mkKey(e.date)));
    Object.keys(folhaStatus).forEach(k => {
      if (k.startsWith(func.id + "_")) mSet.add(k.split("_")[1]);
    });
    
    const arr = Array.from(mSet).sort().reverse();
    return arr.map(month => {
      const key = `${func.id}_${month}`;
      const valesList = (func.entries || []).filter(e => mkKey(e.date) === month);
      const valesTotal = valesList.reduce((s, x) => s + x.value, 0);
      const fExtra = folhaStatus[key] || {};
      const consumo = fExtra.consumo || 0;
      return { month, key, valesTotal, valesList, consumo };
    });
  }, [func.entries, folhaStatus, func.id]);

  return (
    <div>
      <Card style={{ marginBottom: 20, padding: 22 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0, background: "linear-gradient(135deg,#059669,#10B981)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 900, color: "#fff" }}>{func.name.charAt(0)}</div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#111" }}>{func.name}</div>
                {func.active === false && <Chip color="#DC2626" bg="#FEE2E2">Inativo</Chip>}
                <button onClick={onOpenEdit} style={{ display: "flex", alignItems: "center", gap: 4, background: "#F3F4F6", border: "none", padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, color: "#4B5563", cursor: "pointer", fontFamily: "inherit" }}><Edit size={12} /> Editar</button>
              </div>
              <div style={{ display: "flex", gap: 14, marginTop: 5, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "#6B7280" }}>Salário Base: <b>{BRL(func.salary)}</b></span>
                {func.email && <span style={{ fontSize: 12, color: "#6B7280", display: "flex", gap: 4, alignItems: "center" }}><Mail size={11} />{func.email}</span>}
                {func.phone && <span style={{ fontSize: 12, color: "#6B7280", display: "flex", gap: 4, alignItems: "center" }}><Phone size={11} />{func.phone}</span>}
                {func.pixKey && <span style={{ fontSize: 12, color: "#6B7280" }}>PIX: <b>{func.pixKey}</b></span>}
                {func.hasPayslip && <span style={{ fontSize: 12, color: "#059669" }}>Contracheque: <b>Sim</b></span>}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card style={{ marginBottom: 20, padding: 22 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#111", marginBottom: 14 }}>Novo Vale (Adiantamento)</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div><Lbl>DATA</Lbl><input type="date" value={dt} onChange={e => setDt(e.target.value)} style={{ ...inpBase, width: 140 }} /></div>
          <div><Lbl>VALOR (R$)</Lbl><input type="text" value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLancar()} placeholder="0,00" style={{ ...inpBase, width: 120 }} /></div>
          <div style={{ marginTop: 21 }}><Btn onClick={handleLancar} disabled={!val}><Plus size={14} /> Lançar Vale</Btn></div>
        </div>
      </Card>

      {grouped.map(mData => (
        <Card key={mData.month} style={{ marginBottom: 14, padding: 0 }}>
          <div style={{ padding: "14px 18px", background: "#FAFAFA", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: "#111" }}>{MONTHS[parseInt(mData.month.split("-")[1]) - 1]} / {mData.month.split("-")[0]}</span>
            <div style={{ display: "flex", gap: 16, fontSize: 13, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ color: "#6B7280", display: "flex", alignItems: "center", gap: 6 }}>Vales: <b style={{color: "#D97706"}}>{BRL(mData.valesTotal)}</b></span>
              <InlineConsumo value={mData.consumo} onSave={v => onUpdateFolhaExtra(mData.key, { consumo: v })} />
            </div>
          </div>
          {mData.valesList.length > 0 ? (
            <div className="table-responsive">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ background: "#F9FAFB" }}>{["Data", "Vale (R$)", ""].map(h => (<th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: .5 }}>{h}</th>))}</tr></thead>
                <tbody>
                  {[...mData.valesList].sort((a,b) => b.date.localeCompare(a.date)).map(e => (
                    <tr key={e.id} style={{ borderTop: "1px solid #F3F4F6" }}>
                      <td style={{ padding: "10px 16px", color: "#374151", whiteSpace: "nowrap" }}>{fmtD(e.date)}</td>
                      <td style={{ padding: "10px 16px", fontWeight: 800, color: "#D97706" }}>{BRL(e.value)}</td>
                      <td style={{ padding: "10px 16px", textAlign: "right" }}><button onClick={() => { if(window.confirm("Excluir vale?")) onDeleteEntry(func.id, e.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: 4, borderRadius: 6 }}><Trash2 size={13} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: "16px", textAlign: "center", color: "#9CA3AF", fontSize: 12 }}>Nenhum vale registrado neste mês.</div>
          )}
        </Card>
      ))}
    </div>
  );
}

/* ─── Modais ─── */
function FuncionarioModal({ data, isEdit, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(
    isEdit ? data : { name: "", salary: "", email: "", phone: "", hasPayslip: true, pixKey: "", active: true }
  );
  const canDelete = isEdit && data.entries && data.entries.length === 0;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,20,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, backdropFilter: "blur(6px)", padding: 16 }}>
      <Card style={{ width: "100%", maxWidth: 420, padding: 28, animation: "toastIn .2s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#111" }}>{isEdit ? "Editar Funcionário" : "Novo Funcionário"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}><X size={20} /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
          <div><Lbl>NOME DO FUNCIONÁRIO *</Lbl><Inp value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Ex: João da Silva" /></div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}><Lbl>E-MAIL</Lbl><Inp type="email" value={form.email || ""} onChange={v => setForm({ ...form, email: v })} placeholder="email@empresa.com" /></div>
            <div style={{ flex: 1 }}><Lbl>TELEFONE</Lbl><Inp value={form.phone || ""} onChange={v => setForm({ ...form, phone: v })} placeholder="(00) 00000-0000" /></div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}><Lbl>SALÁRIO BASE (R$) *</Lbl><Inp type="number" value={form.salary} onChange={v => setForm({ ...form, salary: v })} placeholder="1500" /></div>
            <div style={{ flex: 1 }}><Lbl>CHAVE PIX</Lbl><Inp value={form.pixKey} onChange={v => setForm({ ...form, pixKey: v })} placeholder="CPF, E-mail ou Telefone" /></div>
          </div>
          
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Lbl>POSSUI CONTRACHEQUE?</Lbl>
              <select value={form.hasPayslip ? "SIM" : "NAO"} onChange={e => setForm({...form, hasPayslip: e.target.value === "SIM"})} style={{ ...inpBase, width: "100%", padding: "10px", fontWeight: 700 }}>
                <option value="SIM">Sim</option><option value="NAO">Não</option>
              </select>
            </div>
          </div>
        </div>

        {isEdit && (
          <div style={{ marginBottom: 20 }}>
            <Lbl>STATUS DO FUNCIONÁRIO</Lbl>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setForm({ ...form, active: true })} style={{ flex: 1, padding: "10px 8px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit", border: `2px solid ${form.active ? "#059669" : "#E5E7EB"}`, background: form.active ? "#D1FAE5" : "#FAFAFA", color: form.active ? "#059669" : "#6B7280" }}>Ativo</button>
              <button onClick={() => setForm({ ...form, active: false })} style={{ flex: 1, padding: "10px 8px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit", border: `2px solid ${!form.active ? "#DC2626" : "#E5E7EB"}`, background: !form.active ? "#FEE2E2" : "#FAFAFA", color: !form.active ? "#DC2626" : "#6B7280" }}>Inativo</button>
            </div>
          </div>
        )}
        
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          {isEdit && (
            canDelete ? (
              <button onClick={() => { if(window.confirm("Excluir definitivamente?")) onDelete(form.id); }} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", padding: 8, display: "flex", alignItems: "center", gap: 4, fontWeight: 700, fontSize: 12, fontFamily: "inherit" }}><Trash2 size={16} /> Excluir</button>
            ) : (
              <span style={{ fontSize: 10, color: "#9CA3AF", maxWidth: 120, lineHeight: 1.2 }}>Exclusão bloqueada (possui histórico)</span>
            )
          )}
          <div style={{ flex: 1, minWidth: "100%", display: "flex", gap: 10, marginTop: 10 }}>
            <Btn onClick={onClose} variant="secondary" style={{ flex: 1 }}>Cancelar</Btn>
            <Btn onClick={() => onSave(form)} disabled={!form.name || !form.salary} style={{ flex: 1 }}>Salvar</Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ─── Main App de Salários ─── */
export default function SalarioFuncionario({ token, empresaEmail, empresaNome, onBack, onLogout }) {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (newPath) => {
    window.history.pushState({}, '', newPath);
    setPath(newPath);
  };
  
  const { tab, selId } = useMemo(() => {
    const parts = path.split('/').filter(Boolean);
    if (parts[1] === 'folhas') return { tab: 'folhas', selId: null };
    if (parts[1] === 'funcionario' && parts[2]) return { tab: 'funcionarios', selId: parts[2] };
    return { tab: 'funcionarios', selId: null };
  }, [path]);

  const [funcionarios, setFuncionarios] = useState([]);
  const [folhaStatus, setFolhaStatus] = useState({});

  const [search, setSearch] = useState("");
  const [showActive, setShowActive] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [editingFuncionario, setEditingFuncionario] = useState(null);
  const [showNewFuncionarioModal, setShowNewFuncionarioModal] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => setToast({ msg, type });

  const fetchAPI = async (endpoint, options = {}) => {
    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...(options.headers || {}) } });
    if (res.status === 401) { onLogout(); throw new Error("Sessão expirada"); }
    return res;
  };

  useEffect(() => {
    Promise.all([fetchAPI('/funcionarios').then(r => r.json()), fetchAPI('/folhaextras').then(r => r.json())])
      .then(([funcsDb, extrasDb]) => { setFuncionarios(funcsDb || []); setFolhaStatus(extrasDb || {}); })
      .catch(err => { if (err.message !== "Sessão expirada") showToast("Erro ao carregar banco de dados", "error"); });
  }, [token]);

  const funcData = useMemo(() => funcionarios.find(f => f.id === selId), [selId, funcionarios]);

  /* ── Derived Data ── */
  const filteredFuncs = useMemo(() => {
    return funcionarios.filter(f => {
      const match = f.name.toLowerCase().includes(search.toLowerCase());
      const isAct = f.active !== false;
      return match && ((showActive && isAct) || (showInactive && !isAct));
    });
  }, [funcionarios, search, showActive, showInactive]);

  const { groupedFolhas, totalBrutoGeral, totalValesGeral, totalLiquidoGeral, valesMesAtual, consumosAtivos } = useMemo(() => {
    const currentMonth = mkKey(todayStr());
    const monthsSet = new Set([currentMonth]);
    funcionarios.forEach(f => (f.entries || []).forEach(e => monthsSet.add(mkKey(e.date))));
    Object.keys(folhaStatus).forEach(k => monthsSet.add(k.split("_")[1]));
    
    const sortedMonths = Array.from(monthsSet).sort().reverse();
    const grouped = {};
    let tB = 0, tV = 0, tL = 0;
    const vMes = [];
    const cAtivos = [];

    sortedMonths.forEach(month => {
      const funcFolhas = [];
      funcionarios.forEach(f => {
        const isAct = f.active !== false;
        const monthEntries = (f.entries || []).filter(e => mkKey(e.date) === month);
        const fExtra = folhaStatus[`${f.id}_${month}`] || {};
        const consumo = fExtra.consumo || 0;
        
        if (isAct || monthEntries.length > 0 || consumo > 0 || fExtra.status) {
          const vales = monthEntries.reduce((s, x) => s + x.value, 0);
          const base = Number(f.salary) || 0;
          const liquido = base - vales - consumo;
          
          tB += base; tV += vales; tL += liquido;
          
          funcFolhas.push({
            ...f, base, vales, consumos: consumo, liquido, 
            key: `${f.id}_${month}`,
            status: fExtra.status || "PENDENTE"
          });

          if (month === currentMonth) {
            monthEntries.forEach(e => {
              vMes.push({ id: e.id, funcName: f.name, date: e.date, value: e.value });
            });
            if (consumo > 0 && isAct) {
              cAtivos.push({ id: f.id, funcName: f.name, value: consumo });
            }
          }
        }
      });
      grouped[month] = funcFolhas.sort((a,b) => a.name.localeCompare(b.name));
    });

    vMes.sort((a, b) => b.date.localeCompare(a.date));
    cAtivos.sort((a, b) => a.funcName.localeCompare(b.funcName));

    return { groupedFolhas: grouped, totalBrutoGeral: tB, totalValesGeral: tV, totalLiquidoGeral: tL, valesMesAtual: vMes, consumosAtivos: cAtivos };
  }, [funcionarios, folhaStatus]);

  /* ── Actions ── */
  const handleSaveFunc = async (data) => {
    const payload = { ...data, salary: Number(data.salary) };
    delete payload.consumo; // Removido campo estático antigo
    if (data.id) {
      try {
        await fetchAPI(`/funcionarios/${data.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        setFuncionarios(p => p.map(f => f.id === data.id ? { ...f, ...payload } : f));
        showToast("Funcionário atualizado!");
      } catch (err) { showToast("Erro ao atualizar", "error"); }
    } else {
      try {
        const newFunc = { ...payload, id: uid(), active: true, entries: [] };
        await fetchAPI('/funcionarios', { method: 'POST', body: JSON.stringify(newFunc) });
        setFuncionarios(p => [...p, newFunc]);
        showToast("Funcionário criado!");
      } catch (err) { showToast("Erro ao criar", "error"); }
    }
    setEditingFuncionario(null);
    setShowNewFuncionarioModal(false);
  };

  const handleDeleteFunc = async (id) => {
    try {
      await fetchAPI(`/funcionarios/${id}`, { method: 'DELETE' });
      setFuncionarios(p => p.filter(f => f.id !== id));
      showToast("Funcionário excluído!");
      setEditingFuncionario(null);
    } catch (err) { showToast("Erro ao excluir", "error"); }
  };

  const handleAddEntry = async (funcId, date, value) => {
    const newEntry = { id: uid(), date, value };
    try {
      await fetchAPI(`/funcionarios/${funcId}/entries`, { method: 'POST', body: JSON.stringify(newEntry) });
      setFuncionarios(p => p.map(f => f.id === funcId ? { ...f, entries: [...(f.entries || []), newEntry] } : f));
      showToast("Lançamento salvo!");
    } catch (err) { showToast("Erro ao lançar", "error"); }
  };

  const handleDeleteEntry = async (funcId, entryId) => {
    try {
      await fetchAPI(`/funcionarios/${funcId}/entries/${entryId}`, { method: 'DELETE' });
      setFuncionarios(p => p.map(f => f.id === funcId ? { ...f, entries: (f.entries || []).filter(e => e.id !== entryId) } : f));
      showToast("Lançamento excluído!");
    } catch (err) { showToast("Erro ao excluir", "error"); }
  };

  const handleUpdateFolhaExtra = async (key, data) => {
    try {
      await fetchAPI(`/folhaextras/${key}`, { method: 'POST', body: JSON.stringify(data) });
      setFolhaStatus(p => ({ ...p, [key]: { ...(p[key] || {}), ...data } }));
      if (data.consumo !== undefined) showToast("Consumo alterado!");
    } catch (err) { showToast("Erro ao atualizar", "error"); }
  };

  const exportXLSX = (monthKey, fList) => {
    const monthName = MONTHS[parseInt(monthKey.split("-")[1]) - 1];
    const year = monthKey.split("-")[0];
    const wb = XLSX.utils.book_new();
    
    const rows = [
      ["Mês/Ano", `${monthName}/${year}`],
      [],
      ["Funcionário", "PIX", "Salário Bruto (R$)", "Vales Retirados (R$)", "Consumos (R$)", "Líquido a Pagar (R$)", "Status"]
    ];

    fList.forEach(f => {
      rows.push([f.name, f.pixKey || "Sem PIX", f.base, f.vales, f.consumos, f.liquido, f.status]);
    });

    const totalLiquido = fList.reduce((s, x) => s + x.liquido, 0);
    rows.push(["", "", "", "", "TOTAL LÍQUIDO", totalLiquido, ""]);

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Folha");
    XLSX.writeFile(wb, `Folha-Pagamento-${monthKey}.xlsx`);
  };

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:"#F4F3F0",minHeight:"100vh",color:"#111827"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;0,9..40,900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes toastIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
        select, button { font-family: inherit; } input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.6; }
        .app-header { position: sticky; top: 0; z-index: 100; background: rgba(255,255,255,.92); backdrop-filter: blur(14px); border-bottom: 1px solid #EBEBEB; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        @media (max-width: 600px) { .app-header { flex-direction: column; align-items: flex-start; padding: 16px; } .header-actions { width: 100%; justify-content: space-between; margin-top: 8px; } }
        .summary-grid { display: grid; gap: 16px; grid-template-columns: 1fr 1fr; }
        .top-dashboard-container { display: grid; gap: 16px; grid-template-columns: 1fr; }
        @media (min-width: 1024px) { .top-dashboard-container { grid-template-columns: 2fr 1.2fr; } }
        .table-responsive { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; } .table-responsive table { min-width: 700px; } 
        .search-bar-container { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
        .search-input-wrapper { position: relative; flex: 1; min-width: 250px; }
      `}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      
      {/* ── HEADER ── */}
      <header className="app-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Btn onClick={onBack} variant="secondary" style={{ padding: "8px 12px", marginRight: 8 }}><ArrowLeft size={15} /> Menu</Btn>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: "linear-gradient(135deg,#059669,#10B981)", display: "flex", alignItems: "center", justifyContent: "center" }}><Wallet size={18} color="#fff" /></div>
          <div><div style={{ fontSize: 16, fontWeight: 900, color: "#111", lineHeight: 1.1 }}>Folha de Pagamento</div><div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Controle de salários e vales</div></div>
        </div>
        <div className="header-actions" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {selId ? <Btn onClick={() => navigate('/salario')} variant="secondary"><ArrowLeft size={15} /> Voltar</Btn> : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 10, fontSize: 12, fontWeight: 700, color: "#6B7280" }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <User size={12} color="#4B5563" />
                </div>
                {empresaNome || empresaEmail}
              </div>
              <Btn onClick={() => setShowNewFuncionarioModal(true)}><Plus size={15} /> Novo Funcionário</Btn>
              <button onClick={onLogout} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: 8 }} title="Sair"><LogOut size={18} /></button>
            </>
          )}
        </div>
      </header>

      <main style={{padding:24,maxWidth:1400,margin:"0 auto"}}>
      {selId && funcData ? (
        <FuncionarioDetail func={funcData} folhaStatus={folhaStatus} onAddEntry={handleAddEntry} onDeleteEntry={handleDeleteEntry} onUpdateFolhaExtra={handleUpdateFolhaExtra} onOpenEdit={() => setEditingFuncionario(funcData)} />
      ) : (
        <>
        {/* ── DASHBOARD INDICATORS & TABS ── */}
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", marginBottom: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Card style={{background:"linear-gradient(135deg,#059669,#10B981)",color:"#fff",padding:22, textAlign:"center", flex: 1, display:"flex",flexDirection:"column",justifyContent:"center"}}>
              <div style={{fontSize:11,fontWeight:800,opacity:.8,letterSpacing:.7,marginBottom:8}}>LÍQUIDO GLOBAL A PAGAR</div>
              <div style={{fontSize:32,fontWeight:900}}>{BRL(totalLiquidoGeral)}</div>
            </Card>
            <Card style={{padding:22, textAlign:"center", flex: 1, display:"flex",flexDirection:"column",justifyContent:"center"}}>
              <div style={{fontSize:11,fontWeight:800,color:"#6B7280",letterSpacing:.7,marginBottom:8}}>FUNCIONÁRIOS ATIVOS</div>
              <div style={{fontSize:28,fontWeight:900,color:"#111"}}>{funcionarios.filter(f=>f.active).length}</div>
            </Card>
          </div>

          <Card style={{ padding: 20, display: "flex", flexDirection: "column", height: 260 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#6B7280", letterSpacing: .7, marginBottom: 14, textTransform: "uppercase" }}>Vales Lançados (Mês Atual)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, overflowY: "auto", paddingRight: 6 }}>
              {valesMesAtual.length === 0 ? (
                <div style={{ fontSize: 12, color: "#9CA3AF", textAlign: "center", padding: "20px 0" }}>Nenhum vale recente</div>
              ) : (
                valesMesAtual.map(v => (
                  <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8, borderBottom: "1px solid #F3F4F6", fontSize: 13 }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}><div style={{ fontWeight: 800, color: "#111" }}>{v.funcName}</div><div style={{ color: "#9CA3AF", fontSize: 11, marginTop: 1 }}>{fmtD(v.date)}</div></div>
                    <div style={{ fontWeight: 900, color: "#D97706", whiteSpace: "nowrap" }}>{BRL(v.value)}</div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card style={{ padding: 20, display: "flex", flexDirection: "column", height: 260 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#6B7280", letterSpacing: .7, marginBottom: 14, textTransform: "uppercase" }}>Consumo por Funcionário</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, overflowY: "auto", paddingRight: 6 }}>
              {consumosAtivos.length === 0 ? (
                <div style={{ fontSize: 12, color: "#9CA3AF", textAlign: "center", padding: "20px 0" }}>Nenhum consumo registrado</div>
              ) : (
                consumosAtivos.map(c => (
                  <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8, borderBottom: "1px solid #F3F4F6", fontSize: 13 }}>
                    <div style={{ fontWeight: 800, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.funcName}</div>
                    <div style={{ fontWeight: 900, color: "#4F46E5", whiteSpace: "nowrap" }}>{BRL(c.value)}</div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* ── ABAS NAVEGAÇÃO ── */}
        <div style={{ display:"inline-flex",gap:2,background:"#E5E7EB",borderRadius:12,padding:4,marginBottom:20 }}>
          {[{id:"funcionarios",label:"Funcionários",Icon:Users},{id:"folhas", label:"Folha de Pagamento", Icon:FileText}].map(t=>(
            <button key={t.id} onClick={()=>navigate(`/salario${t.id === 'folhas' ? '/folhas' : ''}`)} style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 18px",borderRadius:9,border:"none",fontFamily:"inherit",fontSize:13,fontWeight:800,cursor:"pointer",background:tab===t.id?"#fff":"transparent",color:tab===t.id?"#111":"#6B7280",boxShadow:tab===t.id?"0 1px 4px rgba(0,0,0,.1)":"none",transition:"all .15s" }}><t.Icon size={14}/>{t.label}</button>
          ))}
        </div>

        {/* ── CONTEÚDO DAS ABAS ── */}
        {tab === "funcionarios" ? (
          <div>
            {/* Filtros */}
            <div className="search-bar-container">
              <div className="search-input-wrapper">
                <Search size={15} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#9CA3AF"}}/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar funcionário..." style={{ width:"100%",padding:"11px 12px 11px 36px",borderRadius:12,border:"1px solid #E5E7EB",fontSize:14,background:"#fff",fontFamily:"inherit",outline:"none" }}/>
              </div>
              <div style={{display:"flex", gap: 6}}>
                <Btn variant={showActive ? "primary" : "secondary"} onClick={() => setShowActive(!showActive)} style={{padding: "10px 14px", fontSize: 12}}>Ativos</Btn>
                <Btn variant={showInactive ? "primary" : "secondary"} onClick={() => setShowInactive(!showInactive)} style={{padding: "10px 14px", fontSize: 12}}>Inativos</Btn>
              </div>
            </div>

            {/* Tabela de Funcionários */}
            <Card style={{padding:0}}>
              <div className="table-responsive">
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr style={{background:"#F9FAFB"}}>
                      <th style={{padding:"11px 16px 11px 20px",textAlign:"left",fontSize:10,fontWeight:800,color:"#9CA3AF",letterSpacing:.6}}>FUNCIONÁRIO</th>
                      <th style={{padding:"11px 16px",textAlign:"left",fontSize:10,fontWeight:800,color:"#9CA3AF",letterSpacing:.6}}>SALÁRIO BASE</th>
                      <th style={{padding:"11px 16px",textAlign:"left",fontSize:10,fontWeight:800,color:"#9CA3AF",letterSpacing:.6}}>LANÇAR VALE (DATA E VALOR)</th>
                      <th style={{padding:"11px 16px",textAlign:"center",fontSize:10,fontWeight:800,color:"#9CA3AF",letterSpacing:.6}}>DETALHE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFuncs.map((f, idx) => (
                      <tr key={f.id} style={{ borderTop: "1px solid #F3F4F6", background: idx % 2 === 0 ? "#fff" : "#FAFAFA", opacity: f.active ? 1 : 0.6 }}>
                        <td style={{padding:"16px 16px 16px 20px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <div style={{ width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#059669,#10B981)",display:"flex",alignItems:"center",justifyContent:"center", color:"#fff", fontWeight: 900, flexShrink:0 }}>{f.name.charAt(0)}</div>
                            <div>
                              <div style={{fontWeight: 900, color: "#111", fontSize: 14}}>{f.name} {!f.active && <span style={{fontSize:10,color:"#DC2626",fontWeight:800,marginLeft:4}}>(Inativo)</span>}</div>
                              {f.phone && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>{f.phone}</div>}
                              <div style={{display:"flex", gap:6, marginTop:6, alignItems: "center"}}>
                                {f.hasPayslip && <FileText size={14} color="#059669" title="Possui Contracheque" />}
                                {f.pixKey ? (
                                  <span style={{fontSize: 11, color: "#6B7280", background: "#F3F4F6", padding: "2px 6px", borderRadius: 4}}>PIX: <b>{f.pixKey}</b></span>
                                ) : (
                                  <span style={{fontSize: 11, color: "#DC2626", background: "#FEE2E2", padding: "2px 6px", borderRadius: 4, display: "flex", alignItems: "center", gap: 3}} title="Sem chave PIX cadastrada"><AlertCircle size={11} /> Sem PIX</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{padding:"12px 16px", fontWeight: 800, color: "#374151"}}>{BRL(f.salary)}</td>
                        <td style={{padding:"12px 16px"}}><InlineRowInputs funcId={f.id} onAddEntry={handleAddEntry} /></td>
                        <td style={{padding:"12px 16px", textAlign: "center"}}>
                          <button onClick={() => navigate(`/salario/funcionario/${f.id}`)} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, border: "1px solid #E5E7EB", background: "#fff", color: "#059669", cursor: "pointer", fontFamily: "inherit" }}>Ver <ChevronRight size={12} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        ) : (
          /* Aba Folha de Pagamento */
          <div>
            {Object.keys(groupedFolhas).sort((a, b) => b.localeCompare(a)).map(monthKey => {
              const monthName = MONTHS[parseInt(monthKey.split("-")[1]) - 1];
              const year = monthKey.split("-")[0];
              const fList = groupedFolhas[monthKey];
              const monthTotalLiquido = fList.reduce((s, x) => s + x.liquido, 0);

              return (
                <div key={monthKey} style={{ marginBottom: 40 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #E5E7EB", paddingBottom: 8, marginBottom: 20 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 900, color: "#111", margin: 0 }}>
                      {monthName} de {year}
                    </h2>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <span style={{fontSize: 16, fontWeight: 900, color: "#059669"}}>Total: {BRL(monthTotalLiquido)}</span>
                      <Btn variant="success" onClick={() => exportXLSX(monthKey, fList)} style={{ padding: "6px 12px", fontSize: 12 }}><Download size={14} /> XLSX</Btn>
                    </div>
                  </div>
                  
                  <Card style={{ padding: 0, borderLeft: "4px solid #059669" }}>
                    <div className="table-responsive">
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: "#FAFAFA", borderBottom: "2px solid #E5E7EB" }}>
                            {["FUNCIONÁRIO", "SALÁRIO BRUTO", "VALES RETIRADOS", "CONSUMOS", "LÍQUIDO A PAGAR", "STATUS"].map((h) => (
                              <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 10, fontWeight: 800, color: "#9CA3AF", letterSpacing: .5, whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {fList.map(f => (
                            <tr key={f.key} style={{ borderTop: "1px solid #F3F4F6" }}>
                              <td style={{ padding: "12px 16px" }}>
                                <div style={{fontWeight: 800, color: "#111"}}>{f.name}</div>
                                {(f.email || f.phone) && <div style={{fontSize: 10, color: "#6B7280", marginTop: 2}}>{[f.email, f.phone].filter(Boolean).join(' / ')}</div>}
                                {f.pixKey ? <div style={{fontSize: 10, color: "#6B7280", marginTop: 2}}>PIX: {f.pixKey}</div> : <div style={{fontSize: 10, color: "#DC2626", marginTop: 2, display: "flex", alignItems: "center", gap: 3}}><AlertCircle size={10} /> Sem PIX</div>}
                              </td>
                              <td style={{ padding: "12px 16px", color: "#6B7280" }}>{BRL(f.base)}</td>
                              <td style={{ padding: "12px 16px", fontWeight: 700, color: f.vales > 0 ? "#D97706" : "#9CA3AF" }}>{f.vales > 0 ? `- ${BRL(f.vales)}` : "R$ 0,00"}</td>
                              <td style={{ padding: "12px 16px", fontWeight: 700, color: f.consumos > 0 ? "#4F46E5" : "#9CA3AF" }}>{f.consumos > 0 ? `- ${BRL(f.consumos)}` : "R$ 0,00"}</td>
                              <td style={{ padding: "12px 16px", fontWeight: 900, color: "#059669", fontSize: 14 }}>{BRL(f.liquido)}</td>
                              <td style={{ padding: "12px 16px" }}><StatusSel value={f.status} onChange={v => handleUpdateFolhaExtra(f.key, { status: v })} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
        </>
      )}
      </main>

      {showNewFuncionarioModal && (
        <FuncionarioModal 
          isEdit={false}
          onSave={handleSaveFunc} 
          onClose={() => setShowNewFuncionarioModal(false)} 
        />
      )}
      {editingFuncionario && (
        <FuncionarioModal
          isEdit={true}
          data={editingFuncionario}
          onSave={handleSaveFunc}
          onDelete={handleDeleteFunc}
          onClose={() => setEditingFuncionario(null)}
        />
      )}
      <AppFooter/>
    </div>
  );
}