import { useState } from "react";
import Login from "./components/Login";
import Menu from "./components/Menu";

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

  return (
    <>
      <style>{`
        :root { color-scheme: light; }
        body { color: #111827; margin: 0; padding: 0; }
        input, select, button, textarea { color: #111827; }
        * { box-sizing: border-box; }
      `}</style>

      {!token ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Menu 
          token={token} 
          empresaEmail={empresaEmail} 
          empresaNome={empresaNome} 
          onLogout={handleLogout} 
        />
      )}
    </>
  );
}