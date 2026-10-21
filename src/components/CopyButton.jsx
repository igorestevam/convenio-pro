import { useState } from "react";
import { Copy, Check } from "lucide-react";

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand("copy"); ta.remove();
  }
}

function useCopy(text) {
  const [copied, setCopied] = useState(false);
  const copy = async (e) => {
    e.stopPropagation(); // não dispara o clique da linha/célula (que abre o pop-up)
    await copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return [copied, copy];
}

/* Botão pequeno de copiar texto (ex: chave PIX). Mostra um ✓ por 1,5s após copiar. */
export default function CopyButton({ text, title = "Copiar", size = 12 }) {
  const [copied, copy] = useCopy(text);
  return (
    <button type="button" onClick={copy} title={copied ? "Copiado!" : title}
      style={{ display: "inline-flex", alignItems: "center", background: "none", border: "none", padding: 2, marginLeft: 2, cursor: "pointer", color: copied ? "#15803D" : "#9CA3AF", verticalAlign: "middle" }}>
      {copied ? <Check size={size} /> : <Copy size={size} />}
    </button>
  );
}

/* Etiqueta cinza com valor em negrito + botão de copiar (mesmo visual da chave PIX na Folha). */
export function CopyText({ text, icon: Icon, label, title = "Copiar" }) {
  return (
    <span style={{ fontSize: 11, color: "#6B7280", background: "#F3F4F6", padding: "2px 6px", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 3 }}>
      {Icon && <Icon size={11} />}{label}
      <b style={{ marginLeft: 3 }}>{text}</b>
      <CopyButton text={text} title={title} size={11} />
    </span>
  );
}
