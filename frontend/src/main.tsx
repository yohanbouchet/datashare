// Point d'entrée du front-end : c'est le premier fichier exécuté par le navigateur.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Styles globaux de l'application (couleurs, polices…).
import './index.css'
import App from './App.tsx'

// createRoot : React prend le contrôle de la balise <div id="root"> d'index.html
// et y dessine le composant App. Le "!" indique à TypeScript que cette balise existe forcément.
createRoot(document.getElementById('root')!).render(
  // StrictMode : mode de vérification réservé au développement. Il exécute volontairement
  // certains traitements deux fois (dont les useEffect) pour révéler les erreurs :
  // c'est pourquoi l'onglet Réseau montre deux appels à l'API. Sans effet en production.
  <StrictMode>
    <App />
  </StrictMode>,
)
