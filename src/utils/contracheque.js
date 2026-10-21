// Leitura de contracheques em PDF ("COMPROVANTE DE PAGAMENTO", 1 funcionário por página,
// com 2 vias lado a lado). Tudo roda no navegador: o arquivo não é enviado a nenhum servidor.

const MESES = { JAN: 1, FEV: 2, MAR: 3, ABR: 4, MAI: 5, JUN: 6, JUL: 7, AGO: 8, SET: 9, OUT: 10, NOV: 11, DEZ: 12 };

const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
const money = (s) => {
  const m = String(s || "").replace(/R\$\s*/, "").trim().match(/^-?[\d.]+,\d{2}$/);
  return m ? Number(m[0].replace(/\./g, "").replace(",", ".")) : null;
};

/* Extrai os dados de uma página a partir dos itens de texto do pdf.js. */
export function parseContrachequePage(rawItems, pageWidth) {
  // só a 1ª via (metade esquerda)
  const items = rawItems
    .filter(i => i.str && i.str.trim() && i.transform[4] < pageWidth / 2)
    .map(i => ({ s: i.str.trim(), x: i.transform[4], y: i.transform[5], w: i.width || 0 }));

  const find = (label) => items.find(i => norm(i.s) === norm(label));
  // valor logo abaixo de um rótulo, na mesma coluna
  const below = (label, test = () => true) => {
    const l = find(label); if (!l) return null;
    return items
      .filter(i => i !== l && i.y < l.y - 2 && i.y > l.y - 25 && Math.abs(i.x - l.x) < 40 && test(i.s))
      .sort((a, b) => b.y - a.y)[0]?.s ?? null;
  };

  // Mês/Ano: "SET" "/" "2026" logo abaixo do rótulo
  let mes = null;
  const lm = find("Mês/Ano");
  if (lm) {
    const toks = items.filter(i => i.y < lm.y - 2 && i.y > lm.y - 25 && i.x > lm.x - 15 && i.x < lm.x + 90).sort((a, b) => a.x - b.x).map(i => norm(i.s));
    const m = toks.find(t => MESES[t]); const y = toks.find(t => /^\d{4}$/.test(t));
    if (m && y) mes = `${y}-${String(MESES[m]).padStart(2, "0")}`;
  }

  // Valor Líquido: na mesma linha, à direita do rótulo
  let liquido = null;
  const ll = find("Valor Líquido");
  if (ll) liquido = items.filter(i => i.x > ll.x && Math.abs(i.y - ll.y) < 8).map(i => money(i.s)).find(v => v !== null) ?? null;

  // Rubricas: linhas entre o cabeçalho da tabela e os totais, classificadas pela coluna mais próxima
  const rubricas = [];
  const hDesc = find("Discriminação"), hTot = find("Total de PROVENTOS");
  const cols = ["Ref.", "Proventos", "Descontos"].map(c => { const h = find(c); return h && { c, cx: h.x + h.w / 2 }; }).filter(Boolean);
  if (hDesc && hTot && cols.length === 3) {
    const rows = {};
    items.filter(i => i.y < hDesc.y - 2 && i.y > hTot.y + 2).forEach(i => { (rows[Math.round(i.y / 3)] ||= []).push(i); });
    Object.values(rows).forEach(row => {
      const desc = row.filter(i => money(i.s) === null).sort((a, b) => a.x - b.x).map(i => i.s).join(" ");
      if (!desc) return;
      const r = { desc, ref: null, provento: null, desconto: null };
      row.filter(i => money(i.s) !== null).forEach(i => {
        const cx = i.x + i.w / 2;
        const col = cols.reduce((best, c) => Math.abs(c.cx - cx) < Math.abs(best.cx - cx) ? c : best).c;
        r[col === "Ref." ? "ref" : col === "Proventos" ? "provento" : "desconto"] = money(i.s);
      });
      rubricas.push(r);
    });
  }
  const somaDesc = (re) => rubricas.filter(r => re.test(norm(r.desc))).reduce((s, r) => s + (r.desconto || 0), 0);

  const dados = {
    nome: below("Empregado"),
    mes,
    liquido,
    salarioBase: money(below("Salário Base", s => money(s) !== null)),
    totalProventos: money(below("Total de PROVENTOS", s => money(s) !== null)),
    totalDescontos: money(below("Total de DESCONTOS", s => money(s) !== null)),
    adiantamento: Math.round(somaDesc(/ADIANTAMENTO/) * 100) / 100,
    descontosDiversos: Math.round(somaDesc(/DESCONTOS DIVERSOS/) * 100) / 100,
    rubricas,
  };

  // conferência: proventos − descontos tem que bater com o líquido
  const problemas = [];
  if (!dados.nome) problemas.push("nome não encontrado");
  if (!dados.mes) problemas.push("mês/ano não encontrado");
  if (dados.liquido === null) problemas.push("valor líquido não encontrado");
  if (dados.liquido !== null && dados.totalProventos !== null && dados.totalDescontos !== null
      && Math.abs(dados.totalProventos - dados.totalDescontos - dados.liquido) > 0.02) problemas.push("totais não batem com o líquido");
  return { ...dados, problemas };
}

/* Lê um arquivo PDF (File) e devolve os dados de cada página. */
export async function lerContrachequesPDF(file) {
  const pdfjs = await import("pdfjs-dist");
  const { default: workerUrl } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const paginas = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const { items } = await page.getTextContent();
    paginas.push({ pagina: n, ...parseContrachequePage(items, page.getViewport({ scale: 1 }).width) });
  }
  return paginas;
}

/* Sugere o funcionário cadastrado que corresponde ao nome do contracheque. */
export function sugerirFuncionario(nomePdf, funcionarios) {
  const alvo = norm(nomePdf).split(" ").filter(t => t.length > 2);
  let melhor = null, melhorScore = 0;
  funcionarios.forEach(f => {
    const toks = norm(f.name).split(" ").filter(t => t.length > 2);
    if (!toks.length) return;
    if (norm(f.name) === norm(nomePdf)) { melhor = f; melhorScore = 99; return; }
    const hits = toks.filter(t => alvo.includes(t)).length;
    // precisa bater o 1º nome e, se o cadastro tiver 2+ nomes, pelo menos 2 deles
    const ok = toks[0] === alvo[0] && hits >= Math.min(2, toks.length);
    const score = ok ? hits / toks.length : 0;
    if (score > melhorScore) { melhor = f; melhorScore = score; }
  });
  return melhorScore >= 0.5 ? melhor : null;
}
