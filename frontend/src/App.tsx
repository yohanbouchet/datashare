// ================================================================================================
// Fichier : App.tsx
// Rôle : Composant racine : la table de navigation (quelle adresse affiche quelle page).
//   Toutes les pages sont « enfants » du Layout : elles partagent l'en-tête et le pied de page.
// Utilise :
//   - react-router (Routes, Route)
//   - components/Layout.tsx ; pages/Accueil, Connexion, Inscription, PageIntrouvable
// Utilisé par :
//   - main.tsx
// ================================================================================================
import { Route, Routes } from 'react-router';
import { Layout } from './components/Layout.tsx';
import { Accueil } from './pages/Accueil.tsx';
import { Connexion } from './pages/Connexion.tsx';
import { Inscription } from './pages/Inscription.tsx';
import { PageIntrouvable } from './pages/PageIntrouvable.tsx';

function App() {
  return (
    // Routes : regarde l'adresse actuelle et affiche la première Route qui correspond
    <Routes>
      {/* Route parente sans adresse : le Layout entoure toutes les pages (affichées dans son <Outlet />) */}
      <Route element={<Layout />}>
        <Route path="/" element={<Accueil />} />
        {/* /connexion → page de connexion (US04) */}
        <Route path="/connexion" element={<Connexion />} />
        {/* /inscription → page de création de compte (US03) */}
        <Route path="/inscription" element={<Inscription />} />
        {/* path="*" : toute autre adresse → page introuvable (doit rester en dernier) */}
        <Route path="*" element={<PageIntrouvable />} />
      </Route>
    </Routes>
  );
}

export default App;
