// ================================================================================================
// Fichier : main.tsx
// Rôle : Point d'entrée du front-end : premier fichier exécuté par le navigateur.
//   Branche React sur la balise <div id="root"> de index.html et y affiche le composant App.
// Utilise :
//   - App.tsx (App) : le composant racine
//   - index.css : styles globaux
//   - index.html (balise root)
//   - react-router (BrowserRouter)
// Utilisé par :
//   - index.html (balise <script>)
// ================================================================================================
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

// Styles globaux de l'application (couleurs, polices…).
import './index.css';
import App from './App.tsx';

// createRoot : React prend le contrôle de la balise <div id="root"> d'index.html
// et y dessine le composant App. Le "!" indique à TypeScript que cette balise existe forcément.
createRoot(document.getElementById('root')!).render(
  // StrictMode : mode de vérification réservé au développement. Il exécute volontairement
  // certains traitements deux fois (dont les useEffect) pour révéler les erreurs
  // (un appel à l'API apparaît alors deux fois dans l'onglet Réseau). Sans effet en production.
  <StrictMode>
    {/* BrowserRouter : lit l'adresse du navigateur (/connexion…) et la transmet à toute l'application */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
