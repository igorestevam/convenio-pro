import { ArrowLeft } from "lucide-react";

/* Cabeçalho padrão dos módulos: "ConvênioPro" leva ao menu, "Voltar" aparece quando há onVoltar. */
export default function AppHeader({ subtitle, onMenu, onVoltar, children }) {
  return (
    <header className="app-header">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {onVoltar && (
          <button onClick={onVoltar} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", marginRight: 8, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", background: "#fff", color: "#374151", border: "1px solid #E5E7EB" }}>
            <ArrowLeft size={15} /> Voltar
          </button>
        )}
        <div onClick={onMenu} title="Voltar ao menu" style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
          <img src="/logo-convenio.png" alt="Logo" style={{ width: 36, height: 36, objectFit: "contain", flexShrink: 0, borderRadius: 12 }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#111", lineHeight: 1.1 }}>ConvênioPro</div>
            {subtitle && <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>{subtitle}</div>}
          </div>
        </div>
      </div>
      <div className="header-actions" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {children}
      </div>
    </header>
  );
}
