// Em dev (npm run dev) usa o backend local; no build de produção usa o Render.
// Pode ser sobrescrito com VITE_API_URL.
export const API_URL = import.meta.env.VITE_API_URL
  || (import.meta.env.DEV ? "http://localhost:5000/api" : "https://convenio-api-nrfx.onrender.com/api");
