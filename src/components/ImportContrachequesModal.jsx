import { useState, useMemo } from "react";
import { X, Upload, Loader2, AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import useLockBodyScroll from "../hooks/useLockBodyScroll";
import closeOnBackdrop from "../utils/closeOnBackdrop";
import { lerContrachequesPDF, sugerirFuncionario } from "../utils/contracheque";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const BRL = (n) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
const mLabel = (k) => { const [y, m] = k.split("-"); return `${MONTHS[+m - 1]}/${y}`; };
const differs = (a, b) => Math.abs((a || 0) - (b || 0)) > 0.01;

const btn = (primary, disabled) => ({
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, fontFamily: "inherit",
  cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .5 : 1,
  ...(primary ? { background: "linear-gradient(135deg, #059669, #10B981)", color: "#fff", border: "none" } : { background: "#fff", color: "#374151", border: "1px solid #E5E7EB" }),
});
const th = { padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 800, color: "#9CA3AF", letterSpacing: .5, whiteSpace: "nowrap", borderBottom: "2px solid #F3F4F6" };
const td = { padding: "10px 12px", fontSize: 13, verticalAlign: "top" };

/* Soma de vales e consumos lançados no sistema para o funcionário no mês (para comparar com o contracheque). */
function lancadosNoMes(func, month, folhaStatus) {
  if (!func) return { vales: 0, consumos: 0 };
  const entries = (func.entries || []).filter(e => e.date.slice(0, 7) === month);
  const vales = entries.filter(e => e.type !== "CONSUMO").reduce((s, e) => s + e.value, 0);
  const consumos = (folhaStatus[`${func.id}_${month}`]?.consumo || 0) + entries.filter(e => e.type === "CONSUMO").reduce((s, e) => s + e.value, 0);
  return { vales, consumos };
}

export default function ImportContrachequesModal({ funcionarios, folhaStatus, onImport, onClose }) {
  useLockBodyScroll();
  const [stage, setStage] = useState("arquivo"); // arquivo | lendo | conferir | salvando
  const [erro, setErro] = useState("");
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [linhas, setLinhas] = useState([]);

  const ativos = useMemo(() => [...funcionarios].sort((a, b) => a.name.localeCompare(b.name)), [funcionarios]);

  const lerArquivo = async (file) => {
    if (!file) return;
    setErro(""); setNomeArquivo(file.name); setStage("lendo");
    try {
      const paginas = await lerContrachequesPDF(file);
      const validas = paginas.filter(p => p.liquido !== null);
      if (!validas.length) throw new Error("Nenhum contracheque reconhecido neste PDF.");
      setLinhas(paginas.map(p => {
        const func = p.nome ? sugerirFuncionario(p.nome, funcionarios) : null;
        return { ...p, funcId: func?.id || "", mesSel: p.mes || "", incluir: !!func && !p.problemas.length && p.liquido !== null };
      }));
      setStage("conferir");
    } catch (e) {
      console.error(e);
      setErro(e.message?.startsWith("Nenhum") ? e.message : "Não foi possível ler este PDF. Confira se é o arquivo de contracheques (comprovantes de pagamento).");
      setStage("arquivo");
    }
  };

  const setLinha = (i, patch) => setLinhas(ls => ls.map((l, j) => j === i ? { ...l, ...patch } : l));

  // mesmo funcionário + mês escolhido em duas linhas
  const chaves = linhas.filter(l => l.incluir && l.funcId && l.mesSel).map(l => `${l.funcId}_${l.mesSel}`);
  const duplicadas = new Set(chaves.filter((k, i) => chaves.indexOf(k) !== i));
  const selecionadas = linhas.filter(l => l.incluir && l.funcId && l.mesSel && l.liquido !== null);
  const podeImportar = selecionadas.length > 0 && duplicadas.size === 0 && stage === "conferir";

  const importar = async () => {
    setStage("salvando");
    await onImport(selecionadas.map(l => ({
      key: `${l.funcId}_${l.mesSel}`,
      contracheque: { liquido: l.liquido, salarioBase: l.salarioBase, adiantamento: l.adiantamento, descontosDiversos: l.descontosDiversos, totalProventos: l.totalProventos, totalDescontos: l.totalDescontos, nome: l.nome },
    })));
  };

  return (
    <div {...closeOnBackdrop(stage === "salvando" ? () => {} : onClose)} style={{ position: "fixed", inset: 0, background: "rgba(10,10,20,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, backdropFilter: "blur(6px)", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,.08)", width: "100%", maxWidth: stage === "conferir" || stage === "salvando" ? 1100 : 520, padding: 28, animation: "toastIn .2s ease", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#111" }}>Importar contracheques</div>
          <button onClick={onClose} disabled={stage === "salvando"} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 4 }}><X size={20} /></button>
        </div>
        <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 20, lineHeight: 1.5 }}>
          O <b>Valor Líquido</b> de cada contracheque vira o valor a pagar do funcionário no mês. Vales e consumos lançados no sistema <b>não são descontados de novo</b> nesses meses — eles aparecem só para conferência. O PDF é lido no seu navegador e não é enviado a nenhum servidor.
        </div>

        {(stage === "arquivo" || stage === "lendo") && (
          <>
            <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: 36, border: "2px dashed #A7F3D0", borderRadius: 14, background: "#F0FDF4", cursor: stage === "lendo" ? "wait" : "pointer", textAlign: "center" }}>
              {stage === "lendo" ? <Loader2 size={32} color="#059669" style={{ animation: "spin 1.2s linear infinite" }} /> : <Upload size={32} color="#059669" />}
              <div style={{ fontSize: 14, fontWeight: 800, color: "#065F46" }}>{stage === "lendo" ? `Lendo ${nomeArquivo}...` : "Clique para escolher o PDF dos contracheques"}</div>
              <div style={{ fontSize: 12, color: "#6B7280" }}>Pode ser o arquivo com todos os funcionários — uma página por contracheque.</div>
              <input type="file" accept="application/pdf,.pdf" disabled={stage === "lendo"} onChange={e => lerArquivo(e.target.files?.[0])} style={{ display: "none" }} />
            </label>
            {erro && <div style={{ marginTop: 14, fontSize: 12, color: "#DC2626", background: "#FEE2E2", padding: "10px 12px", borderRadius: 8, fontWeight: 600 }}>{erro}</div>}
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </>
        )}

        {(stage === "conferir" || stage === "salvando") && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", marginBottom: 12, flexWrap: "wrap" }}>
              <FileText size={14} color="#059669" /><b>{nomeArquivo}</b> · {linhas.length} página{linhas.length !== 1 ? "s" : ""} · {selecionadas.length} selecionada{selecionadas.length !== 1 ? "s" : ""} para importar
            </div>
            <div style={{ overflowX: "auto", border: "1px solid #F3F4F6", borderRadius: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                <thead>
                  <tr style={{ background: "#F9FAFB" }}>
                    <th style={th}></th><th style={th}>NO CONTRACHEQUE</th><th style={th}>FUNCIONÁRIO NO SISTEMA</th><th style={th}>MÊS</th>
                    <th style={th}>VALOR LÍQUIDO</th><th style={th}>ADIANTAMENTO × VALES</th><th style={th}>DESC. DIVERSOS × CONSUMOS</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l, i) => {
                    const func = funcionarios.find(f => f.id === l.funcId);
                    const lanc = lancadosNoMes(func, l.mesSel, folhaStatus);
                    const extra = folhaStatus[`${l.funcId}_${l.mesSel}`] || {};
                    const avisos = [...l.problemas];
                    if (l.incluir && duplicadas.has(`${l.funcId}_${l.mesSel}`)) avisos.push("mesmo funcionário e mês em outra linha");
                    if (l.incluir && extra.contracheque) avisos.push(`substitui o contracheque já importado (${BRL(extra.contracheque.liquido)})`);
                    if (l.incluir && extra.status === "PAGO") avisos.push("esse mês já está marcado como pago");
                    const bloqueada = l.liquido === null;
                    return (
                      <tr key={i} style={{ borderTop: "1px solid #F3F4F6", background: l.incluir ? "#fff" : "#FAFAFA", opacity: l.incluir ? 1 : .6 }}>
                        <td style={td}><input type="checkbox" checked={l.incluir} disabled={bloqueada || stage === "salvando"} onChange={e => setLinha(i, { incluir: e.target.checked })} style={{ width: 16, height: 16, cursor: "pointer" }} /></td>
                        <td style={td}>
                          <div style={{ fontWeight: 800, color: "#111" }}>{l.nome || "(nome não encontrado)"}</div>
                          <div style={{ fontSize: 11, color: "#9CA3AF" }}>Página {l.pagina}{l.salarioBase ? ` · Salário base ${BRL(l.salarioBase)}` : ""}</div>
                          {avisos.map(a => <div key={a} style={{ fontSize: 11, color: "#B45309", display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}><AlertTriangle size={11} />{a}</div>)}
                        </td>
                        <td style={td}>
                          <select value={l.funcId} disabled={stage === "salvando"} onChange={e => setLinha(i, { funcId: e.target.value, incluir: !!e.target.value && !bloqueada })} style={{ padding: "7px 10px", borderRadius: 8, border: `1px solid ${l.funcId ? "#E5E7EB" : "#FCA5A5"}`, fontSize: 13, fontFamily: "inherit", width: "100%", maxWidth: 230, background: "#fff" }}>
                            <option value="">Selecione...</option>
                            {ativos.map(f => <option key={f.id} value={f.id}>{f.name}{f.active === false ? " (inativo)" : ""}</option>)}
                          </select>
                          {!l.funcId && <div style={{ fontSize: 11, color: "#DC2626", marginTop: 3 }}>Escolha o funcionário</div>}
                        </td>
                        <td style={td}>
                          <input type="month" value={l.mesSel} disabled={stage === "salvando"} onChange={e => setLinha(i, { mesSel: e.target.value })} style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13, fontFamily: "inherit" }} />
                          {l.mesSel && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 3 }}>{mLabel(l.mesSel)}</div>}
                        </td>
                        <td style={{ ...td, fontWeight: 900, color: "#059669", whiteSpace: "nowrap" }}>{l.liquido !== null ? BRL(l.liquido) : "—"}</td>
                        <td style={{ ...td, whiteSpace: "nowrap" }}>
                          <div style={{ fontWeight: 700 }}>{BRL(l.adiantamento)}</div>
                          <div style={{ fontSize: 11, color: func && differs(l.adiantamento, lanc.vales) ? "#B45309" : "#9CA3AF", fontWeight: func && differs(l.adiantamento, lanc.vales) ? 700 : 400 }}>
                            {func ? <>vales lançados: {BRL(lanc.vales)} {differs(l.adiantamento, lanc.vales) ? "⚠" : <CheckCircle2 size={10} style={{ verticalAlign: "middle" }} />}</> : "—"}
                          </div>
                        </td>
                        <td style={{ ...td, whiteSpace: "nowrap" }}>
                          <div style={{ fontWeight: 700 }}>{BRL(l.descontosDiversos)}</div>
                          <div style={{ fontSize: 11, color: func && differs(l.descontosDiversos, lanc.consumos) ? "#B45309" : "#9CA3AF", fontWeight: func && differs(l.descontosDiversos, lanc.consumos) ? 700 : 400 }}>
                            {func ? <>consumos lançados: {BRL(lanc.consumos)} {differs(l.descontosDiversos, lanc.consumos) ? "⚠" : <CheckCircle2 size={10} style={{ verticalAlign: "middle" }} />}</> : "—"}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 10 }}>⚠ nas colunas de comparação = o valor do contracheque é diferente do que foi lançado no sistema naquele mês. A importação usa o valor do contracheque mesmo assim.</div>
            <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button onClick={() => { setStage("arquivo"); setLinhas([]); }} disabled={stage === "salvando"} style={btn(false, stage === "salvando")}>Escolher outro PDF</button>
              <button onClick={podeImportar ? importar : undefined} disabled={!podeImportar} style={btn(true, !podeImportar)}>
                {stage === "salvando" ? <><Loader2 size={14} style={{ animation: "spin 1.2s linear infinite" }} /> Importando...</> : <>Importar {selecionadas.length} contracheque{selecionadas.length !== 1 ? "s" : ""}</>}
              </button>
            </div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </>
        )}
      </div>
    </div>
  );
}
