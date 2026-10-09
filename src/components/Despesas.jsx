import { useState, useMemo, useEffect } from "react";
import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { LogOut, Search, Plus, Edit, Trash2, X, Truck, User, Mail, Phone, MapPin, Download, Loader2, Tag, KeyRound, FileText, Building2, Receipt, Wallet, Check } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import AppFooter from "./AppFooter";
import { API_URL } from "../config";
import useLockBodyScroll from "../hooks/useLockBodyScroll";
import AppHeader from "./AppHeader";


/* ─── Constants & Helpers ─── */
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const STATUS_CFG = {
  PENDENTE: { color: "#D97706", bg: "#FEF3C7" },
  PAGA: { color: "#15803D", bg: "#DCFCE7" },
};
const CATEGORIAS = ["Alimentos", "Bebidas", "Hortifruti", "Carnes", "Limpeza", "Embalagens", "Gás", "Serviços", "Manutenção", "Outros"];
const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

const BRL = (n) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
const fmtD = (d) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
const todayStr = () => new Date().toISOString().slice(0, 10);
const mkKey = (d) => d.slice(0, 7);
const mLabel = (k) => { const [y, m] = k.split("-"); return `${MONTHS[+m - 1]}/${y}`; };
let _uid = Date.now();
const uid = () => String(++_uid);

const digits = (v) => String(v || "").replace(/\D/g, "");
const fmtCNPJ = (v) => {
  const d = digits(v).slice(0, 14);
  return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
};
const fmtPhone = (v) => {
  const d = digits(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
};
const fmtCEP = (v) => digits(v).slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");

const isValidCNPJ = (v) => {
  const c = digits(v);
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const calc = (len) => {
    const w = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = w.reduce((s, n, i) => s + n * +c[i], 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === +c[12] && calc(13) === +c[13];
};

const EMPTY_ADDRESS = { cep: "", street: "", number: "", complement: "", district: "", city: "", uf: "" };
const fmtAddress = (a = {}) => {
  const l1 = [a.street, a.number].filter(Boolean).join(", ") + (a.complement ? ` - ${a.complement}` : "");
  const l2 = [a.district, [a.city, a.uf].filter(Boolean).join("/")].filter(Boolean).join(" - ");
  return [l1, l2, a.cep ? `CEP ${a.cep}` : ""].filter(Boolean).join(" · ");
};

/* ─── Shared UI ─── */
function Chip({ children, color = "#C2410C", bg = "#FFEDD5", style = {} }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 800, color, background: bg, padding: "2px 8px", borderRadius: 99, letterSpacing: .4, whiteSpace: "nowrap", ...style }}>{children}</span>;
}

function Card({ children, style = {} }) {
  return <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,.08)", ...style }}>{children}</div>;
}

function Btn({ children, onClick, disabled = false, variant = "primary", style = {} }) {
  const themes = {
    primary: { background: "linear-gradient(135deg,#EA580C,#F97316)", color: "#fff", border: "none" },
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

function Lbl({ children }) { return <div style={{ fontSize: 11, fontWeight: 800, color: "#6B7280", letterSpacing: .6, marginBottom: 6 }}>{children}</div>; }
function Inp({ value, onChange, placeholder, type = "text", style = {}, ...rest }) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 14, background: "#fff", outline: "none", fontFamily: "inherit", color: "#111827", ...style }} {...rest} />;
}
const selBase = { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 14, background: "#fff", outline: "none", fontFamily: "inherit", color: "#111827", cursor: "pointer" };
const filterSelStyle = { padding: "9px 12px", borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 13, background: "#fff", fontFamily: "inherit", cursor: "pointer", fontWeight: 600, color: "#374151" };
const inpBase = { boxSizing: "border-box", padding: "7px 10px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13, background: "#FAFAFA", outline: "none", fontFamily: "inherit", color: "#111827" };

function StatusSel({ value, onChange }) {
  const s = STATUS_CFG[value] || STATUS_CFG.PENDENTE;
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ background: s.bg, color: s.color, border: "none", borderRadius: 99, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", outline: "none" }}>
      {Object.keys(STATUS_CFG).map(k => <option key={k} value={k}>{k}</option>)}
    </select>
  );
}

function MethodSel({ value, formas, onChange }) {
  return (
    <select value={value || ""} onChange={e => onChange(e.target.value)} style={{ padding: "4px 10px", borderRadius: 99, border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", outline: "none", background: "#F3F4F6", color: "#374151" }}>
      {!formas.some(f => f.id === value) && <option value={value || ""}>—</option>}
      {formas.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
    </select>
  );
}

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, []);
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, background: type === "error" ? "#FEE2E2" : "#DCFCE7", color: type === "error" ? "#DC2626" : "#15803D", padding: "12px 18px", borderRadius: 12, fontWeight: 700, fontSize: 13, boxShadow: "0 4px 20px rgba(0,0,0,.15)", animation: "toastIn .3s ease" }}>
      {msg}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, minHeight: "60vh", gap: 16 }}>
      <Loader2 size={48} color="#EA580C" style={{ animation: "spin 1.2s linear infinite" }} />
      <div style={{ fontSize: 16, fontWeight: 700, color: "#EA580C" }}>A carregar informações...</div>
    </div>
  );
}

const Overlay = ({ children }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,20,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, backdropFilter: "blur(6px)", padding: 16 }}>{children}</div>
);

/* ─── Modal de Cadastro / Edição ─── */
function FornecedorModal({ data, isEdit, existing, onClose, onSave, onDelete }) {
  useLockBodyScroll();
  const [form, setForm] = useState(() => isEdit
    ? { ...data, address: { ...EMPTY_ADDRESS, ...(data.address || {}) } }
    : { name: "", tradeName: "", cnpj: "", email: "", phone: "", category: "", pixKey: "", notes: "", address: { ...EMPTY_ADDRESS }, active: true });
  const [busca, setBusca] = useState(null); // "cnpj" | "cep" | null
  const [aviso, setAviso] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setAddr = (k, v) => setForm(f => ({ ...f, address: { ...f.address, [k]: v } }));

  const cnpjDigits = digits(form.cnpj);
  const cnpjInvalido = cnpjDigits.length > 0 && !isValidCNPJ(form.cnpj);
  const cnpjDuplicado = cnpjDigits.length === 14 && existing.some(f => f.id !== form.id && digits(f.cnpj) === cnpjDigits);
  const podeSalvar = form.name.trim() && !cnpjInvalido && !cnpjDuplicado;

  const buscarCNPJ = async () => {
    if (!isValidCNPJ(form.cnpj)) return;
    setBusca("cnpj"); setAviso("");
    try {
      const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjDigits}`);
      if (!r.ok) throw new Error();
      const d = await r.json();
      setForm(f => ({
        ...f,
        name: d.razao_social || f.name,
        tradeName: d.nome_fantasia || f.tradeName,
        email: f.email || (d.email || "").toLowerCase(),
        phone: f.phone || fmtPhone(d.ddd_telefone_1),
        address: {
          cep: fmtCEP(d.cep) || f.address.cep,
          street: [d.descricao_tipo_de_logradouro, d.logradouro].filter(Boolean).join(" ") || f.address.street,
          number: d.numero || f.address.number,
          complement: d.complemento || f.address.complement,
          district: d.bairro || f.address.district,
          city: d.municipio || f.address.city,
          uf: d.uf || f.address.uf,
        },
      }));
    } catch {
      setAviso("Não foi possível consultar este CNPJ. Preencha os dados manualmente.");
    } finally { setBusca(null); }
  };

  const buscarCEP = async (cep) => {
    if (digits(cep).length !== 8) return;
    setBusca("cep"); setAviso("");
    try {
      const r = await fetch(`https://viacep.com.br/ws/${digits(cep)}/json/`);
      const d = await r.json();
      if (d.erro) throw new Error();
      setForm(f => ({ ...f, address: { ...f.address, street: d.logradouro || f.address.street, district: d.bairro || f.address.district, city: d.localidade || f.address.city, uf: d.uf || f.address.uf } }));
    } catch {
      setAviso("CEP não encontrado. Preencha o endereço manualmente.");
    } finally { setBusca(null); }
  };

  const row = { display: "flex", gap: 12, flexWrap: "wrap" };
  const col = (flex, min = 140) => ({ flex, minWidth: min });

  return (
    <Overlay>
      <Card style={{ width: "100%", maxWidth: 600, padding: 28, animation: "toastIn .2s ease", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#111" }}>{isEdit ? "Editar Fornecedor" : "Novo Fornecedor"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 4 }}><X size={20} /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
          <div>
            <Lbl>CNPJ</Lbl>
            <div style={{ display: "flex", gap: 8 }}>
              <Inp value={form.cnpj} onChange={v => set("cnpj", fmtCNPJ(v))} placeholder="00.000.000/0000-00" style={{ borderColor: cnpjInvalido || cnpjDuplicado ? "#FCA5A5" : "#E5E7EB" }} />
              <Btn variant="secondary" onClick={buscarCNPJ} disabled={!isValidCNPJ(form.cnpj) || busca === "cnpj"} style={{ whiteSpace: "nowrap", padding: "8px 14px" }}>
                {busca === "cnpj" ? <Loader2 size={14} style={{ animation: "spin 1.2s linear infinite" }} /> : <Search size={14} />} Buscar dados
              </Btn>
            </div>
            {cnpjInvalido && cnpjDigits.length === 14 && <div style={{ fontSize: 11, color: "#DC2626", marginTop: 4, fontWeight: 600 }}>CNPJ inválido.</div>}
            {cnpjDuplicado && <div style={{ fontSize: 11, color: "#DC2626", marginTop: 4, fontWeight: 600 }}>Já existe um fornecedor com este CNPJ.</div>}
            {!cnpjInvalido && !cnpjDuplicado && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>Digite o CNPJ e clique em "Buscar dados" para preencher automaticamente.</div>}
          </div>

          <div><Lbl>RAZÃO SOCIAL *</Lbl><Inp value={form.name} onChange={v => set("name", v)} placeholder="Nome registrado da empresa" /></div>
          <div style={row}>
            <div style={col(1)}><Lbl>NOME FANTASIA</Lbl><Inp value={form.tradeName || ""} onChange={v => set("tradeName", v)} placeholder="Como é conhecido" /></div>
            <div style={col(1)}>
              <Lbl>CATEGORIA</Lbl>
              <select value={form.category || ""} onChange={e => set("category", e.target.value)} style={selBase}>
                <option value="">Selecione...</option>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={row}>
            <div style={col(1)}><Lbl>E-MAIL</Lbl><Inp type="email" value={form.email || ""} onChange={v => set("email", v)} placeholder="contato@fornecedor.com" /></div>
            <div style={col(1)}><Lbl>TELEFONE</Lbl><Inp value={form.phone || ""} onChange={v => set("phone", fmtPhone(v))} placeholder="(00) 00000-0000" /></div>
          </div>
          <div><Lbl>CHAVE PIX</Lbl><Inp value={form.pixKey || ""} onChange={v => set("pixKey", v)} placeholder="CNPJ, e-mail, telefone ou chave aleatória" /></div>

          <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 14, fontSize: 12, fontWeight: 800, color: "#111", display: "flex", alignItems: "center", gap: 6 }}><MapPin size={14} color="#EA580C" /> Endereço</div>
          <div style={row}>
            <div style={col(1, 120)}>
              <Lbl>CEP</Lbl>
              <div style={{ position: "relative" }}>
                <Inp value={form.address.cep} onChange={v => { const c = fmtCEP(v); setAddr("cep", c); if (digits(c).length === 8) buscarCEP(c); }} placeholder="00000-000" />
                {busca === "cep" && <Loader2 size={14} color="#9CA3AF" style={{ position: "absolute", right: 10, top: 13, animation: "spin 1.2s linear infinite" }} />}
              </div>
            </div>
            <div style={col(3, 200)}><Lbl>LOGRADOURO</Lbl><Inp value={form.address.street} onChange={v => setAddr("street", v)} placeholder="Rua, avenida..." /></div>
          </div>
          <div style={row}>
            <div style={col(1, 90)}><Lbl>NÚMERO</Lbl><Inp value={form.address.number} onChange={v => setAddr("number", v)} placeholder="123" /></div>
            <div style={col(2, 160)}><Lbl>COMPLEMENTO</Lbl><Inp value={form.address.complement} onChange={v => setAddr("complement", v)} placeholder="Sala, galpão..." /></div>
          </div>
          <div style={row}>
            <div style={col(2, 140)}><Lbl>BAIRRO</Lbl><Inp value={form.address.district} onChange={v => setAddr("district", v)} /></div>
            <div style={col(2, 140)}><Lbl>CIDADE</Lbl><Inp value={form.address.city} onChange={v => setAddr("city", v)} /></div>
            <div style={col(1, 80)}>
              <Lbl>UF</Lbl>
              <select value={form.address.uf} onChange={e => setAddr("uf", e.target.value)} style={selBase}>
                <option value="">--</option>
                {UFS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div>
            <Lbl>OBSERVAÇÕES</Lbl>
            <textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} placeholder="Dias de entrega, pedido mínimo, nome do vendedor..." rows={3} style={{ ...selBase, cursor: "text", resize: "vertical" }} />
          </div>

          {aviso && <div style={{ fontSize: 12, color: "#B45309", background: "#FEF3C7", padding: "8px 12px", borderRadius: 8, fontWeight: 600 }}>{aviso}</div>}
        </div>

        {isEdit && (
          <div style={{ marginBottom: 20 }}>
            <Lbl>STATUS DO FORNECEDOR</Lbl>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => set("active", true)} style={{ flex: 1, padding: "10px 8px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit", border: `2px solid ${form.active !== false ? "#15803D" : "#E5E7EB"}`, background: form.active !== false ? "#DCFCE7" : "#FAFAFA", color: form.active !== false ? "#15803D" : "#6B7280" }}>Ativo</button>
              <button onClick={() => set("active", false)} style={{ flex: 1, padding: "10px 8px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit", border: `2px solid ${form.active === false ? "#DC2626" : "#E5E7EB"}`, background: form.active === false ? "#FEE2E2" : "#FAFAFA", color: form.active === false ? "#DC2626" : "#6B7280" }}>Inativo</button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          {isEdit && ((data.despesas || []).length === 0 ? (
            <button onClick={() => { if (window.confirm("Tem certeza que deseja excluir este fornecedor PERMANENTEMENTE? Esta ação não pode ser desfeita.")) onDelete(form.id); }} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", padding: 8, display: "flex", alignItems: "center", gap: 4, fontWeight: 700, fontSize: 12, fontFamily: "inherit" }}><Trash2 size={16} /> Excluir</button>
          ) : (
            <span style={{ fontSize: 10, color: "#9CA3AF", maxWidth: 120, lineHeight: 1.2 }}>Exclusão bloqueada (possui despesas)</span>
          ))}
          <div style={{ flex: 1, minWidth: "100%", display: "flex", gap: 10, marginTop: 10 }}>
            <Btn onClick={onClose} variant="secondary" style={{ flex: 1 }}>Cancelar</Btn>
            <Btn onClick={() => onSave(form)} disabled={!podeSalvar} style={{ flex: 2 }}>{isEdit ? "Salvar" : "Cadastrar"}</Btn>
          </div>
        </div>
      </Card>
    </Overlay>
  );
}

/* ─── Modal de Detalhes do Fornecedor ─── */
function FornecedorDetailModal({ f, formas, onOpenEdit, onSetDespesa, onDeleteDespesa, onClose }) {
  useLockBodyScroll();
  const [fy, setFy] = useState(() => String(new Date().getFullYear()));
  const [fm, setFm] = useState(() => String(new Date().getMonth() + 1));

  const despesas = useMemo(() => f.despesas || [], [f.despesas]);
  const years = useMemo(() => [...new Set([String(new Date().getFullYear()), ...despesas.map(d => d.date.slice(0, 4))])].sort().reverse(), [despesas]);
  const totalAberto = despesas.filter(d => d.status !== "PAGA").reduce((s, d) => s + d.value, 0);
  const totalGeral = despesas.reduce((s, d) => s + d.value, 0);

  const meses = useMemo(() => {
    const m = {};
    despesas.forEach(d => {
      const [y, mm] = d.date.split("-");
      if (fy !== "all" && y !== fy) return;
      if (fm !== "all" && +mm !== +fm) return;
      (m[mkKey(d.date)] ||= []).push(d);
    });
    return Object.entries(m).sort((a, b) => b[0].localeCompare(a[0]));
  }, [despesas, fy, fm]);

  const address = fmtAddress(f.address);
  const info = [
    { Icon: FileText, value: f.cnpj }, { Icon: Tag, value: f.category }, { Icon: Mail, value: f.email },
    { Icon: Phone, value: f.phone }, { Icon: KeyRound, value: f.pixKey && `PIX: ${f.pixKey}` }, { Icon: MapPin, value: address },
  ].filter(i => i.value);

  return (
    <Overlay>
      <Card style={{ width: "100%", maxWidth: 760, padding: 28, animation: "toastIn .2s ease", maxHeight: "90vh", overflowY: "auto", background: "#F7F7F8" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 4 }} title="Fechar"><X size={20} /></button>
        </div>

        <Card style={{ marginBottom: 20, padding: 22 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", flex: 1, minWidth: 260 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0, background: "linear-gradient(135deg,#EA580C,#F97316)", display: "flex", alignItems: "center", justifyContent: "center" }}><Truck size={24} color="#fff" /></div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#111" }}>{f.name}</div>
                  {f.active === false && <Chip color="#DC2626" bg="#FEE2E2">Inativo</Chip>}
                  <button onClick={onOpenEdit} style={{ display: "flex", alignItems: "center", gap: 4, background: "#F3F4F6", border: "none", padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, color: "#4B5563", cursor: "pointer", fontFamily: "inherit" }}><Edit size={12} /> Editar</button>
                </div>
                {f.tradeName && <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>{f.tradeName}</div>}
                <div style={{ display: "flex", gap: "4px 14px", marginTop: 6, flexWrap: "wrap" }}>
                  {info.map(({ Icon, value }) => <span key={value} style={{ fontSize: 12, color: "#6B7280", display: "flex", gap: 4, alignItems: "center" }}><Icon size={11} />{value}</span>)}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <div style={{ background: "#F3F4F6", borderRadius: 14, padding: "12px 22px", color: "#374151", textAlign: "center" }}>
                <div style={{ fontSize: 10, fontWeight: 800, opacity: .8, letterSpacing: .8 }}>TOTAL GERAL</div>
                <div style={{ fontSize: 22, fontWeight: 900, marginTop: 2 }}>{BRL(totalGeral)}</div>
              </div>
              <div style={{ background: "linear-gradient(135deg,#EA580C,#F97316)", borderRadius: 14, padding: "12px 22px", color: "#fff", textAlign: "center" }}>
                <div style={{ fontSize: 10, fontWeight: 700, opacity: .8, letterSpacing: .8 }}>EM ABERTO</div>
                <div style={{ fontSize: 22, fontWeight: 900, marginTop: 2 }}>{BRL(totalAberto)}</div>
              </div>
            </div>
          </div>
          {f.notes && <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #F3F4F6", fontSize: 12, color: "#6B7280", whiteSpace: "pre-wrap" }}><b>Obs.:</b> {f.notes}</div>}
        </Card>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#111" }}>Despesas</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select value={fy} onChange={e => setFy(e.target.value)} style={filterSelStyle}><option value="all">Todos os anos</option>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
            <select value={fm} onChange={e => setFm(e.target.value)} style={filterSelStyle}><option value="all">Todos os meses</option>{MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}</select>
          </div>
        </div>

        {meses.length === 0 ? (
          <div style={{ border: "2px dashed #E5E7EB", borderRadius: 16, padding: 40, textAlign: "center", color: "#9CA3AF" }}>
            <Receipt size={32} style={{ opacity: .25, marginBottom: 10 }} />
            <div>Nenhuma despesa encontrada para este período</div>
          </div>
        ) : meses.map(([month, list]) => (
          <Card key={month} style={{ marginBottom: 14, padding: 0 }}>
            <div style={{ padding: "14px 18px", background: "#FAFAFA", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#111" }}>{mLabel(month)}</span>
              <span style={{ fontSize: 12, color: "#9CA3AF" }}>{list.length} lanç.</span>
              <span style={{ fontWeight: 800, color: "#EA580C" }}>{BRL(list.reduce((s, d) => s + d.value, 0))}</span>
            </div>
            <div className="table-responsive">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ background: "#F9FAFB" }}>{["Data", "Forma", "Valor", "Status", ""].map(h => (<th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: .5 }}>{h}</th>))}</tr></thead>
                <tbody>
                  {[...list].sort((a, b) => a.date.localeCompare(b.date)).map(d => (
                    <tr key={d.id} style={{ borderTop: "1px solid #F3F4F6" }}>
                      <td style={{ padding: "10px 16px", color: "#374151", whiteSpace: "nowrap" }}>{fmtD(d.date)}</td>
                      <td style={{ padding: "8px 16px" }}><MethodSel value={d.methodId} formas={formas} onChange={v => onSetDespesa(f.id, d.id, { methodId: v })} /></td>
                      <td style={{ padding: "10px 16px", fontWeight: 800, color: "#111", whiteSpace: "nowrap" }}>{BRL(d.value)}</td>
                      <td style={{ padding: "8px 16px" }}><StatusSel value={d.status || "PENDENTE"} onChange={v => onSetDespesa(f.id, d.id, { status: v })} /></td>
                      <td style={{ padding: "10px 16px", textAlign: "right" }}><button onClick={() => { if (window.confirm("Tem certeza que deseja apagar esta despesa?")) onDeleteDespesa(f.id, d.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: 4, borderRadius: 6 }}><Trash2 size={13} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
      </Card>
    </Overlay>
  );
}

/* ─── Modal de Formas de Pagamento ─── */
function FormasModal({ formas, usage, onAdd, onRename, onDelete, onClose }) {
  useLockBodyScroll();
  const [nova, setNova] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");

  const existe = (name, id) => formas.some(f => f.id !== id && f.name.trim().toLowerCase() === name.trim().toLowerCase());
  const add = () => { if (!nova.trim() || existe(nova)) return; onAdd(nova.trim()); setNova(""); };
  const saveEdit = () => { if (!editName.trim() || existe(editName, editId)) return; onRename(editId, editName.trim()); setEditId(null); };

  return (
    <Overlay>
      <Card style={{ width: "100%", maxWidth: 420, padding: 28, animation: "toastIn .2s ease", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#111" }}>Formas de Pagamento</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 4 }}><X size={20} /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {formas.map(f => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: "#FAFAFA", border: "1px solid #F3F4F6" }}>
              {editId === f.id ? (
                <>
                  <Inp value={editName} onChange={setEditName} onKeyDown={e => e.key === "Enter" && saveEdit()} autoFocus style={{ padding: "6px 10px", fontSize: 13 }} />
                  <button onClick={saveEdit} title="Salvar" style={{ background: "none", border: "none", cursor: "pointer", color: "#15803D", padding: 4 }}><Check size={16} /></button>
                  <button onClick={() => setEditId(null)} title="Cancelar" style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 4 }}><X size={16} /></button>
                </>
              ) : (
                <>
                  <Wallet size={14} color="#EA580C" />
                  <div style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>{f.name}</div>
                  <span style={{ fontSize: 11, color: "#9CA3AF" }}>{usage[f.id] || 0} desp.</span>
                  <button onClick={() => { setEditId(f.id); setEditName(f.name); }} title="Renomear" style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280", padding: 4 }}><Edit size={14} /></button>
                  <button onClick={() => onDelete(f.id)} disabled={usage[f.id] > 0 || formas.length <= 1} title={usage[f.id] > 0 ? "Em uso por despesas" : formas.length <= 1 ? "Mantenha pelo menos uma" : "Excluir"} style={{ background: "none", border: "none", cursor: usage[f.id] > 0 || formas.length <= 1 ? "not-allowed" : "pointer", color: "#EF4444", padding: 4, opacity: usage[f.id] > 0 || formas.length <= 1 ? .3 : 1 }}><Trash2 size={14} /></button>
                </>
              )}
            </div>
          ))}
        </div>

        <Lbl>NOVA FORMA DE PAGAMENTO</Lbl>
        <div style={{ display: "flex", gap: 8 }}>
          <Inp value={nova} onChange={setNova} onKeyDown={e => e.key === "Enter" && add()} placeholder="Ex: Transferência, Cheque..." />
          <Btn onClick={add} disabled={!nova.trim() || existe(nova)} style={{ whiteSpace: "nowrap" }}><Plus size={14} /> Adicionar</Btn>
        </div>
        {nova.trim() && existe(nova) && <div style={{ fontSize: 11, color: "#DC2626", marginTop: 4, fontWeight: 600 }}>Já existe uma forma com este nome.</div>}
        <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 12 }}>Formas em uso por alguma despesa não podem ser excluídas, apenas renomeadas.</div>
      </Card>
    </Overlay>
  );
}

/* ─── Linha da lista de fornecedores (com lançamento inline) ─── */
function FornecedorRow({ f, idx, formas, defaultMethod, totalAberto, onSelect, onAddDespesa, onToast }) {
  const [dt, setDt] = useState(todayStr());
  const [val, setVal] = useState("");
  const [method, setMethod] = useState(defaultMethod);

  const lancar = () => {
    const v = parseFloat(String(val).replace(",", "."));
    if (!val || isNaN(v) || v <= 0) { onToast("Informe um valor válido.", "error"); return; }
    onAddDespesa(f.id, { date: dt, value: v, methodId: method });
    setVal(""); setDt(todayStr());
  };

  return (
    <tr style={{ background: idx % 2 === 0 ? "#fff" : "#FAFAFA", borderTop: idx === 0 ? "none" : "1px solid #F3F4F6", opacity: f.active === false ? 0.5 : 1 }}>
      <td onClick={() => onSelect(f.id)} title="Ver detalhes do fornecedor" style={{ padding: "12px 16px 12px 20px", minWidth: 200, cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: "linear-gradient(135deg,#EA580C,#F97316)", display: "flex", alignItems: "center", justifyContent: "center" }}><Truck size={14} color="#fff" /></div>
          <div>
            <div style={{ fontWeight: 800, color: "#111", fontSize: 13 }}>{f.tradeName || f.name} {f.active === false && <span style={{ fontSize: 10, color: "#DC2626", fontWeight: 700, marginLeft: 4 }}>(Inativo)</span>}</div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>{f.phone || f.cnpj || (f.tradeName ? f.name : "")}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: "8px 8px" }}><input type="date" value={dt} onChange={e => setDt(e.target.value)} style={{ ...inpBase, width: 140 }} /></td>
      <td style={{ padding: "8px 8px" }}><input type="text" value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === "Enter" && lancar()} placeholder="0,00" style={{ ...inpBase, width: 100, textAlign: "right" }} /></td>
      <td style={{ padding: "8px 8px" }}>
        <select value={method} onChange={e => setMethod(e.target.value)} style={{ ...inpBase, width: 120, cursor: "pointer" }}>
          {formas.map(fp => <option key={fp.id} value={fp.id}>{fp.name}</option>)}
        </select>
      </td>
      <td style={{ padding: "8px 8px" }}>
        <button onClick={lancar} disabled={!val} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: val ? "linear-gradient(135deg,#EA580C,#F97316)" : "#E5E7EB", color: val ? "#fff" : "#9CA3AF", border: "none", cursor: val ? "pointer" : "not-allowed", fontFamily: "inherit", whiteSpace: "nowrap" }}><Plus size={13} /> Lançar</button>
      </td>
      <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}><Chip color="#D97706" bg="#FEF3C7" style={{ fontSize: 11 }}>{BRL(totalAberto)}</Chip></td>
      <td style={{ padding: "12px 16px" }}>{f.category ? <Chip>{f.category}</Chip> : <span style={{ color: "#D1D5DB" }}>—</span>}</td>
    </tr>
  );
}

/* ─── Aba de Despesas ─── */
function DespesasTab({ despesas, total, years, formas, fy, setFy, fm, setFm, fs, setFs, fp, setFp, onSelectFornecedor, onSetDespesa, onDeleteDespesa, onExport }) {
  const grouped = useMemo(() => {
    const g = {};
    despesas.forEach(d => {
      const [y, m] = d.date.split("-");
      g[y] ||= {};
      g[y][m] ||= { list: [], total: 0 };
      g[y][m].list.push(d);
      g[y][m].total += d.value;
    });
    return g;
  }, [despesas]);

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <select value={fy} onChange={e => setFy(e.target.value)} style={filterSelStyle}><option value="all">Todos os anos</option>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
        <select value={fm} onChange={e => setFm(e.target.value)} style={filterSelStyle}><option value="all">Todos os meses</option>{MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}</select>
        <select value={fs} onChange={e => setFs(e.target.value)} style={filterSelStyle}><option value="all">Todos os status</option>{Object.keys(STATUS_CFG).map(s => <option key={s} value={s}>{s}</option>)}</select>
        <select value={fp} onChange={e => setFp(e.target.value)} style={filterSelStyle}><option value="all">Todas as formas</option>{formas.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
      </div>

      <div style={{ background: "#FFEDD5", borderRadius: 14, padding: 18, marginBottom: 32, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#EA580C", marginBottom: 4, letterSpacing: .5 }}>TOTAL FILTRADO</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#9A3412" }}>{BRL(total)}</div>
          <Chip color="#9A3412" bg="#FED7AA" style={{ marginTop: 6 }}>{despesas.length} despesa{despesas.length !== 1 ? "s" : ""}</Chip>
        </div>
        <Btn variant="success" onClick={onExport} disabled={despesas.length === 0} style={{ padding: "10px 18px" }}><Download size={15} /> Exportar XLSX</Btn>
      </div>

      {despesas.length === 0 ? (
        <div style={{ border: "2px dashed #E5E7EB", borderRadius: 16, padding: 60, textAlign: "center", color: "#9CA3AF" }}>Nenhuma despesa encontrada com estes filtros</div>
      ) : Object.keys(grouped).sort((a, b) => b.localeCompare(a)).map(year => (
        <div key={year} style={{ marginBottom: 40 }}>
          <h2 style={{ fontFamily: "inherit", fontSize: 22, fontWeight: 700, color: "#111", borderBottom: "2px solid #E5E7EB", paddingBottom: 8, marginBottom: 20 }}>Ano de {year}</h2>
          {Object.keys(grouped[year]).sort((a, b) => b.localeCompare(a)).map(month => {
            const mData = grouped[year][month];
            return (
              <Card key={month} style={{ padding: 0, marginBottom: 20, borderLeft: "4px solid #EA580C" }}>
                <div style={{ padding: "14px 20px", background: "#FAFAFA", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#374151" }}>{MONTHS[+month - 1]}</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#EA580C" }}>{BRL(mData.total)}</div>
                </div>
                <div className="table-responsive">
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#fff", borderBottom: "2px solid #F3F4F6" }}>
                        {["Fornecedor", "Data", "Forma", "Valor", "Status", ""].map(h => (
                          <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: .5, whiteSpace: "nowrap" }}>{h.toUpperCase()}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...mData.list].sort((a, b) => b.date.localeCompare(a.date)).map(d => (
                        <tr key={d.id} style={{ borderTop: "1px solid #F3F4F6" }}>
                          <td style={{ padding: "12px 16px" }}>
                            <span onClick={() => onSelectFornecedor(d.fornecedorId)} style={{ color: "#EA580C", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>{d.fornecedorName}</span>
                            {(d.fornecedorPhone || d.fornecedorEmail) && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 10, marginLeft: 10, fontSize: 11, color: "#6B7280", whiteSpace: "nowrap" }}>
                                {d.fornecedorPhone && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Phone size={11} />{d.fornecedorPhone}</span>}
                                {d.fornecedorEmail && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Mail size={11} />{d.fornecedorEmail}</span>}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "12px 16px", color: "#374151", whiteSpace: "nowrap" }}>{fmtD(d.date)}</td>
                          <td style={{ padding: "8px 16px" }}><MethodSel value={d.methodId} formas={formas} onChange={v => onSetDespesa(d.fornecedorId, d.id, { methodId: v })} /></td>
                          <td style={{ padding: "12px 16px", fontWeight: 800, color: "#111", whiteSpace: "nowrap" }}>{BRL(d.value)}</td>
                          <td style={{ padding: "12px 16px" }}><StatusSel value={d.status} onChange={v => onSetDespesa(d.fornecedorId, d.id, { status: v })} /></td>
                          <td style={{ padding: "12px 16px", textAlign: "right" }}><button onClick={() => { if (window.confirm("Tem certeza que deseja apagar esta despesa?")) onDeleteDespesa(d.fornecedorId, d.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: 4, borderRadius: 6 }}><Trash2 size={13} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ─── Main App de Despesas ─── */
export default function Despesas({ token, empresaEmail, empresaNome, onBack, onLogout }) {
  const [path, setPath] = useState(window.location.pathname);
  const currentMonthName = MONTHS[new Date().getMonth()];

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (newPath) => {
    window.history.pushState({}, '', newPath);
    setPath(newPath);
  };

  const tab = path.split('/').filter(Boolean)[1] === 'lista' ? 'despesas' : 'fornecedores';

  const [fornecedores, setFornecedores] = useState([]);
  const [formas, setFormas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selId, setSelId] = useState(null);

  const [search, setSearch] = useState("");
  const [showActive, setShowActive] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [fc, setFc] = useState("all");
  const [fy, setFy] = useState("all");
  const [fm, setFm] = useState("all");
  const [fs, setFs] = useState("all");
  const [fp, setFp] = useState("all");

  const [editing, setEditing] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showFormas, setShowFormas] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => setToast({ msg, type });

  const fetchAPI = async (endpoint, options = {}) => {
    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...(options.headers || {}) } });
    if (res.status === 401) { onLogout(); throw new Error("Sessão expirada"); }
    if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.erro || "Erro na API"); }
    return res;
  };

  useEffect(() => {
    Promise.all([fetchAPI('/fornecedores').then(r => r.json()), fetchAPI('/formas-pagamento').then(r => r.json())])
      .then(([fornDb, formasDb]) => { setFornecedores(fornDb || []); setFormas(formasDb || []); })
      .catch(err => { if (err.message !== "Sessão expirada") showToast("Erro ao carregar banco de dados", "error"); })
      .finally(() => setLoading(false));
  }, [token]);

  const selData = useMemo(() => fornecedores.find(f => f.id === selId), [selId, fornecedores]);

  /* ── Derived Data ── */
  const formaName = useMemo(() => Object.fromEntries(formas.map(f => [f.id, f.name])), [formas]);

  const allDespesas = useMemo(() => fornecedores.flatMap(f => (f.despesas || []).map(d => ({
    ...d, status: d.status || "PENDENTE", fornecedorId: f.id, fornecedorName: f.tradeName || f.name, fornecedorPhone: f.phone, fornecedorEmail: f.email,
  }))), [fornecedores]);

  const totalMesAtual = useMemo(() => {
    const k = mkKey(todayStr());
    return allDespesas.filter(d => mkKey(d.date) === k).reduce((s, d) => s + d.value, 0);
  }, [allDespesas]);
  const totalAberto = useMemo(() => allDespesas.filter(d => d.status !== "PAGA").reduce((s, d) => s + d.value, 0), [allDespesas]);
  const ultimas = useMemo(() => [...allDespesas].sort((a, b) => (Number(b.id) - Number(a.id)) || b.date.localeCompare(a.date)).slice(0, 15), [allDespesas]);

  const chartData = useMemo(() => {
    const m = {};
    allDespesas.forEach(d => { const k = mkKey(d.date); m[k] = (m[k] || 0) + d.value; });
    return Object.keys(m).sort().map(k => { const [y, mm] = k.split("-"); return { name: `${MONTHS[+mm - 1].substring(0, 3)}/${y.slice(2)}`, Total: m[k] }; });
  }, [allDespesas]);

  const abertoPorFornecedor = useMemo(() => {
    const m = {};
    allDespesas.forEach(d => { if (d.status !== "PAGA") m[d.fornecedorId] = (m[d.fornecedorId] || 0) + d.value; });
    return m;
  }, [allDespesas]);

  const ultimaFormaPorFornecedor = useMemo(() => {
    const m = {};
    fornecedores.forEach(f => {
      const last = [...(f.despesas || [])].sort((a, b) => Number(b.id) - Number(a.id))[0];
      if (last && formaName[last.methodId]) m[f.id] = last.methodId;
    });
    return m;
  }, [fornecedores, formaName]);

  const formaUsage = useMemo(() => {
    const m = {};
    allDespesas.forEach(d => { m[d.methodId] = (m[d.methodId] || 0) + 1; });
    return m;
  }, [allDespesas]);

  const filteredFornecedores = useMemo(() => {
    const q = search.toLowerCase().trim();
    const qd = digits(q);
    return fornecedores
      .filter(f => {
        const isAct = f.active !== false;
        if (!((showActive && isAct) || (showInactive && !isAct))) return false;
        if (fc !== "all" && (f.category || "") !== fc) return false;
        if (!q) return true;
        const text = [f.name, f.tradeName, f.email, f.address?.city].filter(Boolean).join(" ").toLowerCase();
        return text.includes(q) || (qd.length >= 3 && (digits(f.cnpj).includes(qd) || digits(f.phone).includes(qd)));
      })
      .sort((a, b) => (a.tradeName || a.name).localeCompare(b.tradeName || b.name));
  }, [fornecedores, search, showActive, showInactive, fc]);

  const years = useMemo(() => [...new Set(allDespesas.map(d => d.date.slice(0, 4)))].sort().reverse(), [allDespesas]);
  const filteredDespesas = useMemo(() => allDespesas.filter(d => {
    const [y, m] = d.date.split("-");
    if (fy !== "all" && y !== fy) return false;
    if (fm !== "all" && +m !== +fm) return false;
    if (fs !== "all" && d.status !== fs) return false;
    if (fp !== "all" && d.methodId !== fp) return false;
    return true;
  }), [allDespesas, fy, fm, fs, fp]);
  const filteredTotal = useMemo(() => filteredDespesas.reduce((s, d) => s + d.value, 0), [filteredDespesas]);

  /* ── Actions: fornecedores ── */
  const handleSave = async (data) => {
    const payload = { ...data, name: data.name.trim() };
    delete payload.despesas;
    try {
      if (data.id) {
        await fetchAPI(`/fornecedores/${data.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        setFornecedores(p => p.map(f => f.id === data.id ? { ...f, ...payload } : f));
        showToast("Fornecedor atualizado!");
      } else {
        const novo = { ...payload, id: uid(), active: true };
        await fetchAPI('/fornecedores', { method: 'POST', body: JSON.stringify(novo) });
        setFornecedores(p => [...p, { ...novo, despesas: [] }]);
        showToast("Fornecedor cadastrado!");
      }
      setEditing(null); setShowNewModal(false);
    } catch { showToast("Erro ao salvar", "error"); }
  };

  const handleDelete = async (id) => {
    try {
      await fetchAPI(`/fornecedores/${id}`, { method: 'DELETE' });
      setFornecedores(p => p.filter(f => f.id !== id));
      if (selId === id) setSelId(null);
      setEditing(null);
      showToast("Fornecedor excluído!");
    } catch (err) { showToast(err.message || "Erro ao excluir", "error"); }
  };

  /* ── Actions: despesas ── */
  const updateDespesas = (fornId, fn) => setFornecedores(p => p.map(f => f.id === fornId ? { ...f, despesas: fn(f.despesas || []) } : f));

  const addDespesa = async (fornId, { date, value, methodId }) => {
    const nova = { id: uid(), date, value, methodId, status: "PENDENTE" };
    try {
      await fetchAPI(`/fornecedores/${fornId}/despesas`, { method: 'POST', body: JSON.stringify(nova) });
      updateDespesas(fornId, ds => [...ds, nova]);
      showToast("Despesa lançada!");
    } catch { showToast("Erro ao lançar", "error"); }
  };

  const setDespesa = async (fornId, despesaId, data) => {
    try {
      await fetchAPI(`/fornecedores/${fornId}/despesas/${despesaId}`, { method: 'PATCH', body: JSON.stringify(data) });
      updateDespesas(fornId, ds => ds.map(d => d.id === despesaId ? { ...d, ...data } : d));
      showToast("Despesa atualizada!");
    } catch { showToast("Erro ao atualizar", "error"); }
  };

  const deleteDespesa = async (fornId, despesaId) => {
    try {
      await fetchAPI(`/fornecedores/${fornId}/despesas/${despesaId}`, { method: 'DELETE' });
      updateDespesas(fornId, ds => ds.filter(d => d.id !== despesaId));
      showToast("Despesa excluída!");
    } catch { showToast("Erro ao excluir", "error"); }
  };

  /* ── Actions: formas de pagamento ── */
  const addForma = async (name) => {
    const nova = { id: uid(), name };
    try {
      await fetchAPI('/formas-pagamento', { method: 'POST', body: JSON.stringify(nova) });
      setFormas(p => [...p, nova]); showToast("Forma de pagamento adicionada!");
    } catch { showToast("Erro ao salvar", "error"); }
  };
  const renameForma = async (id, name) => {
    try {
      await fetchAPI(`/formas-pagamento/${id}`, { method: 'PUT', body: JSON.stringify({ name }) });
      setFormas(p => p.map(f => f.id === id ? { ...f, name } : f)); showToast("Forma de pagamento renomeada!");
    } catch { showToast("Erro ao salvar", "error"); }
  };
  const deleteForma = async (id) => {
    try {
      await fetchAPI(`/formas-pagamento/${id}`, { method: 'DELETE' });
      setFormas(p => p.filter(f => f.id !== id)); showToast("Forma de pagamento excluída!");
    } catch (err) { showToast(err.message || "Erro ao excluir", "error"); }
  };

  /* ── Export ── */
  const exportXLSX = async () => {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("Despesas");
    ws.columns = [
      { header: "Mês/Ano", key: "mes", width: 15 },
      { header: "Data", key: "data", width: 12 },
      { header: "Fornecedor", key: "forn", width: 35 },
      { header: "Telefone", key: "tel", width: 18 },
      { header: "E-mail", key: "email", width: 30 },
      { header: "Forma", key: "forma", width: 15 },
      { header: "Status", key: "status", width: 12 },
      { header: "Valor (R$)", key: "valor", width: 15 },
    ];
    ws.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEA580C" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });
    [...filteredDespesas].sort((a, b) => b.date.localeCompare(a.date)).forEach(d => ws.addRow({
      mes: mLabel(mkKey(d.date)), data: fmtD(d.date), forn: d.fornecedorName, tel: d.fornecedorPhone || "-", email: d.fornecedorEmail || "-",
      forma: formaName[d.methodId] || "-", status: d.status, valor: d.value,
    }));
    const totalRow = ws.addRow({ status: "TOTAL", valor: filteredTotal });
    totalRow.font = { bold: true };
    ws.getColumn("valor").numFmt = '"R$" #,##0.00';
    ws.eachRow(row => row.eachCell(cell => { cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } }; }));
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `despesas-${fy}-${fm}.xlsx`);
  };

  const exportFornecedores = async () => {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("Fornecedores");
    ws.columns = [
      { header: "Razão Social", key: "name", width: 35 },
      { header: "Nome Fantasia", key: "tradeName", width: 25 },
      { header: "CNPJ", key: "cnpj", width: 20 },
      { header: "Categoria", key: "category", width: 15 },
      { header: "E-mail", key: "email", width: 30 },
      { header: "Telefone", key: "phone", width: 18 },
      { header: "Chave PIX", key: "pixKey", width: 25 },
      { header: "Endereço", key: "address", width: 60 },
      { header: "Status", key: "status", width: 10 },
    ];
    ws.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEA580C" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });
    filteredFornecedores.forEach(f => ws.addRow({ ...f, address: fmtAddress(f.address), status: f.active === false ? "Inativo" : "Ativo" }));
    ws.eachRow(row => row.eachCell(cell => { cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } }; }));
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), "fornecedores.xlsx");
  };

  const thStyle = { padding: "11px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#9CA3AF", letterSpacing: .6, whiteSpace: "nowrap", borderBottom: "2px solid #F3F4F6" };

  /* ── Render ── */
  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", background: "#F4F3F0", minHeight: "100vh", color: "#111827", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;0,9..40,900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes toastIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
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

      <AppHeader subtitle="Controle de despesas e fornecedores" onMenu={onBack}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 10, fontSize: 12, fontWeight: 700, color: "#6B7280" }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <User size={12} color="#4B5563" />
          </div>
          {empresaNome || empresaEmail}
        </div>
        <Btn variant="secondary" onClick={() => setShowFormas(true)}><Wallet size={15} /> Formas de Pagamento</Btn>
        <Btn onClick={() => setShowNewModal(true)}><Plus size={15} /> Novo Fornecedor</Btn>
        <button onClick={onLogout} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: 8 }} title="Sair"><LogOut size={18} /></button>
      </AppHeader>

      {loading ? <LoadingScreen /> : (
        <>
          {/* ── DASHBOARD ── */}
          <div className="top-dashboard-container" style={{ padding: "20px 24px 0", maxWidth: 1400, margin: "0 auto", width: "100%" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Card style={{ background: "linear-gradient(135deg,#EA580C,#F97316)", color: "#fff", padding: 22, textAlign: "center", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 700, opacity: .75, letterSpacing: .7, marginBottom: 8 }}>DESPESAS DO MÊS ATUAL - {currentMonthName.toUpperCase()}</div>
                <div style={{ fontSize: 32, fontWeight: 900 }}>{BRL(totalMesAtual)}</div>
              </Card>
              <div className="summary-grid">
                <Card style={{ padding: 22, textAlign: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: .7, marginBottom: 8 }}>TOTAL EM ABERTO</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: totalAberto ? "#D97706" : "#111" }}>{BRL(totalAberto)}</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>despesas pendentes</div>
                </Card>
                <Card style={{ padding: 22, textAlign: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: .7, marginBottom: 8 }}>FORNECEDORES ATIVOS</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#111" }}>{fornecedores.filter(f => f.active !== false).length}</div>
                  <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}><Truck size={16} color="#EA580C" /></div>
                </Card>
              </div>
            </div>
            <Card style={{ padding: 20, display: "flex", flexDirection: "column", height: 250 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#6B7280", letterSpacing: .7, marginBottom: 14, textTransform: "uppercase" }}>Últimas 15 Despesas</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, overflowY: "auto", paddingRight: 6 }}>
                {ultimas.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#9CA3AF", textAlign: "center", padding: "20px 0" }}>Nenhuma despesa lançada</div>
                ) : ultimas.map(d => (
                  <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8, borderBottom: "1px solid #F3F4F6", fontSize: 13 }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>
                      <div style={{ fontWeight: 800, color: "#111" }}>{d.fornecedorName}</div>
                      <div style={{ color: "#9CA3AF", fontSize: 11, marginTop: 1 }}>{fmtD(d.date)} · {formaName[d.methodId] || "—"}</div>
                    </div>
                    <div style={{ fontWeight: 900, color: "#EA580C", whiteSpace: "nowrap" }}>{BRL(d.value)}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <main style={{ padding: 24, maxWidth: 1400, margin: "0 auto", flex: 1, width: "100%" }}>
            <Card style={{ marginBottom: 24, padding: 22 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#6B7280", marginBottom: 16, letterSpacing: .5 }}>EVOLUÇÃO DAS DESPESAS (R$)</div>
              {chartData.length > 0 ? (
                <div style={{ height: 220, width: "100%" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 600 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 600 }} tickFormatter={v => v.toLocaleString('pt-BR')} />
                      <Tooltip formatter={(v) => [BRL(v), "Total"]} labelStyle={{ color: '#111', fontWeight: 800, marginBottom: 4 }} contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 15px rgba(0,0,0,0.1)", fontWeight: 700, fontSize: 13 }} />
                      <Bar dataKey="Total" barSize={30} fill="#FED7AA" radius={[6, 6, 0, 0]} />
                      <Line type="monotone" dataKey="Total" stroke="#EA580C" strokeWidth={3} dot={{ r: 4, fill: "#EA580C", strokeWidth: 2, stroke: "#fff" }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ textAlign: "center", color: "#9CA3AF", padding: "40px 0", fontSize: 13, fontWeight: 600 }}>Nenhuma despesa registrada ainda.</div>
              )}
            </Card>

            <div style={{ display: "inline-flex", gap: 2, background: "#E5E7EB", borderRadius: 12, padding: 4, marginBottom: 20 }}>
              {[{ id: "fornecedores", label: "Fornecedores", Icon: Truck }, { id: "despesas", label: "Despesas", Icon: Receipt }].map(t => (
                <button key={t.id} onClick={() => navigate(`/despesas${t.id === 'despesas' ? '/lista' : ''}`)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 9, border: "none", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", background: tab === t.id ? "#fff" : "transparent", color: tab === t.id ? "#111" : "#6B7280", boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,.1)" : "none", transition: "all .15s" }}><t.Icon size={14} />{t.label}</button>
              ))}
            </div>

            {tab === "fornecedores" ? (
              <div>
                <div className="search-bar-container">
                  <div className="search-input-wrapper">
                    <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por razão social, fantasia, CNPJ, cidade..." style={{ width: "100%", padding: "11px 12px 11px 36px", borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 14, background: "#fff", fontFamily: "inherit", outline: "none" }} />
                  </div>
                  <select value={fc} onChange={e => setFc(e.target.value)} style={{ ...filterSelStyle, padding: "10px 12px", borderRadius: 12 }}>
                    <option value="all">Todas as categorias</option>
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="">Sem categoria</option>
                  </select>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn variant={showActive ? "primary" : "secondary"} onClick={() => setShowActive(!showActive)} style={{ padding: "10px 14px", fontSize: 12 }}>Ativos</Btn>
                    <Btn variant={showInactive ? "primary" : "secondary"} onClick={() => setShowInactive(!showInactive)} style={{ padding: "10px 14px", fontSize: 12 }}>Inativos</Btn>
                  </div>
                  <Btn variant="success" onClick={exportFornecedores} disabled={filteredFornecedores.length === 0} style={{ padding: "10px 14px", fontSize: 12 }}><Download size={14} /> XLSX</Btn>
                </div>

                {filteredFornecedores.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 60, color: "#9CA3AF" }}><Building2 size={40} style={{ marginBottom: 12, opacity: .25 }} /><div>Nenhum fornecedor na lista</div></div>
                ) : (
                  <Card style={{ padding: 0 }}>
                    <div className="table-responsive">
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: "#F9FAFB" }}>
                            <th style={{ ...thStyle, paddingLeft: 20 }}>FORNECEDOR</th><th style={thStyle}>DATA</th><th style={thStyle}>VALOR (R$)</th><th style={thStyle}>FORMA</th><th style={thStyle}></th><th style={thStyle}>EM ABERTO</th><th style={thStyle}>CATEGORIA</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredFornecedores.map((f, idx) => (
                            <FornecedorRow key={f.id} f={f} idx={idx} formas={formas} defaultMethod={ultimaFormaPorFornecedor[f.id] || formas[0]?.id} totalAberto={abertoPorFornecedor[f.id] || 0} onSelect={setSelId} onAddDespesa={addDespesa} onToast={showToast} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </div>
            ) : (
              <DespesasTab despesas={filteredDespesas} total={filteredTotal} years={years} formas={formas} fy={fy} setFy={setFy} fm={fm} setFm={setFm} fs={fs} setFs={setFs} fp={fp} setFp={setFp} onSelectFornecedor={setSelId} onSetDespesa={setDespesa} onDeleteDespesa={deleteDespesa} onExport={exportXLSX} />
            )}
          </main>
        </>
      )}

      {selData && <FornecedorDetailModal key={selData.id} f={selData} formas={formas} onOpenEdit={() => setEditing(selData)} onSetDespesa={setDespesa} onDeleteDespesa={deleteDespesa} onClose={() => setSelId(null)} />}
      {showNewModal && <FornecedorModal isEdit={false} existing={fornecedores} onSave={handleSave} onClose={() => setShowNewModal(false)} />}
      {editing && <FornecedorModal isEdit data={editing} existing={fornecedores} onSave={handleSave} onDelete={handleDelete} onClose={() => setEditing(null)} />}
      {showFormas && <FormasModal formas={formas} usage={formaUsage} onAdd={addForma} onRename={renameForma} onDelete={deleteForma} onClose={() => setShowFormas(false)} />}

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      <AppFooter />
    </div>
  );
}
