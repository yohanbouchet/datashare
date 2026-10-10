// =============================================================================
// Fichier : SpaceLayout.tsx
// Rôle : Mise en page de l'espace connecté (« Mon espace »), conforme à la
//   maquette : barre latérale en dégradé (logo, « Mes fichiers »), barre du
//   haut (« Ajouter des fichiers », « Déconnexion ») et contenu de la page.
//   Sur mobile (< 768 px), la barre latérale devient un tiroir ouvert par le
//   bouton ☰ (avec les liens « Ajouter des fichiers » et « Déconnexion »), et
//   la barre du haut affiche l'email de l'utilisateur.
// Utilise :
//   - context/useAuth.ts (user, logout)
//   - components/Icon.tsx ; react-router (Link, NavLink, Outlet, useNavigate)
// Utilisé par :
//   - App.tsx (route parente de /mon-espace, derrière RequireAuth)
// =============================================================================
import { startTransition, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../context/useAuth.ts';
import { Icon } from './Icon.tsx';

export function SpaceLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // Tiroir du menu mobile : ouvert ou fermé
  const [menuOpen, setMenuOpen] = useState(false);

  // Déconnexion : on revient à l'accueil et on oublie le JWT (côté
  // navigateur). ⚠️ React Router applique chaque changement de page dans une
  // « transition » (mise à jour moins prioritaire) : la déconnexion est placée
  // dans une transition elle aussi, pour que les deux s'appliquent ENSEMBLE.
  // Sinon, la déconnexion passe avant : le vigile RequireAuth voit un
  // visiteur sur /mon-espace et le renvoie vers /connexion (anomalie trouvée
  // par Cypress).
  function handleLogout() {
    navigate('/');
    startTransition(() => logout());
  }

  return (
    <div className="space">
      <a href="#space-content" className="skip-link">
        Aller au contenu
      </a>

      {/* Barre latérale : toujours visible sur ordinateur, tiroir sur mobile */}
      <aside
        id="space-menu"
        className={`space__sidebar${menuOpen ? ' space__sidebar--open' : ''}`}
      >
        <div className="space__sidebar-top">
          <button
            type="button"
            className="space__close"
            onClick={() => setMenuOpen(false)}
            aria-label="Fermer le menu"
          >
            <Icon name="close" size={20} />
          </button>
          <Link to="/" className="space__logo">
            DataShare
          </Link>
        </div>

        {/* <nav> : repère « navigation » pour les lecteurs d'écran ; NavLink
           ajoute aria-current="page" au lien de la page affichée */}
        <nav aria-label="Mon espace">
          <NavLink
            to="/mon-espace"
            className="space__nav-link"
            onClick={() => setMenuOpen(false)}
          >
            Mes fichiers
          </NavLink>
        </nav>

        {/* Liens de la barre du haut, repris dans le tiroir sur mobile */}
        <div className="space__mobile-links">
          <Link to="/" className="space__mobile-link">
            Ajouter des fichiers
          </Link>
          <button
            type="button"
            className="space__mobile-link"
            onClick={handleLogout}
          >
            Déconnexion
          </button>
        </div>

        <p className="space__copyright">Copyright DataShare© 2025</p>
      </aside>

      {/* Voile sombre derrière le tiroir ouvert (mobile) : un clic le ferme */}
      {menuOpen && (
        <div
          className="space__backdrop"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="space__main">
        <header className="space__topbar">
          <button
            type="button"
            className="space__menu-button"
            onClick={() => setMenuOpen(true)}
            aria-label="Ouvrir le menu"
            aria-expanded={menuOpen}
            aria-controls="space-menu"
          >
            <Icon name="menu" size={22} />
          </button>
          <span className="space__user">{user?.email}</span>
          <Link to="/" className="button-dark space__add">
            Ajouter des fichiers
          </Link>
          <button
            type="button"
            className="space__logout"
            onClick={handleLogout}
          >
            <Icon name="logout" />
            Déconnexion
          </button>
        </header>

        <main id="space-content" className="space__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
