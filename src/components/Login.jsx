import { useState, useEffect } from "react";

const API_URL = 'https://convenio-api-nrfx.onrender.com/api';

function Btn({ children, onClick, disabled = false, style = {} }) {
  return (
    <button onClick={disabled ? undefined : onClick} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .5 : 1, transition: "opacity .15s", fontFamily: "inherit", background: "linear-gradient(135deg,#4F46E5,#6D28D9)", color: "#fff", border: "none", ...style }}>
      {children}
    </button>
  );
}

function Card({ children, style = {} }) {
  return <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,.08)", ...style }}>{children}</div>;
}

function Lbl({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: .6, marginBottom: 6 }}>{children}</div>;
}

function Inp({ value, onChange, placeholder, type="text", style={} }) {
  return <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{ width:"100%",boxSizing:"border-box",padding:"10px 12px",borderRadius:10, border:"1px solid #E5E7EB",fontSize:14,background:"#fff",outline:"none", fontFamily:"inherit", color:"#111827", ...style }} />;
}

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, background: type === "error" ? "#FEE2E2" : "#DCFCE7", color: type === "error" ? "#DC2626" : "#15803D", padding: "12px 18px", borderRadius: 12, fontWeight: 700, fontSize: 13, boxShadow: "0 4px 20px rgba(0,0,0,.15)", animation: "toastIn .3s ease" }}>
      {msg}
    </div>
  );
}

export default function Login({ onLogin }) {
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
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"#F4F3F0", padding: 16, color: "#111827" }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
      <Card style={{ width: "100%", maxWidth: 400, padding: "40px 24px" }}>
        <div style={{ display:"flex", justifyContent:"center", marginBottom: 20 }}>
          <img src="/logo-convenio.png" alt="Logo ConvênioPro" style={{ width: 60, height: 60, objectFit: "contain", borderRadius: 12 }} />
        </div>
        <h2 style={{ textAlign:"center", fontSize:24, fontWeight:900, marginBottom:8, color:"#111" }}>ConvênioPro</h2>
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