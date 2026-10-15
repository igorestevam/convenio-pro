import { useState } from "react";
import { Copy, Check } from "lucide-react";

/* Botão pequeno de copiar texto (ex: chave PIX). Mostra um ✓ por 1,5s após copiar. */
export default function CopyButton({ text, title = "Copiar", size = 12 }) {
  const [copied, setCopied] = useState(false);

  const copy = async (e) => {
    e.stopPropagation(); // não dispara o clique da linha/célula (que abre o pop-up)
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button type="button" onClick={copy} title={copied ? "Copiado!" : title}
      style={{ display: "inline-flex", alignItems: "center", background: "none", border: "none", padding: 2, marginLeft: 2, cursor: "pointer", color: copied ? "#15803D" : "#9CA3AF", verticalAlign: "middle" }}>
      {copied ? <Check size={size} /> : <Copy size={size} />}
    </button>
  );
}
