import { ArrowLeft, LogOut, Wallet } from "lucide-react";

function Card({ children, style = {} }) {
  return <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,.08)", ...style }}>{children}</div>;
}

function Btn({ children, onClick, variant = "primary", style = {} }) {
  const themes = {
    primary: { background: "linear-gradient(135deg,#4F46E5,#6D28D9)", color: "#fff", border: "none" },
    secondary: { background: "#fff", color: "#374151", border: "1px solid #E5E7EB" },
  };
  return (
    <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", ...themes[variant], ...style }}>
      {children}
    </button>
  );
}

export default function SalarioFuncionario({ onBack, onLogout }) {
  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:"#F4F3F0",minHeight:"100vh",color:"#111827", padding: 24}}>
      <header style={{display:"flex", justifyContent:"space-between", marginBottom: 24}}>
        <Btn onClick={onBack} variant="secondary"><ArrowLeft size={15}/> Voltar ao Menu</Btn>
        <button onClick={onLogout} style={{background:"none", border:"none", cursor:"pointer", color:"#EF4444", padding:8}} title="Sair"><LogOut size={18}/></button>
      </header>
      <div style={{display:"flex", justifyContent:"center", marginTop: "10vh"}}>
        <Card style={{textAlign: "center", padding: "60px 40px", maxWidth: 500, width: "100%"}}>
          <Wallet size={56} color="#10B981" style={{marginBottom: 16, opacity: 0.8}} />
          <h2 style={{fontSize: 24, fontWeight: 900, marginBottom: 8}}>Controle de Salários</h2>
          <p style={{color: "#6B7280", lineHeight: 1.5}}>Este módulo será desenvolvido em breve. Aqui você poderá gerenciar a folha de pagamento, vales e adiantamentos da equipe.</p>
        </Card>
      </div>
    </div>
  );
}