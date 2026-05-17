import { useState, useMemo, useRef, useEffect } from "react";
import {
  Users, Plus, Upload, Download, Search, Trash2, ArrowLeft,
  CreditCard, QrCode, Clock, FilePlus, Send, CheckCircle2,
  Mail, Phone, Receipt, User, X, ChevronRight,
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
const BRL  = (n) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n||0);
const fmtD = (d) => new Date(d+"T12:00:00").toLocaleDateString("pt-BR");
const mkKey  = (d) => d.slice(0,7);
const mLabel = (k) => { const [y,m]=k.split("-"); return `${MONTHS[+m-1]}/${y}`; };
const todayStr = () => new Date().toISOString().slice(0,10);
let _uid = 300;
const uid = () => String(++_uid);

/* ═══ Shared UI ═════════════════════════════════════════════════════════ */

function Chip({ children, color="#4F46E5", bg="#EEF2FF", style={} }) {
  return (
    <span style={{
      display:"inline-flex",alignItems:"center",gap:3,fontSize:11,fontWeight:700,
      color,background:bg,padding:"2px 8px",borderRadius:99,letterSpacing:.4,
      whiteSpace:"nowrap",...style,
    }}>
      {children}
    </span>
  );
}

function MethodChip({ method }) {
  return method==="PIX"
    ? <Chip color="#0891B2" bg="#ECFEFF"><QrCode size={10}/> PIX</Chip>
    : <Chip color="#6D28D9" bg="#EDE9FE"><CreditCard size={10}/> BOLETO</Chip>;
}

function StatusSel({ value, onChange }) {
  const s = STATUS_CFG[value] || STATUS_CFG.FEITA;
  return (
    <select value={value} onChange={e=>onChange(e.target.value)} style={{
      background:s.bg, color:s.color, border:"none", borderRadius:99,
      padding:"3px 10px", fontSize:11, fontWeight:700, cursor:"pointer", outline:"none",
    }}>
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
    <button
      onClick={disabled?undefined:onClick}
      style={{
        display:"inline-flex",alignItems:"center",gap:6,padding:"8px 16px",
        borderRadius:10,fontSize:13,fontWeight:700,cursor:disabled?"not-allowed":"pointer",
        opacity:disabled?.5:1,transition:"opacity .15s",fontFamily:"inherit",
        ...themes[variant],...style,
      }}
    >
      {children}
    </button>
  );
}

function Card({ children, style={} }) {
  return (
    <div style={{
      background:"#fff",borderRadius:16,padding:20,
      boxShadow:"0 1px 4px rgba(0,0,0,.08)",...style,
    }}>
      {children}
    </div>
  );
}

function Lbl({ children }) {
  return (
    <div style={{fontSize:11,fontWeight:700,color:"#6B7280",letterSpacing:.6,marginBottom:6}}>
      {children}
    </div>
  );
}

function Inp({ value, onChange, placeholder, type="text", style={} }) {
  return (
    <input
      type={type} value={value}
      onChange={e=>onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width:"100%",boxSizing:"border-box",padding:"10px 12px",borderRadius:10,
        border:"1px solid #E5E7EB",fontSize:14,background:"#fff",outline:"none",
        fontFamily:"inherit",...style,
      }}
    />
  );
}

function Toast({ msg, type, onDone }) {
  useEffect(()=>{ const t=setTimeout(onDone,3000); return ()=>clearTimeout(t); },[]);
  return (
    <div style={{
      position:"fixed",bottom:24,right:24,zIndex:9999,
      background:type==="error"?"#FEE2E2":"#DCFCE7",
      color:type==="error"?"#DC2626":"#15803D",
      padding:"12px 18px",borderRadius:12,fontWeight:700,fontSize:13,
      boxShadow:"0 4px 20px rgba(0,0,0,.15)",animation:"toastIn .3s ease",
    }}>
      {msg}
    </div>
  );
}

/* ═══ NewClientModal ═════════════════════════════════════════════════════ */

function NewClientModal({ data, onChange, onConfirm, onClose }) {
  return (
    <div style={{
      position:"fixed",inset:0,background:"rgba(10,10,20,.5)",
      display:"flex",alignItems:"center",justifyContent:"center",
      zIndex:999,backdropFilter:"blur(6px)",
    }}>
      <Card style={{width:420,maxWidth:"92vw",padding:28,animation:"toastIn .2s ease"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
          <div style={{fontSize:18,fontWeight:900,color:"#111"}}>Novo Cliente</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"#9CA3AF",padding:4}}>
            <X size={20}/>
          </button>
        </div>

        {[
          {lbl:"RAZÃO SOCIAL *",key:"name",type:"text",ph:"Nome da empresa ou pessoa"},
          {lbl:"E-MAIL",key:"email",type:"email",ph:"email@empresa.com"},
          {lbl:"TELEFONE",key:"phone",type:"tel",ph:"(00) 00000-0000"},
        ].map(f=>(
          <div key={f.key} style={{marginBottom:14}}>
            <Lbl>{f.lbl}</Lbl>
            <Inp type={f.type} value={data[f.key]} onChange={v=>onChange({...data,[f.key]:v})} placeholder={f.ph}/>
          </div>
        ))}

        <div style={{marginBottom:22}}>
          <Lbl>MÉTODO DE PAGAMENTO</Lbl>
          <div style={{display:"flex",gap:10}}>
            {["BOLETO","PIX"].map(m=>(
              <button key={m} onClick={()=>onChange({...data,method:m})}
                style={{
                  flex:1,padding:"10px 8px",borderRadius:10,cursor:"pointer",
                  fontWeight:700,fontSize:13,fontFamily:"inherit",
                  border:`2px solid ${data.method===m?"#4F46E5":"#E5E7EB"}`,
                  background:data.method===m?"#EEF2FF":"#FAFAFA",
                  color:data.method===m?"#4F46E5":"#6B7280",
                  display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                }}>
                {m==="PIX"?<QrCode size={14}/>:<CreditCard size={14}/>} {m}
              </button>
            ))}
          </div>
        </div>

        <div style={{display:"flex",gap:10}}>
          <Btn onClick={onClose} variant="secondary" style={{flex:1,justifyContent:"center"}}>Cancelar</Btn>
          <Btn onClick={onConfirm} disabled={!data.name.trim()} style={{flex:2,justifyContent:"center"}}>
            Cadastrar Cliente
          </Btn>
        </div>
      </Card>
    </div>
  );
}

/* ═══ ClientsTable — lista com lançamento inline ══════════════════════════ */

function ClientRowForm({ clientId, onAddConsumo, onToast }) {
  const [val,  setVal]  = useState("");
  const [desc, setDesc] = useState("");
  const [dt,   setDt]   = useState(todayStr());

  const handle = () => {
    const v = parseFloat(String(val).replace(",","."));
    if (!val || isNaN(v) || v <= 0) {
      onToast("Informe um valor válido.", "error");
      return;
    }
    onAddConsumo(clientId, dt, val, desc || "Consumo");
    setVal(""); setDesc(""); setDt(todayStr());
    onToast("Consumo lançado!");
  };

  const inputBase = {
    boxSizing:"border-box", padding:"7px 10px", borderRadius:8,
    border:"1px solid #E5E7EB", fontSize:13, background:"#FAFAFA",
    outline:"none", fontFamily:"inherit", width:"100%",
  };

  return (
    <tr style={{background:"#F9FAFB", borderTop:"none"}}>
      {/* empty name cell */}
      <td style={{padding:"8px 16px 8px 20px"}}/>
      {/* date */}
      <td style={{padding:"8px 8px"}}>
        <input
          type="date" value={dt} onChange={e=>setDt(e.target.value)}
          style={{...inputBase, width:150}}
        />
      </td>
      {/* description */}
      <td style={{padding:"8px 8px"}}>
        <input
          type="text" value={desc} onChange={e=>setDesc(e.target.value)}
          placeholder="Descrição (opcional)"
          style={{...inputBase, minWidth:160}}
        />
      </td>
      {/* value */}
      <td style={{padding:"8px 8px"}}>
        <input
          type="text" value={val} onChange={e=>setVal(e.target.value)}
          placeholder="0,00"
          onKeyDown={e=>e.key==="Enter"&&handle()}
          style={{...inputBase, width:110, textAlign:"right"}}
        />
      </td>
      {/* add button + empty cols */}
      <td style={{padding:"8px 8px"}}>
        <button
          onClick={handle}
          disabled={!val}
          title="Lançar consumo"
          style={{
            display:"inline-flex", alignItems:"center", gap:5,
            padding:"7px 14px", borderRadius:8, fontSize:12, fontWeight:700,
            background: val ? "linear-gradient(135deg,#4F46E5,#6D28D9)" : "#E5E7EB",
            color: val ? "#fff" : "#9CA3AF",
            border:"none", cursor: val ? "pointer" : "not-allowed",
            fontFamily:"inherit", whiteSpace:"nowrap",
          }}
        >
          <Plus size={13}/> Lançar
        </button>
      </td>
      <td colSpan={2}/>
    </tr>
  );
}

function ClientsTable({ clients, onSelect, onAddConsumo, onToast }) {
  const [expandedId, setExpandedId] = useState(null);

  const toggle = (id) => setExpandedId(prev => prev === id ? null : id);

  const thStyle = {
    padding:"11px 16px", textAlign:"left",
    fontSize:10, fontWeight:700, color:"#9CA3AF", letterSpacing:.6,
    whiteSpace:"nowrap", borderBottom:"2px solid #F3F4F6",
  };

  if (clients.length === 0) {
    return (
      <div style={{textAlign:"center",padding:60,color:"#9CA3AF"}}>
        <Users size={40} style={{marginBottom:12,opacity:.25}}/>
        <div>Nenhum cliente encontrado</div>
      </div>
    );
  }

  return (
    <Card style={{padding:0, overflow:"hidden"}}>
      <table style={{width:"100%", borderCollapse:"collapse", fontSize:13}}>
        <thead>
          <tr style={{background:"#F9FAFB"}}>
            <th style={{...thStyle, paddingLeft:20}}>CLIENTE</th>
            <th style={thStyle}>DATA</th>
            <th style={thStyle}>DESCRIÇÃO</th>
            <th style={thStyle}>VALOR (R$)</th>
            <th style={thStyle}></th>
            <th style={thStyle}>TOTAL ACUM.</th>
            <th style={thStyle}>MÉTODO</th>
            <th style={{...thStyle, textAlign:"center"}}>DETALHE</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client, idx) => {
            const total = client.consumos.reduce((s,c)=>s+c.value,0);
            const isExpanded = expandedId === client.id;
            const isEven = idx % 2 === 0;

            return [
              /* ── Main row ── */
              <tr
                key={client.id}
                style={{
                  background: isExpanded ? "#F5F3FF" : isEven ? "#fff" : "#FAFAFA",
                  borderTop: idx === 0 ? "none" : "1px solid #F3F4F6",
                  transition:"background .15s",
                }}
              >
                {/* Name */}
                <td style={{padding:"12px 16px 12px 20px", minWidth:180}}>
                  <div style={{display:"flex", alignItems:"center", gap:10}}>
                    <div style={{
                      width:32, height:32, borderRadius:9, flexShrink:0,
                      background:"linear-gradient(135deg,#4F46E5,#6D28D9)",
                      display:"flex", alignItems:"center", justifyContent:"center",
                    }}>
                      <User size={14} color="#fff"/>
                    </div>
                    <div>
                      <div style={{fontWeight:800, color:"#111", fontSize:13}}>{client.name}</div>
                      {client.phone && (
                        <div style={{fontSize:11, color:"#9CA3AF", marginTop:1}}>{client.phone}</div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Inline form cells — date, desc, value, button */}
                {/* DATE */}
                <td style={{padding:"8px 8px"}}>
                  <InlineDate clientId={client.id} expandedId={expandedId} setExpandedId={setExpandedId}/>
                </td>
                {/* DESC */}
                <td style={{padding:"8px 8px"}}>
                  <InlineDesc clientId={client.id} expandedId={expandedId}/>
                </td>
                {/* VALUE */}
                <td style={{padding:"8px 8px"}}>
                  <InlineValue clientId={client.id} expandedId={expandedId}/>
                </td>
                {/* BUTTON */}
                <td style={{padding:"8px 8px"}}>
                  <InlineBtn
                    clientId={client.id}
                    onAddConsumo={onAddConsumo}
                    onToast={onToast}
                  />
                </td>

                {/* Total */}
                <td style={{padding:"12px 16px", fontWeight:800, color:"#111", whiteSpace:"nowrap"}}>
                  <Chip color="#15803D" bg="#DCFCE7">{BRL(total)}</Chip>
                </td>

                {/* Method */}
                <td style={{padding:"12px 16px"}}>
                  <MethodChip method={client.method}/>
                </td>

                {/* Detail link */}
                <td style={{padding:"12px 16px", textAlign:"center"}}>
                  <button
                    onClick={()=>onSelect(client.id)}
                    title="Ver detalhes"
                    style={{
                      display:"inline-flex", alignItems:"center", gap:4,
                      padding:"5px 12px", borderRadius:8, fontSize:11,
                      fontWeight:700, border:"1px solid #E5E7EB",
                      background:"#fff", color:"#4F46E5", cursor:"pointer",
                      fontFamily:"inherit",
                    }}
                  >
                    Ver Cliente <ChevronRight size={12}/>
                  </button>
                </td>
              </tr>,
            ];
          })}
        </tbody>
      </table>
    </Card>
  );
}

/* ─── Each inline cell is a tiny self-contained controlled element ─── */
/* We store per-client form state in a shared registry via a custom hook */

// Simple global form state map (keyed by clientId)
const _formState = {};
function getForm(id) {
  if (!_formState[id]) _formState[id] = { val:"", desc:"", dt:todayStr(), _subs:[] };
  return _formState[id];
}

function useFormField(clientId, field) {
  const [value, setValue] = useState(() => getForm(clientId)[field]);
  useEffect(() => {
    const form = getForm(clientId);
    const idx = form._subs.push(() => setValue(form[field])) - 1;
    return () => form._subs.splice(idx, 1);
  }, [clientId, field]);
  const set = (v) => {
    const form = getForm(clientId);
    form[field] = v;
    form._subs.forEach(fn => fn());
  };
  return [value, set];
}

const inputBase = {
  boxSizing:"border-box", padding:"7px 10px", borderRadius:8,
  border:"1px solid #E5E7EB", fontSize:13, background:"#FAFAFA",
  outline:"none", fontFamily:"inherit",
};

function InlineDate({ clientId }) {
  const [dt, setDt] = useFormField(clientId, "dt");
  return (
    <input
      type="date" value={dt} onChange={e=>setDt(e.target.value)}
      style={{...inputBase, width:145}}
    />
  );
}

function InlineDesc({ clientId }) {
  const [desc, setDesc] = useFormField(clientId, "desc");
  return (
    <input
      type="text" value={desc} onChange={e=>setDesc(e.target.value)}
      placeholder="Descrição (opc.)"
      style={{...inputBase, minWidth:150, maxWidth:220, width:"100%"}}
    />
  );
}

function InlineValue({ clientId }) {
  const [val, setVal] = useFormField(clientId, "val");
  return (
    <input
      type="text" value={val} onChange={e=>setVal(e.target.value)}
      placeholder="0,00"
      style={{...inputBase, width:100, textAlign:"right"}}
    />
  );
}

function InlineBtn({ clientId, onAddConsumo, onToast }) {
  const [val] = useFormField(clientId, "val");
  const handle = () => {
    const form = getForm(clientId);
    const v = parseFloat(String(form.val).replace(",","."));
    if (!form.val || isNaN(v) || v <= 0) {
      onToast("Informe um valor válido.", "error");
      return;
    }
    onAddConsumo(clientId, form.dt, form.val, form.desc || "Consumo");
    form.val = ""; form.desc = ""; form.dt = todayStr();
    form._subs.forEach(fn => fn());
    onToast("Consumo lançado!");
  };

  return (
    <button
      onClick={handle}
      disabled={!val}
      title="Lançar consumo"
      style={{
        display:"inline-flex", alignItems:"center", gap:5,
        padding:"7px 14px", borderRadius:8, fontSize:12, fontWeight:700,
        background: val ? "linear-gradient(135deg,#4F46E5,#6D28D9)" : "#E5E7EB",
        color: val ? "#fff" : "#9CA3AF",
        border:"none", cursor: val ? "pointer" : "not-allowed",
        fontFamily:"inherit", whiteSpace:"nowrap",
      }}
    >
      <Plus size={13}/> Lançar
    </button>
  );
}

/* ═══ ClientDetail ═══════════════════════════════════════════════════════ */

function ClientDetail({ data, onAddConsumo, onDeleteConsumo, onUpdateMethod, onSetStatus, onExportXLSX }) {
  const { client, faturas, total } = data;
  const [val,  setVal]  = useState("");
  const [desc, setDesc] = useState("");
  const [dt,   setDt]   = useState(todayStr());

  const handleAdd = () => {
    if (!val) return;
    onAddConsumo(client.id, dt, val, desc||"Consumo");
    setVal(""); setDesc(""); setDt(todayStr());
  };

  return (
    <div>
      <Card style={{marginBottom:20,padding:22}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
          <div style={{display:"flex",gap:14,alignItems:"center"}}>
            <div style={{
              width:52,height:52,borderRadius:14,flexShrink:0,
              background:"linear-gradient(135deg,#4F46E5,#6D28D9)",
              display:"flex",alignItems:"center",justifyContent:"center",
            }}>
              <User size={24} color="#fff"/>
            </div>
            <div>
              <div style={{fontSize:20,fontWeight:900,color:"#111"}}>{client.name}</div>
              <div style={{display:"flex",gap:14,marginTop:5,flexWrap:"wrap"}}>
                {client.email && (
                  <span style={{fontSize:12,color:"#6B7280",display:"flex",gap:4,alignItems:"center"}}>
                    <Mail size={11}/>{client.email}
                  </span>
                )}
                {client.phone && (
                  <span style={{fontSize:12,color:"#6B7280",display:"flex",gap:4,alignItems:"center"}}>
                    <Phone size={11}/>{client.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:14,alignItems:"center",flexWrap:"wrap"}}>
            <div>
              <Lbl>MÉTODO DE PAGAMENTO</Lbl>
              <select
                value={client.method}
                onChange={e=>onUpdateMethod(client.id,e.target.value)}
                style={{
                  padding:"8px 12px",borderRadius:10,border:"1px solid #E5E7EB",
                  fontSize:13,fontWeight:600,background:"#fff",cursor:"pointer",fontFamily:"inherit",
                }}
              >
                <option value="BOLETO">BOLETO</option>
                <option value="PIX">PIX</option>
              </select>
            </div>
            <div style={{
              background:"linear-gradient(135deg,#4F46E5,#6D28D9)",
              borderRadius:14,padding:"12px 22px",color:"#fff",textAlign:"center",flexShrink:0,
            }}>
              <div style={{fontSize:10,fontWeight:700,opacity:.8,letterSpacing:.8}}>TOTAL CLIENTE</div>
              <div style={{fontSize:22,fontWeight:900,marginTop:2}}>{BRL(total)}</div>
            </div>
          </div>
        </div>
      </Card>

      <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:20,alignItems:"start"}}>
        <Card>
          <div style={{fontSize:14,fontWeight:800,color:"#111",marginBottom:16}}>Registrar Consumo</div>
          <div style={{marginBottom:12}}>
            <Lbl>VALOR (R$) *</Lbl>
            <Inp value={val} onChange={setVal} placeholder="0,00"/>
          </div>
          <div style={{marginBottom:12}}>
            <Lbl>DESCRIÇÃO</Lbl>
            <Inp value={desc} onChange={setDesc} placeholder="Ex: Produto A"/>
          </div>
          <div style={{marginBottom:16}}>
            <Lbl>DATA</Lbl>
            <input
              type="date" value={dt} onChange={e=>setDt(e.target.value)}
              style={{
                width:"100%",boxSizing:"border-box",padding:"10px 12px",borderRadius:10,
                border:"1px solid #E5E7EB",fontSize:14,fontFamily:"inherit",outline:"none",
              }}
            />
          </div>
          <Btn onClick={handleAdd} disabled={!val} style={{width:"100%",justifyContent:"center"}}>
            <Plus size={15}/> Lançar Consumo
          </Btn>
        </Card>

        <div>
          <div style={{fontSize:14,fontWeight:800,color:"#111",marginBottom:14}}>Faturas e lançamentos</div>
          {faturas.length===0 ? (
            <div style={{
              border:"2px dashed #E5E7EB",borderRadius:16,padding:40,
              textAlign:"center",color:"#9CA3AF",
            }}>
              <Receipt size={32} style={{opacity:.25,marginBottom:10}}/>
              <div>Nenhum lançamento registrado</div>
            </div>
          ) : faturas.map(f=>(
            <Card key={f.key} style={{marginBottom:14,padding:0,overflow:"hidden"}}>
              <div style={{
                padding:"14px 18px",background:"#FAFAFA",
                borderBottom:"1px solid #F3F4F6",
                display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8,
              }}>
                <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                  <span style={{fontSize:15,fontWeight:800,color:"#111"}}>{mLabel(f.monthYear)}</span>
                  <span style={{fontSize:12,color:"#9CA3AF"}}>{f.count} lanç.</span>
                  <span style={{fontWeight:800,color:"#4F46E5"}}>{BRL(f.total)}</span>
                  <MethodChip method={f.method}/>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <StatusSel value={f.status} onChange={v=>onSetStatus(f.key,v)}/>
                  <Btn variant="success" onClick={()=>onExportXLSX(f)} style={{padding:"4px 10px",fontSize:11}}>
                    XLSX
                  </Btn>
                </div>
              </div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead>
                  <tr style={{background:"#F9FAFB"}}>
                    {["Data","Descrição","Valor",""].map(h=>(
                      <th key={h} style={{
                        padding:"8px 16px",textAlign:"left",
                        fontSize:10,fontWeight:700,color:"#9CA3AF",letterSpacing:.5,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...f.consumos].sort((a,b)=>a.date.localeCompare(b.date)).map(c=>(
                    <tr key={c.id} style={{borderTop:"1px solid #F3F4F6"}}>
                      <td style={{padding:"10px 16px",color:"#374151",whiteSpace:"nowrap"}}>{fmtD(c.date)}</td>
                      <td style={{padding:"10px 16px",color:"#374151"}}>{c.desc}</td>
                      <td style={{padding:"10px 16px",fontWeight:800,color:"#111",whiteSpace:"nowrap"}}>{BRL(c.value)}</td>
                      <td style={{padding:"10px 16px",textAlign:"right"}}>
                        <button
                          onClick={()=>onDeleteConsumo(client.id,c.id)}
                          style={{
                            background:"none",border:"none",cursor:"pointer",
                            color:"#EF4444",padding:4,borderRadius:6,
                          }}
                        >
                          <Trash2 size={13}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══ FaturasTab ═════════════════════════════════════════════════════════ */

function FaturasTab({
  faturas, total, years,
  fy, setFy, fm, setFm, fs, setFs,
  onSelectClient, onSetStatus, onExportXLSX, onExportBatch,
}) {
  const selStyle = {
    padding:"9px 12px",borderRadius:10,border:"1px solid #E5E7EB",
    fontSize:13,background:"#fff",fontFamily:"inherit",cursor:"pointer",
  };

  return (
    <div>
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        <select value={fy} onChange={e=>setFy(e.target.value)} style={selStyle}>
          <option value="all">Todos os anos</option>
          {years.map(y=><option key={y} value={y}>{y}</option>)}
        </select>
        <select value={fm} onChange={e=>setFm(e.target.value)} style={selStyle}>
          <option value="all">Todos os meses</option>
          {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select value={fs} onChange={e=>setFs(e.target.value)} style={selStyle}>
          <option value="all">Todos os status</option>
          {Object.keys(STATUS_CFG).map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div style={{
        background:"#EEF2FF",borderRadius:14,padding:18,marginBottom:20,
        display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,
      }}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:"#4F46E5",marginBottom:4,letterSpacing:.5}}>TOTAL FILTRADO</div>
          <div style={{fontSize:26,fontWeight:900,color:"#4338CA"}}>{BRL(total)}</div>
          <Chip color="#4338CA" bg="#C7D2FE" style={{marginTop:6}}>
            {faturas.length} fatura{faturas.length!==1?"s":""}
          </Chip>
        </div>
        <Btn variant="success" onClick={onExportBatch} style={{padding:"10px 18px"}}>
          <Download size={15}/> Exportar XLSX
        </Btn>
      </div>

      {faturas.length===0 ? (
        <div style={{border:"2px dashed #E5E7EB",borderRadius:16,padding:60,textAlign:"center",color:"#9CA3AF"}}>
          Nenhuma fatura no filtro selecionado
        </div>
      ) : (
        <Card style={{padding:0,overflow:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr style={{background:"#F9FAFB"}}>
                {["Mês/Ano","Cliente","Lanç.","Método","Total","Status",""].map(h=>(
                  <th key={h} style={{
                    padding:"12px 16px",textAlign:"left",
                    fontSize:10,fontWeight:700,color:"#9CA3AF",letterSpacing:.5,whiteSpace:"nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {faturas.map(f=>(
                <tr key={f.key} style={{borderTop:"1px solid #F3F4F6"}}>
                  <td style={{padding:"12px 16px",color:"#374151",fontWeight:600,whiteSpace:"nowrap"}}>{mLabel(f.monthYear)}</td>
                  <td style={{padding:"12px 16px"}}>
                    <span
                      onClick={()=>onSelectClient(f.clientId)}
                      style={{color:"#4F46E5",fontWeight:700,cursor:"pointer",textDecoration:"underline"}}
                    >
                      {f.clientName}
                    </span>
                  </td>
                  <td style={{padding:"12px 16px",color:"#6B7280"}}>{f.count}</td>
                  <td style={{padding:"12px 16px"}}><MethodChip method={f.method}/></td>
                  <td style={{padding:"12px 16px",fontWeight:800,color:"#111",whiteSpace:"nowrap"}}>{BRL(f.total)}</td>
                  <td style={{padding:"12px 16px"}}>
                    <StatusSel value={f.status} onChange={v=>onSetStatus(f.key,v)}/>
                  </td>
                  <td style={{padding:"12px 16px"}}>
                    <Btn variant="success" onClick={()=>onExportXLSX(f)} style={{padding:"4px 8px",fontSize:11}}>
                      XLSX
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

/* ═══ App ════════════════════════════════════════════════════════════════ */

export default function App() {
  const [fatStatus,setFatStatus]= useState({});
  const [selId,    setSelId]    = useState(null);
  const [tab,      setTab]      = useState("clientes");
  const [search,   setSearch]   = useState("");
  const [showModal,setShowModal]= useState(false);
  const [form,     setForm]     = useState({name:"",email:"",phone:"",method:"BOLETO"});
  const [fy,       setFy]       = useState("all");
  const [fm,       setFm]       = useState("all");
  const [fs,       setFs]       = useState("all");
  const [toast,    setToast]    = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    fetch('https://convenio-api.onrender.com/api/clientes')
      .then(res => res.json())
      .then(data => setClients(data))
      .catch(err => showToast("Erro ao carregar o banco de dados", "error"));
  }, []);

  const showToast = (msg,type="success") => setToast({msg,type});

  /* ── Derived ── */
  const allConsumos = useMemo(()=>clients.flatMap(c=>c.consumos),[clients]);
  const totalGeral  = useMemo(()=>allConsumos.reduce((s,c)=>s+c.value,0),[allConsumos]);
  const ticketMedio = useMemo(()=>allConsumos.length ? totalGeral/allConsumos.length : 0,[totalGeral,allConsumos]);

  const allFaturas = useMemo(()=>{
    const map = {};
    clients.forEach(cl=>{
      cl.consumos.forEach(c=>{
        const key = `${cl.id}_${mkKey(c.date)}`;
        if(!map[key]) map[key]={
          key, clientId:cl.id, clientName:cl.name,
          clientEmail:cl.email, clientPhone:cl.phone,
          monthYear:mkKey(c.date), consumos:[], total:0, count:0,
        };
        map[key].consumos.push(c);
        map[key].total += c.value;
        map[key].count++;
      });
    });
    return Object.values(map).sort((a,b)=>b.monthYear.localeCompare(a.monthYear));
  },[clients]);

  const richFaturas = useMemo(()=>
    allFaturas.map(f=>({
      ...f,
      method: clients.find(c=>c.id===f.clientId)?.method||"BOLETO",
      status: fatStatus[f.key]||"FEITA",
    })),
    [allFaturas,clients,fatStatus]
  );

  const years = useMemo(()=>[...new Set(richFaturas.map(f=>f.monthYear.slice(0,4)))].sort().reverse(),[richFaturas]);

  const filteredFaturas = useMemo(()=>richFaturas.filter(f=>{
    const [y,m] = f.monthYear.split("-");
    if(fy!=="all" && y!==fy) return false;
    if(fm!=="all" && +m!==+fm) return false;
    if(fs!=="all" && f.status!==fs) return false;
    return true;
  }),[richFaturas,fy,fm,fs]);

  const filteredTotal = useMemo(()=>filteredFaturas.reduce((s,f)=>s+f.total,0),[filteredFaturas]);

  const filteredClients = useMemo(()=>{
    const q = search.toLowerCase();
    return !q ? clients : clients.filter(c=>
      c.name.toLowerCase().includes(q)||
      c.email.toLowerCase().includes(q)||
      c.phone.includes(q)
    );
  },[clients,search]);

  const clientData = useMemo(()=>{
    if(!selId) return null;
    const client = clients.find(c=>c.id===selId);
    if(!client) return null;
    const faturas = richFaturas.filter(f=>f.clientId===selId).sort((a,b)=>b.monthYear.localeCompare(a.monthYear));
    const total   = client.consumos.reduce((s,c)=>s+c.value,0);
    return {client,faturas,total};
  },[selId,clients,richFaturas]);

  /* ── Actions ── */
  const addClient = async () => {
    if(!form.name.trim()) return;

    const novoCliente = { ...form, id: uid(), consumos: [] };

    try {
      // Manda para o Node.js
      await fetch('https://convenio-api.onrender.com/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoCliente)
      });

      // Atualiza a tela
      setClients(p => [novoCliente, ...p]);
      setForm({name:"", email:"", phone:"", method:"BOLETO"});
      setShowModal(false);
      showToast("Cliente salvo com sucesso.");
    } catch (err) {
      showToast("Erro ao salvar no banco", "error");
    }
  };

  const addConsumo = async (clientId, date, valStr, desc) => {
    const value = parseFloat(String(valStr).replace(",","."));
    if(isNaN(value)||value<=0) return;

    const novoConsumo = { id: uid(), date, desc, value };

    try {
      await fetch(`https://convenio-api.onrender.com/api/clientes/${clientId}/consumos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoConsumo)
      });

      // Atualiza a tela
      setClients(p => p.map(c => c.id === clientId
        ? {...c, consumos: [...c.consumos, novoConsumo]}
        : c
      ));
      showToast("Consumo salvo com sucesso.");
    } catch (err) {
      showToast("Erro ao salvar consumo", "error");
    }
  };

  const deleteConsumo = (clientId,consumoId) => {
    setClients(p=>p.map(c=>c.id===clientId
      ? {...c,consumos:c.consumos.filter(x=>x.id!==consumoId)}
      : c
    ));
  };

  const updateMethod = (clientId,method) => {
    setClients(p=>p.map(c=>c.id===clientId?{...c,method}:c));
  };

  const setFatura = (key,status) => {
    setFatStatus(p=>({...p,[key]:status}));
  };

  const exportJSON = () => {
    const blob = new Blob(
      [JSON.stringify({version:1,exportedAt:new Date().toISOString(),clients,faturasStatus:fatStatus},null,2)],
      {type:"application/json"}
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `conveniopro-${todayStr()}.json`;
    a.click();
  };

  const importJSON = e => {
    const f = e.target.files[0];
    if(!f) return;
    const r = new FileReader();
    r.onload = ev => {
      try {
        const d = JSON.parse(ev.target.result);
        setClients(d.clients||[]);
        setFatStatus(d.faturasStatus||{});
        showToast("Dados importados com sucesso!");
      } catch {
        showToast("Arquivo inválido.","error");
      }
    };
    r.readAsText(f);
    e.target.value = "";
  };

  const exportXLSX = fatura => {
    try {
      const wb = XLSX.utils.book_new();
      const rows = [
        ["Cliente",   fatura.clientName],
        ["E-mail",    fatura.clientEmail],
        ["Telefone",  fatura.clientPhone],
        ["Mês/Ano",   mLabel(fatura.monthYear)],
        ["Método",    fatura.method],
        ["Status",    fatura.status],
        ["Total",     fatura.total],
        [],
        ["#","Data","Descrição","Valor (R$)"],
      ];
      [...fatura.consumos].sort((a,b)=>a.date.localeCompare(b.date)).forEach((c,i)=>{
        rows.push([i+1, fmtD(c.date), c.desc, c.value]);
      });
      rows.push(["","","TOTAL", fatura.total]);
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb,ws,"Fatura");
      XLSX.writeFile(wb,`fatura-${fatura.clientName.replace(/\s+/g,"-")}-${fatura.monthYear}.xlsx`);
    } catch(err) {
      showToast("Erro ao exportar XLSX.","error");
    }
  };

  const exportBatch = () => {
    try {
      const wb = XLSX.utils.book_new();
      const rows = [["Mês/Ano","Cliente","E-mail","Telefone","Lançamentos","Método","Status","Total (R$)"]];
      filteredFaturas.forEach(f=>rows.push([
        mLabel(f.monthYear), f.clientName, f.clientEmail, f.clientPhone,
        f.count, f.method, f.status, f.total,
      ]));
      rows.push(["","","","","","","TOTAL",filteredTotal]);
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb,ws,"Faturas");
      const suffix = [
        fy!=="all"?fy:"",
        fm!=="all"?String(fm).padStart(2,"0"):"",
      ].filter(Boolean).join("-")||"todos";
      XLSX.writeFile(wb,`faturas-${suffix}.xlsx`);
    } catch(err) {
      showToast("Erro ao exportar XLSX.","error");
    }
  };

  /* ── Render ── */
  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:"#F4F3F0",minHeight:"100vh",color:"#111827"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;0,9..40,900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes toastIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
        select { font-family: inherit; }
        button { font-family: inherit; }
        input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.6; }
      `}</style>

      <input ref={fileRef} type="file" accept=".json" onChange={importJSON} style={{display:"none"}}/>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}

      {/* ─── Header ─── */}
      <header style={{
        position:"sticky",top:0,zIndex:100,
        background:"rgba(255,255,255,.92)",backdropFilter:"blur(14px)",
        borderBottom:"1px solid #EBEBEB",
        padding:"12px 24px",
        display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{
            width:36,height:36,borderRadius:10,flexShrink:0,
            background:"linear-gradient(135deg,#4F46E5,#6D28D9)",
            display:"flex",alignItems:"center",justifyContent:"center",
          }}>
            <Receipt size={18} color="#fff"/>
          </div>
          <div>
            <div style={{fontSize:16,fontWeight:900,color:"#111",lineHeight:1.1}}>ConvênioPro</div>
            <div style={{fontSize:11,color:"#9CA3AF",fontWeight:500}}>Controle de consumo de clientes</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          {selId ? (
            <Btn onClick={()=>setSelId(null)} variant="secondary">
              <ArrowLeft size={15}/> Voltar
            </Btn>
          ) : (
            <>
              <Btn onClick={()=>fileRef.current.click()} variant="secondary">
                <Upload size={15}/> Importar
              </Btn>
              <Btn onClick={exportJSON} variant="secondary">
                <Download size={15}/> Salvar JSON
              </Btn>
              <Btn onClick={()=>setShowModal(true)}>
                <Plus size={15}/> Novo Cliente
              </Btn>
            </>
          )}
        </div>
      </header>

      {/* ─── Summary cards ─── */}
      <div style={{
        display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:16,
        padding:"20px 24px 0",maxWidth:1400,margin:"0 auto",
      }}>
        <Card style={{
          background:"linear-gradient(135deg,#4F46E5,#6D28D9)",color:"#fff",padding:22,
        }}>
          <div style={{fontSize:11,fontWeight:700,opacity:.75,letterSpacing:.7,marginBottom:8}}>
            TOTAL GERAL DE CONSUMO
          </div>
          <div style={{fontSize:30,fontWeight:900}}>{BRL(totalGeral)}</div>
        </Card>
        <Card style={{padding:22}}>
          <div style={{fontSize:11,fontWeight:700,color:"#6B7280",letterSpacing:.7,marginBottom:8}}>
            CLIENTES ATIVOS
          </div>
          <div style={{fontSize:28,fontWeight:900,color:"#111"}}>{clients.length}</div>
          <Users size={16} color="#4F46E5" style={{marginTop:6}}/>
        </Card>
        <Card style={{padding:22}}>
          <div style={{fontSize:11,fontWeight:700,color:"#6B7280",letterSpacing:.7,marginBottom:8}}>
            TICKET MÉDIO
          </div>
          <div style={{fontSize:22,fontWeight:900,color:"#111"}}>{BRL(ticketMedio)}</div>
          <div style={{fontSize:11,color:"#9CA3AF",marginTop:4}}>{allConsumos.length} lançamentos</div>
        </Card>
      </div>

      {/* ─── Main ─── */}
      <main style={{padding:24,maxWidth:1400,margin:"0 auto"}}>
        {selId && clientData ? (
          <ClientDetail
            data={clientData}
            onAddConsumo={addConsumo}
            onDeleteConsumo={deleteConsumo}
            onUpdateMethod={updateMethod}
            onSetStatus={setFatura}
            onExportXLSX={exportXLSX}
          />
        ) : (
          <>
            {/* Tabs */}
            <div style={{
              display:"inline-flex",gap:2,background:"#E5E7EB",
              borderRadius:12,padding:4,marginBottom:20,
            }}>
              {[
                {id:"clientes",label:"Clientes",   Icon:Users},
                {id:"faturas", label:"Faturas",    Icon:Receipt},
              ].map(t=>(
                <button
                  key={t.id} onClick={()=>setTab(t.id)}
                  style={{
                    display:"flex",alignItems:"center",gap:6,
                    padding:"8px 18px",borderRadius:9,border:"none",
                    fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:"pointer",
                    background:tab===t.id?"#fff":"transparent",
                    color:tab===t.id?"#111":"#6B7280",
                    boxShadow:tab===t.id?"0 1px 4px rgba(0,0,0,.1)":"none",
                    transition:"all .15s",
                  }}
                >
                  <t.Icon size={14}/>{t.label}
                </button>
              ))}
            </div>

            {tab==="clientes" ? (
              <div>
                <div style={{position:"relative",marginBottom:18}}>
                  <Search size={15} style={{
                    position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#9CA3AF",
                  }}/>
                  <input
                    value={search} onChange={e=>setSearch(e.target.value)}
                    placeholder="Buscar por razão social, e-mail ou telefone..."
                    style={{
                      width:"100%",padding:"11px 12px 11px 36px",borderRadius:12,
                      border:"1px solid #E5E7EB",fontSize:14,background:"#fff",
                      fontFamily:"inherit",outline:"none",
                    }}
                  />
                </div>

                {/* ── Clients table with inline entry ── */}
                <ClientsTable
                  clients={filteredClients}
                  onSelect={setSelId}
                  onAddConsumo={addConsumo}
                  onToast={showToast}
                />
              </div>
            ) : (
              <FaturasTab
                faturas={filteredFaturas} total={filteredTotal}
                years={years}
                fy={fy} setFy={setFy}
                fm={fm} setFm={setFm}
                fs={fs} setFs={setFs}
                onSelectClient={setSelId}
                onSetStatus={setFatura}
                onExportXLSX={exportXLSX}
                onExportBatch={exportBatch}
              />
            )}
          </>
        )}
      </main>

      {showModal && (
        <NewClientModal
          data={form}
          onChange={setForm}
          onConfirm={addClient}
          onClose={()=>setShowModal(false)}
        />
      )}
    </div>
  );
}