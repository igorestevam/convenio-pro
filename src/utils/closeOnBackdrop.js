// Props para o fundo escurecido de um pop-up: fecha ao clicar fora do conteúdo.
// Só fecha se o clique começou E terminou no fundo — assim, arrastar uma seleção
// de texto de dentro do pop-up para fora não o fecha por engano.
export default function closeOnBackdrop(onClose) {
  let downOnBackdrop = false;
  return {
    onMouseDown: (e) => { downOnBackdrop = e.target === e.currentTarget; },
    onClick: (e) => {
      if (downOnBackdrop && e.target === e.currentTarget) onClose();
      downOnBackdrop = false;
    },
  };
}
