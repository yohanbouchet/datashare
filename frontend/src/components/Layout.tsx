// ================================================================================================
// Fichier : Layout.tsx
// Rôle : Mise en page commune à toutes les pages : lien d'évitement, en-tête, zone de contenu,
//   pied de page « Copyright ». La page demandée par l'adresse s'affiche à la place de <Outlet />.
// Utilise :
//   - components/Header.tsx (Header)
//   - react-router (Outlet) : emplacement de la page courante
//   - index.css : classes mise-en-page, contenu, pied-de-page, lien-evitement
// Utilisé par :
//   - App.tsx (route parente de toutes les pages)
// ================================================================================================
import { Outlet } from 'react-router';
import { Header } from './Header.tsx';

export function Layout() {
  return (
    <div className="mise-en-page">
      {/* Accessibilité : au clavier, le premier Tab propose de sauter directement au contenu */}
      <a href="#contenu" className="lien-evitement">
        Aller au contenu
      </a>
      <Header />
      {/* <main> : le contenu principal (une seule fois par page, repère pour les lecteurs d'écran) */}
      <main id="contenu" className="contenu">
        {/* Outlet : « ici s'affiche la page de l'adresse en cours » (Accueil, Connexion…) */}
        <Outlet />
      </main>
      <footer className="pied-de-page">Copyright DataShare© 2025</footer>
    </div>
  );
}
