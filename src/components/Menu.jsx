import { useState, useEffect } from "react";
import { LogOut, Receipt, Briefcase, Settings, X, Edit3, Shield, User as UserIcon } from "lucide-react";
import ConsumoCliente from "./ConsumoCliente";
import SalarioFuncionario from "./SalarioFuncionario";

const API_URL = 'https://convenio-api-nrfx.onrender.com/api';

/* ─── Micro Componentes de UI ─── */
function Card({ children, style = {}, onClick, className }) {
  return <div className={className} onClick={onClick} style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,.08)", ...style }}>{children}</div>;
}

function Btn({ children, onClick, type = "button", disabled = false, variant = "primary", style = {} }) {
  const themes = {
    primary: { background: "linear-gradient(135deg,#4F46E5,#6D28D9)", color: "#fff", border: "none" },
    secondary: { background: "#fff", color: "#374151", border: "1px solid #E5E7EB" },
  };
  return (
    <button type={type} onClick={disabled ? undefined : onClick} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .5 : 1, transition: "opacity .15s", fontFamily: "inherit", ...themes[variant], ...style }}>
      {children}
    </button>
  );
}

function Lbl({ children, style = {} }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: .6, marginBottom: 6, ...style }}>{children}</div>;
}

function Inp({ value, onChange, placeholder, type = "text", style = {}, ...rest }) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 14, background: "#fff", outline: "none", fontFamily: "inherit", color: "#111827", ...style }} {...rest} />;
}

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, background: type === "error" ? "#FEE2E2" : "#DCFCE7", color: type === "error" ? "#DC2626" : "#15803D", padding: "12px 18px", borderRadius: 12, fontWeight: 700, fontSize: 13, boxShadow: "0 4px 20px rgba(0,0,0,.15)", animation: "toastIn .3s ease" }}>
      {msg}
    </div>
  );
}

/* ─── Modal de Edição de Conta (Padrão Profissional) ─── */
function ProfileModal({ token, initialName, initialEmail, onClose, onLogout }) {
  // Controle de Telas do Pop-up
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  // Campos do Formulário
  const [name, setName] = useState(initialName || "");
  const [email, setEmail] = useState(initialEmail || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Trava de segurança no frontend
    if (isChangingPwd && currentPassword && !newPassword) {
      setToast({ msg: "Por favor, digite a nova senha.", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name, email, currentPassword, newPassword })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.erro || 'Erro ao atualizar os dados da conta.');
      
      setToast({ msg: "Conta atualizada com sucesso!", type: "success" });
      
      // Desloga após 2.5s para forçar o login com a nova senha/dados
      setTimeout(() => onLogout(), 2500); 

    } catch (err) {
      setToast({ msg: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,20,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, backdropFilter: "blur(6px)", padding: 16 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      
      <Card style={{ width: "100%", maxWidth: 460, padding: 32, animation: "toastIn .2s ease" }}>
        
        {/* Cabeçalho do Modal */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#111" }}>Configurações da Conta</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}><X size={20} /></button>
        </div>

        {!isEditing ? (
          /* ─── MODO 1: VISUALIZAÇÃO (READ-ONLY) ─── */
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            
            {/* Avatar e Infos Principais */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, paddingBottom: 20, borderBottom: "1px solid #E5E7EB" }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg,#4F46E5,#6D28D9)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 26, fontWeight: 900 }}>
                {name ? name.charAt(0).toUpperCase() : <UserIcon size={28} />}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#111" }}>{name}</div>
                <div style={{ fontSize: 14, color: "#6B7280", marginTop: 2 }}>{email}</div>
              </div>
            </div>

            {/* Visualização da Senha */}
            <div>
              <Lbl>SENHA DE ACESSO</Lbl>
              <div style={{ fontSize: 18, color: "#111", fontWeight: 800, letterSpacing: 4, marginTop: 4 }}>••••••••</div>
            </div>

            <Btn onClick={() => setIsEditing(true)} style={{ width: "100%", marginTop: 10, padding: "12px 16px" }}>
              <Edit3 size={16} /> Editar Informações
            </Btn>
          </div>
        ) : (
          /* ─── MODO 2: EDIÇÃO DE DADOS E SENHA ─── */
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            
            <div><Lbl>NOME DA EMPRESA</Lbl><Inp type="text" value={name} onChange={setName} /></div>
            <div><Lbl>E-MAIL</Lbl><Inp type="email" value={email} onChange={setEmail} /></div>
            
            {/* Bloco de Segurança (Senha) */}
            <div style={{ background: "#FAFAFA", padding: 18, borderRadius: 14, border: "1px solid #E5E7EB", marginTop: 8 }}>
              {!isChangingPwd ? (
                // Antes de pedir para alterar a senha
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ background: "#F3F4F6", padding: 8, borderRadius: 10 }}><Shield size={18} color="#4B5563" /></div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#374151" }}>Segurança</div>
                      <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>Alterar sua senha de acesso</div>
                    </div>
                  </div>
                  <button type="button" onClick={() => setIsChangingPwd(true)} style={{ background: "#fff", border: "1px solid #D1D5DB", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#374151" }}>Alterar</button>
                </div>
              ) : (
                // Fluxo de Troca de Senha com Revelação Progressiva
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Lbl style={{ marginBottom: 0 }}>CONFIRME SUA SENHA ATUAL</Lbl>
                    <button type="button" onClick={() => { setIsChangingPwd(false); setCurrentPassword(""); setNewPassword(""); }} style={{ background: "none", border: "none", fontSize: 11, color: "#EF4444", cursor: "pointer", fontWeight: 700 }}>Cancelar</button>
                  </div>
                  
                  <Inp type="password" placeholder="Digite a senha atual" value={currentPassword} onChange={setCurrentPassword} autoComplete="new-password" />

                  {/* A MÁGICA AQUI: O campo da nova senha SÓ renderiza se a atual tiver texto */}
                  {currentPassword.length > 0 && (
                    <div style={{ animation: "toastIn .3s ease", display: "flex", flexDirection: "column", gap: 14, marginTop: 4, paddingTop: 14, borderTop: "1px dashed #D1D5DB" }}>
                      <Lbl style={{ marginBottom: 0 }}>CRIE UMA NOVA SENHA</Lbl>
                      <Inp type="password" placeholder="Digite a nova senha" value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Botões de Ação Final */}
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <Btn type="button" onClick={() => { setIsEditing(false); setIsChangingPwd(false); setCurrentPassword(""); setNewPassword(""); }} variant="secondary" style={{ flex: 1 }}>Voltar</Btn>
              <Btn type="submit" disabled={loading || !name || !email} style={{ flex: 1 }}>
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Btn>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}

/* ─── Menu Principal (O Hub) ─── */
export default function Menu({ token, empresaEmail, empresaNome, onLogout }) {
  const [activeTab, setActiveTab] = useState('home');
  const [showProfileModal, setShowProfileModal] = useState(false);

  if (activeTab === 'consumo') {
    return <ConsumoCliente token={token} empresaEmail={empresaEmail} empresaNome={empresaNome} onBack={() => setActiveTab('home')} onLogout={onLogout} />;
  }

  if (activeTab === 'salario') {
    return <SalarioFuncionario token={token} empresaEmail={empresaEmail} empresaNome={empresaNome} onBack={() => setActiveTab('home')} onLogout={onLogout} />;
  }

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:"#F4F3F0",minHeight:"100vh",color:"#111827", padding: 24, display: "flex", flexDirection: "column", alignItems: "center"}}>
      
      {showProfileModal && (
        <ProfileModal 
          token={token} 
          initialName={empresaNome} 
          initialEmail={empresaEmail} 
          onClose={() => setShowProfileModal(false)} 
          onLogout={onLogout} 
        />
      )}

      <header style={{width: "100%", maxWidth: 1000, display:"flex", justifyContent:"space-between", alignItems: "center", marginBottom: 40, flexWrap: "wrap", gap: 16}}>
         <div style={{display:"flex",alignItems:"center",gap:12}}>
            <img src="/logo-convenio.png" alt="Logo" style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 12 }} />
            <div style={{fontSize:20,fontWeight:900,color:"#111",lineHeight:1.1}}>ConvênioPro</div>
          </div>
          
          <div style={{display:"flex", alignItems:"center", gap: 16}}>
            <div style={{fontSize:14, fontWeight:700, color:"#6B7280"}}>Olá, {empresaNome || "Empresa"}</div>
            
            <div style={{display: "flex", gap: 8}}>
              <button onClick={() => setShowProfileModal(true)} style={{background:"#E5E7EB", border:"none", borderRadius: 8, cursor:"pointer", color:"#374151", padding:"8px 12px", display:"flex", gap:6, alignItems:"center", fontWeight:700}}>
                <Settings size={16}/> Minha Conta
              </button>
              <button onClick={onLogout} style={{background:"none", border:"none", cursor:"pointer", color:"#EF4444", padding:8, display:"flex", gap:6, alignItems:"center", fontWeight:700}}>
                <LogOut size={16}/> Sair
              </button>
            </div>
          </div>
      </header>

      <div style={{width: "100%", maxWidth: 1000}}>
        <h1 style={{fontSize: 28, fontWeight: 900, marginBottom: 8}}>Selecione um Módulo</h1>
        <p style={{color: "#6B7280", marginBottom: 32}}>O que você deseja gerenciar hoje?</p>

        <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24}}>
          <Card style={{cursor: "pointer", padding: 32, border: "2px solid transparent"}} onClick={() => setActiveTab('consumo')} className="menu-card">
            <div style={{width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,#4F46E5,#6D28D9)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20}}>
              <Receipt size={28} color="#fff" />
            </div>
            <h2 style={{fontSize: 20, fontWeight: 900, marginBottom: 8}}>Consumo de Clientes</h2>
            <p style={{color: "#6B7280", fontSize: 14, lineHeight: 1.5}}>Gerencie as faturas em aberto, lance consumos diários e acompanhe o ticket médio dos convênios.</p>
          </Card>

          <Card style={{cursor: "pointer", padding: 32, border: "2px solid transparent"}} onClick={() => setActiveTab('salario')} className="menu-card">
            <div style={{width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,#059669,#10B981)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20}}>
              <Briefcase size={28} color="#fff" />
            </div>
            <h2 style={{fontSize: 20, fontWeight: 900, marginBottom: 8}}>Salário de Funcionários</h2>
            <p style={{color: "#6B7280", fontSize: 14, lineHeight: 1.5}}>Controle a folha de pagamento, vales, adiantamentos e o fechamento mensal da equipe.</p>
          </Card>
        </div>
      </div>

      <style>{`
        .menu-card { transition: transform 0.2s, box-shadow 0.2s, border 0.2s; }
        .menu-card:hover { transform: translateY(-4px); box-shadow: 0 10px 25px rgba(0,0,0,0.1) !important; border: 2px solid #E5E7EB; }
        @keyframes toastIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
      `}</style>
    </div>
  );
}