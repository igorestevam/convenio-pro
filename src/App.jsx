import { useState, useMemo, useEffect } from "react";
import {
  Users, Plus, Search, Trash2, ArrowLeft,
  CreditCard, QrCode, Clock, FilePlus, Send, CheckCircle2,
  Mail, Phone, Receipt, User, X, ChevronRight, LogOut, Lock, Download, Edit
} from "lucide-react";
import * as XLSX from "xlsx";

/* ─── Constants ─────────────────────────────────────────────────── */
const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];
const STATUS_CFG = {
  PENDENTE: { color:"#6B7280", bg:"#F3F4F6", Icon: Clock },
  FEITA:    { color:"#D97706", bg:"#FEF3C7", Icon: FilePlus },
  ENVIADA:  { color:"#2563EB", bg:"#DBEAFE", Icon: Send },
  PAGA:     { color:"#15803D", bg:"#DCFCE7", Icon: CheckCircle2 },
};

/* ─── Helpers ───────────────────────────────────────────────────── */
const BRL    = (n) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n||0);
const fmtD   = (d) => new Date(d+"T12:00:00").toLocaleDateString("pt-BR");
const mkKey  = (d) => d.slice(0,7);
const mLabel = (k) => { const [y,m]=k.split("-"); return `${MONTHS[+m-1]}/${y}`; };
const todayStr = () => new Date().toISOString().slice(0,10);
let _uid = Date.now();
const uid = () => String(++_uid);

/* ─── API BASE URL ──────────────────────────────────────────────── */
const API_URL = 'https://convenio-api.onrender.com/api';

/* ═══ Shared UI ═════════════════════════════════════════════════════════ */

function Chip({ children, color="#4F46E5", bg="#EEF2FF", style={} }) {
  return (
    <span style={{ display:"inline-flex",alignItems:"center",gap:3,fontSize:11,fontWeight:700, color,background:bg,padding:"2px 8px",borderRadius:99,letterSpacing:.4, whiteSpace:"nowrap",...style }}>
      {children}
    </span>
  );
}

function MethodChip({ method }) {
  return method==="PIX" ? <Chip color="#0891B2" bg="#ECFEFF"><QrCode size={10}/> PIX</Chip> : <Chip color="#6D28D9" bg="#EDE9FE"><CreditCard size={10}/> BOLETO</Chip>;
}

function MethodSel({ value, onChange }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ padding:"4px 10px", borderRadius:99, border:"none", fontSize:11, fontWeight:700, cursor:"pointer", outline:"none", background: value==="PIX" ? "#ECFEFF" : "#EDE9FE", color: value==="PIX" ? "#0891B2" : "#6D28D9" }}>
      <option value="BOLETO">BOLETO</option><option value="PIX">PIX</option>
    </select>
  );
}

function StatusSel({ value, onChange }) {
  const s = STATUS_CFG[value] || STATUS_CFG.FEITA;
  return (
    <select value={value} onChange={e=>onChange(e.target.value)} style={{ background:s.bg, color:s.color, border:"none", borderRadius:99, padding:"3px 10px", fontSize:11, fontWeight:700, cursor:"pointer", outline:"none" }}>
      {Object.keys(STATUS_CFG).map(k=><option key={k} value={k}>{k}</option>)}
    </select>
  );
}

function Btn({ children, onClick, variant="primary", disabled=false, style={} }) {
  const themes = {
    primary:   { background:"linear-gradient(135deg,#4F46E5,#6D28D9)", color:"#fff", border:"none" },
    secondary: { background:"#fff", color:"#374151", border:"1px solid #E5E7EB" },
    success:   { background:"#DCFCE7", color:"#15803D", border:"none" },
    danger:    { background:"#FEE2E2", color:"#DC2626", border:"none" },
  };
  return (
    <button onClick={disabled?undefined:onClick} style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"8px 16px", borderRadius:10,fontSize:13,fontWeight:700,cursor:disabled?"not-allowed":"pointer", opacity:disabled?.5:1,transition:"opacity .15s",fontFamily:"inherit", ...themes[variant],...style }}>
      {children}
    </button>
  );
}

function Card({ children, style={} }) {
  return <div style={{ background:"#fff",borderRadius:16,padding:20, boxShadow:"0 1px 4px rgba(0,0,0,.08)",...style }}>{children}</div>;
}

function Lbl({ children }) {
  return <div style={{fontSize:11,fontWeight:700,color:"#6B7280",letterSpacing:.6,marginBottom:6}}>{children}</div>;
}

function Inp({ value, onChange, placeholder, type="text", style={} }) {
  return <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{ width:"100%",boxSizing:"border-box",padding:"10px 12px",borderRadius:10, border:"1px solid #E5E7EB",fontSize:14,background:"#fff",outline:"none", fontFamily:"inherit",...style }} />;
}

function Toast({ msg, type, onDone }) {
  useEffect(()=>{ const t=setTimeout(onDone,3000); return ()=>clearTimeout(t); },[]);
  return (
    <div style={{ position:"fixed",bottom:24,right:24,zIndex:9999, background:type==="error"?"#FEE2E2":"#DCFCE7", color:type==="error"?"#DC2626":"#15803D", padding:"12px 18px",borderRadius:12,fontWeight:700,fontSize:13, boxShadow:"0 4px 20px rgba(0,0,0,.15)",animation:"toastIn .3s ease" }}>
      {msg}
    </div>
  );
}

/* ═══ Modais (Novo Cliente & Editar Cliente) ═════════════════════════════ */

function NewClientModal({ data, onChange, onConfirm, onClose }) {
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(10,10,20,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,backdropFilter:"blur(6px)" }}>
      <Card style={{width:420,maxWidth:"92vw",padding:28,animation:"toastIn .2s ease"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
          <div style={{fontSize:18,fontWeight:900,color:"#111"}}>Novo Cliente</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"#9CA3AF",padding:4}}><X size={20}/></button>
        </div>
        {[{lbl:"RAZÃO SOCIAL *",key:"name",type:"text",ph:"Nome da empresa ou pessoa"},{lbl:"E-MAIL",key:"email",type:"email",ph:"email@empresa.com"},{lbl:"TELEFONE",key:"phone",type:"tel",ph:"(00) 00000-0000"}].map(f=>(
          <div key={f.key} style={{marginBottom:14}}><Lbl>{f.lbl}</Lbl><Inp type={f.type} value={data[f.key]} onChange={v=>onChange({...data,[f.key]:v})} placeholder={f.ph}/></div>
        ))}
        <div style={{marginBottom:8}}>
          <Lbl>MÉTODO DE PAGAMENTO INICIAL</Lbl>
          <div style={{display:"flex",gap:10}}>
            {["BOLETO","PIX"].map(m=>(
              <button key={m} onClick={()=>onChange({...data,method:m})} style={{ flex:1,padding:"10px 8px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit", border:`2px solid ${data.method===m?"#4F46E5":"#E5E7EB"}`, background:data.method===m?"#EEF2FF":"#FAFAFA", color:data.method===m?"#4F46E5":"#6B7280", display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
                {m==="PIX"?<QrCode size={14}/>:<CreditCard size={14}/>} {m}
              </button>
            ))}
          </div>
        </div>
        <div style={{display:"flex",gap:10,marginTop:18}}>
          <Btn onClick={onClose} variant="secondary" style={{flex:1,justifyContent:"center"}}>Cancelar</Btn>
          <Btn onClick={onConfirm} disabled={!data.name.trim()} style={{flex:2,justifyContent:"center"}}>Cadastrar</Btn>
        </div>
      </Card>
    </div>
  );
}

function EditClientModal({ client, onUpdate, onDelete, onClose }) {
  const [form, setForm] = useState({ name: client.name, email: client.email||"", phone: client.phone||"", active: client.active!==false });
  const canDelete = client.consumos.length === 0;

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(10,10,20,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,backdropFilter:"blur(6px)" }}>
      <Card style={{width:420,maxWidth:"92vw",padding:28,animation:"toastIn .2s ease"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
          <div style={{fontSize:18,fontWeight:900,color:"#111"}}>Editar Cliente</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"#9CA3AF",padding:4}}><X size={20}/></button>
        </div>
        
        {[{lbl:"RAZÃO SOCIAL *",key:"name",type:"text"},{lbl:"E-MAIL",key:"email",type:"email"},{lbl:"TELEFONE",key:"phone",type:"tel"}].map(f=>(
          <div key={f.key} style={{marginBottom:14}}><Lbl>{f.lbl}</Lbl><Inp type={f.type} value={form[f.key]} onChange={v=>setForm({...form,[f.key]:v})} /></div>
        ))}
        
        <div style={{marginBottom:22}}>
          <Lbl>STATUS DO CLIENTE</Lbl>
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>setForm({...form, active: true})} style={{ flex:1,padding:"10px 8px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit", border:`2px solid ${form.active?"#15803D":"#E5E7EB"}`, background:form.active?"#DCFCE7":"#FAFAFA", color:form.active?"#15803D":"#6B7280" }}>Ativo</button>
            <button onClick={()=>setForm({...form, active: false})} style={{ flex:1,padding:"10px 8px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit", border:`2px solid ${!form.active?"#DC2626":"#E5E7EB"}`, background:!form.active?"#FEE2E2":"#FAFAFA", color:!form.active?"#DC2626":"#6B7280" }}>Inativo</button>
          </div>
        </div>

        <div style={{display:"flex",gap:10, alignItems:"center"}}>
          {canDelete ? (
            <button onClick={onDelete} style={{ background:"none", border:"none", color:"#EF4444", cursor:"pointer", padding:8, display:"flex", alignItems:"center", gap:4, fontWeight:700, fontSize:12, fontFamily:"inherit" }} title="Excluir cliente em definitivo"><Trash2 size={16}/> Excluir</button>
          ) : (
             <span style={{ fontSize:10, color:"#9CA3AF", maxWidth: 120, lineHeight: 1.2 }}>Exclusão bloqueada (possui consumos)</span>
          )}
          <div style={{flex:1}}></div>
          <Btn onClick={onClose} variant="secondary">Cancelar</Btn>
          <Btn onClick={()=>onUpdate(form)} disabled={!form.name.trim()}>Salvar</Btn>
        </div>
      </Card>
    </div>
  );
}

/* ═══ Ecrã de Autenticação ══════════════════════════════════════════════ */

function AuthScreen({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const endpoint = isLogin ? '/auth/login' : '/auth/register';
    const body = isLogin ? { email, password } : { name, email, password };
    
    try {
      const res = await fetch(`${API_URL}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Erro na autenticação');
      onLogin(data.token, data.email, data.name);
    } catch (err) { setToast({ msg: err.message, type: "error" }); } finally { setLoading(false); }
  };

  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"#F4F3F0" }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
      <Card style={{ width: 400, padding: 40 }}>
        <div style={{ display:"flex", justifyContent:"center", marginBottom: 20 }}>
          <div style={{ width:50,height:50,borderRadius:12, background:"linear-gradient(135deg,#4F46E5,#6D28D9)", display:"flex",alignItems:"center",justifyContent:"center" }}><Lock size={24} color="#fff"/></div>
        </div>
        <h2 style={{ textAlign:"center", fontSize:24, fontWeight:900, marginBottom:8 }}>ConvênioPro</h2>
        <p style={{ textAlign:"center", color:"#6B7280", fontSize:14, marginBottom:30 }}>{isLogin ? "Entre na sua conta da empresa" : "Crie uma nova conta de empresa"}</p>
        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {!isLogin && (<div><Lbl>NOME DA EMPRESA *</Lbl><Inp type="text" value={name} onChange={setName} placeholder="Ex: Padaria do João" /></div>)}
          <div><Lbl>E-MAIL DA EMPRESA *</Lbl><Inp type="email" value={email} onChange={setEmail} placeholder="empresa@exemplo.com" /></div>
          <div><Lbl>PALAVRA-PASSE *</Lbl><Inp type="password" value={password} onChange={setPassword} placeholder="••••••••" /></div>
          <Btn style={{ width:"100%", justifyContent:"center", marginTop:10 }} disabled={loading || !email || !password || (!isLogin && !name)}>{loading ? "A processar..." : (isLogin ? "Entrar" : "Criar Conta")}</Btn>
        </form>
        <div style={{ textAlign:"center", marginTop:20, fontSize:13, color:"#6B7280" }}>
          {isLogin ? "Não tem conta? " : "Já tem conta? "}<span onClick={() => { setIsLogin(!isLogin); setToast(null); }} style={{ color:"#4F46E5", fontWeight:700, cursor:"pointer", textDecoration:"underline" }}>{isLogin ? "Registe-se aqui" : "Faça login"}</span>
        </div>
      </Card>
    </div>
  );
}

/* ═══ ClientsTable ════════════════════════════════════════════════════════ */

const _formState = {};
function getForm(id) { if (!_formState[id]) _formState[id] = { val:"", dt:todayStr(), _subs:[] }; return _formState[id]; }
function useFormField(clientId, field) {
  const [value, setValue] = useState(() => getForm(clientId)[field]);
  useEffect(() => {
    const form = getForm(clientId); const idx = form._subs.push(() => setValue(form[field])) - 1;
    return () => form._subs.splice(idx, 1);
  }, [clientId, field]);
  const set = (v) => { const form = getForm(clientId); form[field] = v; form._subs.forEach(fn => fn()); };
  return [value, set];
}

const inpBase = { boxSizing:"border-box", padding:"7px 10px", borderRadius:8, border:"1px solid #E5E7EB", fontSize:13, background:"#FAFAFA", outline:"none", fontFamily:"inherit" };
function InlineDate({ clientId }) { const [dt, setDt] = useFormField(clientId, "dt"); return <input type="date" value={dt} onChange={e=>setDt(e.target.value)} style={{...inpBase,width:145}}/>; }
function InlineValue({ clientId }) { const [val, setVal] = useFormField(clientId, "val"); return <input type="text" value={val} onChange={e=>setVal(e.target.value)} placeholder="0,00" style={{...inpBase,width:110,textAlign:"right"}}/>; }
function InlineBtn({ clientId, onAddConsumo, onToast }) {
  const [val] = useFormField(clientId, "val");
  const handle = () => {
    const form = getForm(clientId); const v = parseFloat(String(form.val).replace(",","."));
    if (!form.val || isNaN(v) || v <= 0) { onToast("Informe um valor válido.", "error"); return; }
    onAddConsumo(clientId, form.dt, form.val); // Sem descrição
    form.val = ""; form.dt = todayStr(); form._subs.forEach(fn => fn());
  };
  return (
    <button onClick={handle} disabled={!val} style={{ display:"inline-flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:8,fontSize:12,fontWeight:700, background: val ? "linear-gradient(135deg,#4F46E5,#6D28D9)" : "#E5E7EB", color: val ? "#fff" : "#9CA3AF", border:"none",cursor: val ? "pointer" : "not-allowed", fontFamily:"inherit",whiteSpace:"nowrap" }}> <Plus size={13}/> Lançar </button>
  );
}

function ClientsTable({ clients, latestMethodByClient, onSelect, onAddConsumo, onToast }) {
  const thStyle = { padding:"11px 16px",textAlign:"left",fontSize:10,fontWeight:700,color:"#9CA3AF",letterSpacing:.6,whiteSpace:"nowrap",borderBottom:"2px solid #F3F4F6" };
  if (clients.length === 0) return <div style={{textAlign:"center",padding:60,color:"#9CA3AF"}}><Users size={40} style={{marginBottom:12,opacity:.25}}/><div>Nenhum cliente na lista</div></div>;
  return (
    <Card style={{padding:0,overflow:"hidden"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead>
          <tr style={{background:"#F9FAFB"}}>
            <th style={{...thStyle,paddingLeft:20}}>CLIENTE</th><th style={thStyle}>DATA</th><th style={thStyle}>VALOR (R$)</th><th style={thStyle}></th><th style={thStyle}>TOTAL ACUM.</th><th style={thStyle}>ÚLT. MÉTODO</th><th style={{...thStyle,textAlign:"center"}}>DETALHE</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client, idx) => {
            const total = client.consumos.reduce((s,c)=>s+c.value,0);
            const latestMethod = latestMethodByClient[client.id] || client.method;
            return (
              <tr key={client.id} style={{ background: idx%2===0 ? "#fff" : "#FAFAFA", borderTop: idx===0 ? "none" : "1px solid #F3F4F6", opacity: client.active===false? 0.5 : 1 }}>
                <td style={{padding:"12px 16px 12px 20px",minWidth:180}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{ width:32,height:32,borderRadius:9,flexShrink:0,background:"linear-gradient(135deg,#4F46E5,#6D28D9)",display:"flex",alignItems:"center",justifyContent:"center" }}><User size={14} color="#fff"/></div>
                    <div><div style={{fontWeight:800,color:"#111",fontSize:13}}>{client.name} {client.active===false && <span style={{fontSize:10,color:"#DC2626",fontWeight:700,marginLeft:4}}>(Inativo)</span>}</div>{client.phone && <div style={{fontSize:11,color:"#9CA3AF",marginTop:1}}>{client.phone}</div>}</div>
                  </div>
                </td>
                <td style={{padding:"8px 8px"}}><InlineDate clientId={client.id}/></td>
                <td style={{padding:"8px 8px"}}><InlineValue clientId={client.id}/></td>
                <td style={{padding:"8px 8px"}}><InlineBtn clientId={client.id} onAddConsumo={onAddConsumo} onToast={onToast}/></td>
                <td style={{padding:"12px 16px",fontWeight:800,color:"#111",whiteSpace:"nowrap"}}><Chip color="#15803D" bg="#DCFCE7">{BRL(total)}</Chip></td>
                <td style={{padding:"12px 16px"}}><MethodChip method={latestMethod}/></td>
                <td style={{padding:"12px 16px",textAlign:"center"}}>
                  <button onClick={()=>onSelect(client.id)} style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"5px 12px",borderRadius:8,fontSize:11,fontWeight:700,border:"1px solid #E5E7EB",background:"#fff",color:"#4F46E5",cursor:"pointer",fontFamily:"inherit" }}>Ver <ChevronRight size={12}/></button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

function ClientDetail({ data, onDeleteConsumo, onSetStatus, onUpdateMethod, onExportXLSX, onOpenEdit }) {
  const { client, faturas, total } = data;
  return (
    <div>
      <Card style={{marginBottom:20,padding:22}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
          <div style={{display:"flex",gap:14,alignItems:"center"}}>
            <div style={{ width:52,height:52,borderRadius:14,flexShrink:0,background:"linear-gradient(135deg,#4F46E5,#6D28D9)",display:"flex",alignItems:"center",justifyContent:"center" }}><User size={24} color="#fff"/></div>
            <div>
              <div style={{display:"flex", alignItems:"center", gap:10}}>
                <div style={{fontSize:20,fontWeight:900,color:"#111"}}>{client.name}</div>
                {client.active===false && <Chip color="#DC2626" bg="#FEE2E2">Inativo</Chip>}
                <button onClick={onOpenEdit} style={{display:"flex",alignItems:"center",gap:4,background:"#F3F4F6",border:"none",padding:"4px 10px",borderRadius:8,fontSize:11,fontWeight:700,color:"#4B5563",cursor:"pointer",fontFamily:"inherit"}}><Edit size={12}/> Editar</button>
              </div>
              <div style={{display:"flex",gap:14,marginTop:5,flexWrap:"wrap"}}>
                {client.email && <span style={{fontSize:12,color:"#6B7280",display:"flex",gap:4,alignItems:"center"}}><Mail size={11}/>{client.email}</span>}
                {client.phone && <span style={{fontSize:12,color:"#6B7280",display:"flex",gap:4,alignItems:"center"}}><Phone size={11}/>{client.phone}</span>}
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:14,alignItems:"center",flexWrap:"wrap"}}>
            <div>
              <Lbl>PADRÃO DO CLIENTE</Lbl>
              <select value={client.method} onChange={e=>onUpdateMethod(client.id, e.target.value)} style={{ padding:"8px 12px",borderRadius:10,border:"1px solid #E5E7EB",fontSize:13,fontWeight:600,background:"#fff",cursor:"pointer",fontFamily:"inherit" }}>
                <option value="BOLETO">BOLETO</option><option value="PIX">PIX</option>
              </select>
            </div>
            <div style={{ background:"linear-gradient(135deg,#4F46E5,#6D28D9)",borderRadius:14,padding:"12px 22px",color:"#fff",textAlign:"center",flexShrink:0 }}>
              <div style={{fontSize:10,fontWeight:700,opacity:.8,letterSpacing:.8}}>TOTAL CLIENTE</div><div style={{fontSize:22,fontWeight:900,marginTop:2}}>{BRL(total)}</div>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Tabela de faturas agora ocupa a tela toda, sem o form de registro */}
      <div>
        <div style={{fontSize:14,fontWeight:800,color:"#111",marginBottom:14}}>Faturas e lançamentos</div>
        {faturas.length===0 ? (
          <div style={{border:"2px dashed #E5E7EB",borderRadius:16,padding:40,textAlign:"center",color:"#9CA3AF"}}><Receipt size={32} style={{opacity:.25,marginBottom:10}}/><div>Nenhum lançamento registrado</div></div>
        ) : faturas.map(f=>(
          <Card key={f.key} style={{marginBottom:14,padding:0,overflow:"hidden"}}>
            <div style={{ padding:"14px 18px",background:"#FAFAFA",borderBottom:"1px solid #F3F4F6",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8 }}>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <span style={{fontSize:15,fontWeight:800,color:"#111"}}>{mLabel(f.monthYear)}</span>
                <span style={{fontSize:12,color:"#9CA3AF"}}>{f.count} lanç.</span>
                <span style={{fontWeight:800,color:"#4F46E5"}}>{BRL(f.total)}</span><MethodChip method={f.method}/>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <StatusSel value={f.status} onChange={v=>onSetStatus(f.key,v)}/><Btn variant="success" onClick={()=>onExportXLSX(f)} style={{padding:"4px 10px",fontSize:11}}>XLSX</Btn>
              </div>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr style={{background:"#F9FAFB"}}>{["Data","Valor",""].map(h=>(<th key={h} style={{padding:"8px 16px",textAlign:"left",fontSize:10,fontWeight:700,color:"#9CA3AF",letterSpacing:.5}}>{h}</th>))}</tr></thead>
              <tbody>
                {[...f.consumos].sort((a,b)=>a.date.localeCompare(b.date)).map(c=>(
                  <tr key={c.id} style={{borderTop:"1px solid #F3F4F6"}}>
                    <td style={{padding:"10px 16px",color:"#374151",whiteSpace:"nowrap"}}>{fmtD(c.date)}</td>
                    <td style={{padding:"10px 16px",fontWeight:800,color:"#111",whiteSpace:"nowrap"}}>{BRL(c.value)}</td>
                    <td style={{padding:"10px 16px",textAlign:"right"}}><button onClick={()=>onDeleteConsumo(client.id,c.id)} style={{ background:"none",border:"none",cursor:"pointer",color:"#EF4444",padding:4,borderRadius:6 }}><Trash2 size={13}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ))}
      </div>
    </div>
  );
}

function FaturasTab({ faturas, total, years, fy, setFy, fm, setFm, fs, setFs, onSelectClient, onSetStatus, onSetMethod, onExportXLSX, onExportBatch }) {
  const selStyle = { padding:"9px 12px",borderRadius:10,border:"1px solid #E5E7EB",fontSize:13,background:"#fff",fontFamily:"inherit",cursor:"pointer" };
  return (
    <div>
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        <select value={fy} onChange={e=>setFy(e.target.value)} style={selStyle}><option value="all">Todos os anos</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</select>
        <select value={fm} onChange={e=>setFm(e.target.value)} style={selStyle}><option value="all">Todos os meses</option>{MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}</select>
        <select value={fs} onChange={e=>setFs(e.target.value)} style={selStyle}><option value="all">Todos os status</option>{Object.keys(STATUS_CFG).map(s=><option key={s} value={s}>{s}</option>)}</select>
      </div>
      <div style={{ background:"#EEF2FF",borderRadius:14,padding:18,marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12 }}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:"#4F46E5",marginBottom:4,letterSpacing:.5}}>TOTAL FILTRADO</div>
          <div style={{fontSize:26,fontWeight:900,color:"#4338CA"}}>{BRL(total)}</div>
          <Chip color="#4338CA" bg="#C7D2FE" style={{marginTop:6}}>{faturas.length} fatura{faturas.length!==1?"s":""}</Chip>
        </div>
        <Btn variant="success" onClick={onExportBatch} style={{padding:"10px 18px"}}><Download size={15}/> Exportar XLSX</Btn>
      </div>
      {faturas.length===0 ? <div style={{border:"2px dashed #E5E7EB",borderRadius:16,padding:60,textAlign:"center",color:"#9CA3AF"}}>Nenhuma fatura no filtro selecionado</div> : (
        <Card style={{padding:0,overflow:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{background:"#F9FAFB"}}>{["Mês/Ano","Cliente","Lanç.","Método","Total","Status",""].map(h=>(<th key={h} style={{ padding:"12px 16px",textAlign:"left",fontSize:10,fontWeight:700,color:"#9CA3AF",letterSpacing:.5,whiteSpace:"nowrap" }}>{h}</th>))}</tr></thead>
            <tbody>
              {faturas.map(f=>(
                <tr key={f.key} style={{borderTop:"1px solid #F3F4F6"}}>
                  <td style={{padding:"12px 16px",color:"#374151",fontWeight:600,whiteSpace:"nowrap"}}>{mLabel(f.monthYear)}</td>
                  <td style={{padding:"12px 16px"}}><span onClick={()=>onSelectClient(f.clientId)} style={{color:"#4F46E5",fontWeight:700,cursor:"pointer",textDecoration:"underline"}}>{f.clientName}</span></td>
                  <td style={{padding:"12px 16px",color:"#6B7280"}}>{f.count}</td>
                  <td style={{padding:"8px 16px"}}><MethodSel value={f.method} onChange={v=>onSetMethod(f.key,v)}/></td>
                  <td style={{padding:"12px 16px",fontWeight:800,color:"#111",whiteSpace:"nowrap"}}>{BRL(f.total)}</td>
                  <td style={{padding:"12px 16px"}}><StatusSel value={f.status} onChange={v=>onSetStatus(f.key,v)}/></td>
                  <td style={{padding:"12px 16px"}}><Btn variant="success" onClick={()=>onExportXLSX(f)} style={{padding:"4px 8px",fontSize:11}}>XLSX</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

/* ═══ App Principal Protegida por Token ═════════════════════════════════ */

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("conveniopro_token"));
  const [empresaEmail, setEmpresaEmail] = useState(() => localStorage.getItem("conveniopro_email"));
  const [empresaNome, setEmpresaNome] = useState(() => localStorage.getItem("conveniopro_nome"));

  const handleLogin = (newToken, email, name) => {
    localStorage.setItem("conveniopro_token", newToken);
    localStorage.setItem("conveniopro_email", email);
    if(name) localStorage.setItem("conveniopro_nome", name);
    setToken(newToken); setEmpresaEmail(email); setEmpresaNome(name);
  };
  const handleLogout = () => {
    localStorage.removeItem("conveniopro_token"); localStorage.removeItem("conveniopro_email"); localStorage.removeItem("conveniopro_nome");
    setToken(null); setEmpresaEmail(null); setEmpresaNome(null);
  };
  if (!token) return <AuthScreen onLogin={handleLogin} />;
  return <MainApp token={token} empresaEmail={empresaEmail} empresaNome={empresaNome} onLogout={handleLogout} />;
}

/* ═══ Main App (Apenas visível após login) ══════════════════════════════ */

function MainApp({ token, empresaEmail, empresaNome, onLogout }) {
  const [clients,   setClients]   = useState([]);
  const [fatExtras, setFatExtras] = useState({});
  const [selId,     setSelId]     = useState(null);
  const [tab,       setTab]       = useState("clientes");
  
  // Filtros pesquisa e ativos/inativos
  const [search,    setSearch]    = useState("");
  const [showActive, setShowActive] = useState(true);
  const [showInactive, setShowInactive] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [form,      setForm]      = useState({name:"",email:"",phone:"",method:"BOLETO"});
  
  const [editingClient, setEditingClient] = useState(null); // Modal de Editar
  
  const [fy,        setFy]        = useState("all");
  const [fm,        setFm]        = useState("all");
  const [fs,        setFs]        = useState("all");
  const [toast,     setToast]     = useState(null);

  const showToast = (msg, type="success") => setToast({msg,type});

  const fetchAPI = async (endpoint, options = {}) => {
    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...(options.headers || {}) } });
    if (res.status === 401) { onLogout(); throw new Error("Sessão expirada"); } 
    return res;
  };

  useEffect(() => {
    Promise.all([ fetchAPI('/clientes').then(r => r.json()), fetchAPI('/fatextras').then(r => r.json()) ])
    .then(([clientesDb, extrasDb]) => { setClients(clientesDb || []); setFatExtras(extrasDb || {}); })
    .catch(err => { if (err.message !== "Sessão expirada") showToast("Erro ao carregar o banco de dados", "error"); });
  }, [token]);

  /* ── Derived ── */
  const allConsumos = useMemo(()=>clients.flatMap(c=>c.consumos),[clients]);
  const totalGeral  = useMemo(()=>allConsumos.reduce((s,c)=>s+c.value,0),[allConsumos]);
  const ticketMedio = useMemo(()=>allConsumos.length ? totalGeral/allConsumos.length : 0,[totalGeral,allConsumos]);

  const allFaturas = useMemo(()=>{
    const map = {};
    clients.forEach(cl=>{
      cl.consumos.forEach(c=>{
        const key = `${cl.id}_${mkKey(c.date)}`;
        if(!map[key]) map[key]={ key, clientId:cl.id, clientName:cl.name, clientEmail:cl.email, clientPhone:cl.phone, monthYear:mkKey(c.date), consumos:[], total:0, count:0 };
        map[key].consumos.push(c); map[key].total += c.value; map[key].count++;
      });
    });
    return Object.values(map);
  },[clients]);

  const richFaturas = useMemo(()=>{
    const byClient = {};
    allFaturas.forEach(f=>{ if(!byClient[f.clientId]) byClient[f.clientId] = []; byClient[f.clientId].push(f); });
    const result = [];
    Object.entries(byClient).forEach(([clientId, fats])=>{
      const client = clients.find(c=>c.id===clientId);
      const sorted = [...fats].sort((a,b)=>a.monthYear.localeCompare(b.monthYear));
      let lastMethod = client?.method || "BOLETO";
      sorted.forEach(f=>{
        const method = fatExtras[f.key]?.method ?? lastMethod; lastMethod = method;
        result.push({ ...f, method, status: fatExtras[f.key]?.status || "FEITA" });
      });
    });
    return result.sort((a,b)=>b.monthYear.localeCompare(a.monthYear));
  },[allFaturas, clients, fatExtras]);

  const latestMethodByClient = useMemo(()=>{
    const map = {}; richFaturas.forEach(f=>{ if(map[f.clientId]===undefined) map[f.clientId] = f.method; }); return map;
  },[richFaturas]);

  const years = useMemo(()=>[...new Set(richFaturas.map(f=>f.monthYear.slice(0,4)))].sort().reverse(),[richFaturas]);
  const filteredFaturas = useMemo(()=>richFaturas.filter(f=>{
    const [y,m] = f.monthYear.split("-");
    if(fy!=="all" && y!==fy) return false; if(fm!=="all" && +m!==+fm) return false; if(fs!=="all" && f.status!==fs) return false; return true;
  }),[richFaturas,fy,fm,fs]);

  const filteredTotal = useMemo(()=>filteredFaturas.reduce((s,f)=>s+f.total,0),[filteredFaturas]);
  
  const filteredClients = useMemo(()=>{
    const q = search.toLowerCase(); 
    return clients.filter(c => {
      const matchQ = c.name.toLowerCase().includes(q) || (c.email||'').toLowerCase().includes(q) || (c.phone||'').includes(q);
      const isActive = c.active !== false; // Padrão é true
      const matchStatus = (showActive && isActive) || (showInactive && !isActive);
      return matchQ && matchStatus;
    });
  },[clients, search, showActive, showInactive]);

  const clientData = useMemo(()=>{
    if(!selId) return null; const client = clients.find(c=>c.id===selId); if(!client) return null;
    const faturas = richFaturas.filter(f=>f.clientId===selId).sort((a,b)=>b.monthYear.localeCompare(a.monthYear));
    const total = client.consumos.reduce((s,c)=>s+c.value,0); return {client,faturas,total};
  },[selId,clients,richFaturas]);

  /* ── Actions ── */
  const addClient = async () => {
    if(!form.name.trim()) return;
    const novoCliente = { ...form, id: uid(), active: true, consumos: [] };
    try {
      await fetchAPI('/clientes', { method: 'POST', body: JSON.stringify(novoCliente) });
      setClients(p => [novoCliente, ...p]); setForm({name:"", email:"", phone:"", method:"BOLETO"}); setShowModal(false); showToast("Cliente salvo.");
    } catch (err) { showToast("Erro ao salvar", "error"); }
  };

  const updateClientInfo = async (dadosEditados) => {
    try {
      await fetchAPI(`/clientes/${editingClient.id}`, { method: 'PUT', body: JSON.stringify(dadosEditados) });
      setClients(p => p.map(c => c.id === editingClient.id ? {...c, ...dadosEditados} : c));
      setEditingClient(null); showToast("Cliente atualizado!");
    } catch (err) { showToast("Erro ao atualizar", "error"); }
  };

  const removeClient = async () => {
    if (editingClient.consumos.length > 0) return;
    try {
      await fetchAPI(`/clientes/${editingClient.id}`, { method: 'DELETE' });
      setClients(p => p.filter(c => c.id !== editingClient.id));
      setEditingClient(null);
      if (selId === editingClient.id) setSelId(null); // Sai da tela de detalhe se estava lá
      showToast("Cliente excluído com sucesso.");
    } catch (err) { showToast("Erro ao excluir", "error"); }
  };

  const addConsumo = async (clientId, date, valStr) => {
    const value = parseFloat(String(valStr).replace(",","."));
    if(isNaN(value)||value<=0) return;
    const novoConsumo = { id: uid(), date, value }; // Sem desc
    try {
      await fetchAPI(`/clientes/${clientId}/consumos`, { method: 'POST', body: JSON.stringify(novoConsumo) });
      setClients(p => p.map(c => c.id === clientId ? {...c, consumos: [...c.consumos, novoConsumo]} : c)); showToast("Consumo salvo.");
    } catch (err) { showToast("Erro ao salvar consumo", "error"); }
  };

  const deleteConsumo = async (clientId, consumoId) => {
    try {
      await fetchAPI(`/clientes/${clientId}/consumos/${consumoId}`, { method: 'DELETE' });
      setClients(p => p.map(c => c.id === clientId ? {...c, consumos: c.consumos.filter(x => x.id !== consumoId)} : c)); showToast("Consumo excluído!");
    } catch (err) { showToast("Erro ao excluir", "error"); }
  };

  const updateMethod = async (clientId, method) => {
    try {
      await fetchAPI(`/clientes/${clientId}/method`, { method: 'PATCH', body: JSON.stringify({ method }) });
      setClients(p => p.map(c => c.id === clientId ? {...c, method} : c)); showToast("Método atualizado!");
    } catch (err) { showToast("Erro ao atualizar", "error"); }
  };

  const updateFatExtraAPI = async (key, data) => {
    try {
      await fetchAPI(`/fatextras/${key}`, { method: 'POST', body: JSON.stringify(data) });
      setFatExtras(p => ({...p, [key]: {...(p[key]||{}), ...data}}));
    } catch(err) { showToast("Erro", "error"); }
  };

  const setFaturaStatus = (key, status) => updateFatExtraAPI(key, { status });
  const setFaturaMethod = (key, method) => updateFatExtraAPI(key, { method });

  const exportXLSX = fatura => {
    try {
      const wb = XLSX.utils.book_new();
      const rows = [ ["Cliente", fatura.clientName], ["E-mail", fatura.clientEmail], ["Telefone", fatura.clientPhone], ["Mês/Ano", mLabel(fatura.monthYear)], ["Método", fatura.method], ["Status", fatura.status], ["Total", fatura.total], [], ["#","Data","Valor (R$)"] ];
      [...fatura.consumos].sort((a,b)=>a.date.localeCompare(b.date)).forEach((c,i)=>{ rows.push([i+1, fmtD(c.date), c.value]); });
      rows.push(["","TOTAL", fatura.total]);
      const ws = XLSX.utils.aoa_to_sheet(rows); XLSX.utils.book_append_sheet(wb,ws,"Fatura");
      XLSX.writeFile(wb,`fatura-${fatura.clientName.replace(/\s+/g,"-")}-${fatura.monthYear}.xlsx`);
    } catch(err) { showToast("Erro ao exportar XLSX.","error"); }
  };

  const exportBatch = () => {
    try {
      const wb = XLSX.utils.book_new();
      const rows = [["Mês/Ano","Cliente","E-mail","Telefone","Lançamentos","Método","Status","Total (R$)"]];
      filteredFaturas.forEach(f=>rows.push([ mLabel(f.monthYear), f.clientName, f.clientEmail, f.clientPhone, f.count, f.method, f.status, f.total, ]));
      rows.push(["","","","","","","TOTAL",filteredTotal]);
      const ws = XLSX.utils.aoa_to_sheet(rows); XLSX.utils.book_append_sheet(wb,ws,"Faturas");
      const suffix = [ fy!=="all"?fy:"", fm!=="all"?String(fm).padStart(2,"0"):"" ].filter(Boolean).join("-")||"todos";
      XLSX.writeFile(wb,`faturas-${suffix}.xlsx`);
    } catch(err) { showToast("Erro ao exportar XLSX.","error"); }
  };

  /* ── Render ── */
  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:"#F4F3F0",minHeight:"100vh",color:"#111827"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;0,9..40,900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes toastIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
        select { font-family: inherit; } button { font-family: inherit; } input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.6; }
      `}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}

      {/* ─── Header ─── */}
      <header style={{ position:"sticky",top:0,zIndex:100,background:"rgba(255,255,255,.92)",backdropFilter:"blur(14px)",borderBottom:"1px solid #EBEBEB",padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12 }}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{ width:36,height:36,borderRadius:10,flexShrink:0,background:"linear-gradient(135deg,#4F46E5,#6D28D9)",display:"flex",alignItems:"center",justifyContent:"center" }}><Receipt size={18} color="#fff"/></div>
          <div>
            <div style={{fontSize:16,fontWeight:900,color:"#111",lineHeight:1.1}}>ConvênioPro</div>
            <div style={{fontSize:11,color:"#9CA3AF",fontWeight:500}}>Controle de consumo de clientes</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          {selId ? (
            <Btn onClick={()=>setSelId(null)} variant="secondary"><ArrowLeft size={15}/> Voltar</Btn>
          ) : (
            <>
              <div style={{display:"flex", alignItems:"center", gap:6, marginRight:10, fontSize:12, fontWeight:700, color:"#6B7280"}}>
                <div style={{width:24, height:24, borderRadius:6, background:"#E5E7EB", display:"flex", alignItems:"center", justifyContent:"center"}}><User size={12} color="#4B5563"/></div>
                {empresaNome || empresaEmail}
              </div>
              <Btn onClick={()=>setShowModal(true)}><Plus size={15}/> Novo Cliente</Btn>
              <button onClick={onLogout} style={{background:"none", border:"none", cursor:"pointer", color:"#EF4444", padding:8}} title="Sair da Conta"><LogOut size={18}/></button>
            </>
          )}
        </div>
      </header>

      {/* ─── Summary cards ─── */}
      <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:16,padding:"20px 24px 0",maxWidth:1400,margin:"0 auto" }}>
        <Card style={{background:"linear-gradient(135deg,#4F46E5,#6D28D9)",color:"#fff",padding:22}}><div style={{fontSize:11,fontWeight:700,opacity:.75,letterSpacing:.7,marginBottom:8}}>TOTAL GERAL DE CONSUMO</div><div style={{fontSize:30,fontWeight:900}}>{BRL(totalGeral)}</div></Card>
        <Card style={{padding:22}}><div style={{fontSize:11,fontWeight:700,color:"#6B7280",letterSpacing:.7,marginBottom:8}}>CLIENTES ATIVOS</div><div style={{fontSize:28,fontWeight:900,color:"#111"}}>{clients.filter(c=>c.active!==false).length}</div><Users size={16} color="#4F46E5" style={{marginTop:6}}/></Card>
        <Card style={{padding:22}}><div style={{fontSize:11,fontWeight:700,color:"#6B7280",letterSpacing:.7,marginBottom:8}}>TICKET MÉDIO</div><div style={{fontSize:22,fontWeight:900,color:"#111"}}>{BRL(ticketMedio)}</div><div style={{fontSize:11,color:"#9CA3AF",marginTop:4}}>{allConsumos.length} lançamentos</div></Card>
      </div>

      {/* ─── Main ─── */}
      <main style={{padding:24,maxWidth:1400,margin:"0 auto"}}>
        {selId && clientData ? (
          <ClientDetail data={clientData} onDeleteConsumo={deleteConsumo} onUpdateMethod={updateMethod} onSetStatus={setFaturaStatus} onExportXLSX={exportXLSX} onOpenEdit={()=>setEditingClient(clientData.client)} />
        ) : (
          <>
            <div style={{ display:"inline-flex",gap:2,background:"#E5E7EB",borderRadius:12,padding:4,marginBottom:20 }}>
              {[{id:"clientes",label:"Clientes",Icon:Users},{id:"faturas", label:"Faturas", Icon:Receipt}].map(t=>(
                <button key={t.id} onClick={()=>setTab(t.id)} style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 18px",borderRadius:9,border:"none",fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:"pointer",background:tab===t.id?"#fff":"transparent",color:tab===t.id?"#111":"#6B7280",boxShadow:tab===t.id?"0 1px 4px rgba(0,0,0,.1)":"none",transition:"all .15s" }}><t.Icon size={14}/>{t.label}</button>
              ))}
            </div>
            {tab==="clientes" ? (
              <div>
                <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:18}}>
                  <div style={{position:"relative", flex: 1, maxWidth: 400}}>
                    <Search size={15} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#9CA3AF"}}/>
                    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por razão social, e-mail..." style={{ width:"100%",padding:"11px 12px 11px 36px",borderRadius:12,border:"1px solid #E5E7EB",fontSize:14,background:"#fff",fontFamily:"inherit",outline:"none" }}/>
                  </div>
                  <div style={{display:"flex", gap: 6}}>
                    <Btn variant={showActive ? "primary" : "secondary"} onClick={() => setShowActive(!showActive)} style={{padding: "10px 14px", fontSize: 12}}>Ativos</Btn>
                    <Btn variant={showInactive ? "primary" : "secondary"} onClick={() => setShowInactive(!showInactive)} style={{padding: "10px 14px", fontSize: 12}}>Inativos</Btn>
                  </div>
                </div>
                <ClientsTable clients={filteredClients} latestMethodByClient={latestMethodByClient} onSelect={setSelId} onAddConsumo={addConsumo} onToast={showToast} />
              </div>
            ) : (
              <FaturasTab faturas={filteredFaturas} total={filteredTotal} years={years} fy={fy} setFy={setFy} fm={fm} setFm={setFm} fs={fs} setFs={setFs} onSelectClient={setSelId} onSetStatus={setFaturaStatus} onSetMethod={setFaturaMethod} onExportXLSX={exportXLSX} onExportBatch={exportBatch} />
            )}
          </>
        )}
      </main>
      
      {showModal && <NewClientModal data={form} onChange={setForm} onConfirm={addClient} onClose={()=>setShowModal(false)} />}
      
      {editingClient && (
        <EditClientModal
          client={editingClient}
          onUpdate={updateClientInfo}
          onDelete={removeClient}
          onClose={()=>setEditingClient(null)}
        />
      )}
    </div>
  );
}