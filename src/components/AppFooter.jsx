export default function AppFooter() {
  const year = new Date().getFullYear();
  return (
    <footer style={{ width: "100%", padding: "32px 24px", marginTop: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 800, color: "#9CA3AF" }}>
        <span>&copy; {year} ConvênioPro</span>
        <span style={{ fontSize: 10, opacity: 0.5 }}>•</span>
        <span>Versão 1.0.0</span>
      </div>
      <div style={{ fontSize: 11, color: "#D1D5DB", fontWeight: 600, letterSpacing: 0.5 }}>
        Desenvolvido por Igor Estevam
      </div>
    </footer>
  );
}