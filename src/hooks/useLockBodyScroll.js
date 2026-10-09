import { useEffect } from "react";

// Trava a rolagem da página de fundo enquanto um pop-up está aberto.
// Usa um contador para funcionar com pop-ups empilhados (ex: Editar aberto sobre o detalhe).
let locks = 0;
let saved = null;

export default function useLockBodyScroll() {
  useEffect(() => {
    if (locks++ === 0) {
      const { body, documentElement } = document;
      saved = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
      const scrollbar = window.innerWidth - documentElement.clientWidth;
      body.style.overflow = "hidden";
      if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    }
    return () => {
      if (--locks === 0 && saved) {
        document.body.style.overflow = saved.overflow;
        document.body.style.paddingRight = saved.paddingRight;
      }
    };
  }, []);
}
