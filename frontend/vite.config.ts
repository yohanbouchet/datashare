// Configuration de Vite, l'outil qui sert le front en développement (npm run dev, port 5173 par défaut)
// et qui produit la version optimisée pour la production (npm run build).
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Le plugin React permet à Vite de comprendre le JSX et active le rechargement à chaud
  // (la page se met à jour dès qu'un fichier est enregistré, sans perdre son état).
  plugins: [react()],
})
