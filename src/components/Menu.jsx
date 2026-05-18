import { useState } from "react";
import { LogOut, Receipt, Briefcase } from "lucide-react";
import ConsumoCliente from "./ConsumoCliente";
import SalarioFuncionario from "./SalarioFuncionario";

function Card({ children, style = {}, onClick, className }) {
  return <div className={className} onClick={onClick} style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,.08)", ...style }}>{children}</div>;
}

export default function Menu({ token, empresaEmail, empresaNome, onLogout }) {
  const [activeTab, setActiveTab] = useState('home');

  if (activeTab === 'consumo') {
    return <ConsumoCliente token={token} empresaEmail={empresaEmail} empresaNome={empresaNome} onBack={() => setActiveTab('home')} onLogout={onLogout} />;
  }

  if (activeTab === 'salario') {
    return <SalarioFuncionario onBack={() => setActiveTab('home')} onLogout={onLogout} />;
  }

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:"#F4F3F0",minHeight:"100vh",color:"#111827", padding: 24, display: "flex", flexDirection: "column", alignItems: "center"}}>
      <header style={{width: "100%", maxWidth: 1000, display:"flex", justifyContent:"space-between", alignItems: "center", marginBottom: 40, flexWrap: "wrap", gap: 16}}>
         <div style={{display:"flex",alignItems:"center",gap:12}}>
            <img src="/logo-convenio.png" alt="Logo" style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 12 }} />
            <div style={{fontSize:20,fontWeight:900,color:"#111",lineHeight:1.1}}>ConvênioPro</div>
          </div>
          <div style={{display:"flex", alignItems:"center", gap: 16}}>
            <div style={{fontSize:14, fontWeight:700, color:"#6B7280"}}>Olá, {empresaNome || "Empresa"}</div>
            <button onClick={onLogout} style={{background:"none", border:"none", cursor:"pointer", color:"#EF4444", padding:8, display:"flex", gap:6, alignItems:"center", fontWeight:700}}><LogOut size={16}/> Sair</button>
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
      `}</style>
    </div>
  );
}