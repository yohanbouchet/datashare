// =============================================================================
// Fichier : App.tsx
// Rôle : Composant racine : la table de navigation (quelle adresse affiche
//   quelle page). Toutes les pages sont « enfants » du Layout : elles partagent
//   l'en-tête et le pied de page.
// Utilise :
//   - react-router (Routes, Route)
//   - components/Layout.tsx ; pages/Accueil, Connexion, Inscription, NotFound
// Utilisé par :
//   - main.tsx
// =============================================================================
import { Route, Routes } from 'react-router';
import { Layout } from './components/Layout.tsx';
import { RequireAuth } from './components/RequireAuth.tsx';
import { SpaceLayout } from './components/SpaceLayout.tsx';
import { Home } from './pages/Home.tsx';
import { Login } from './pages/Login.tsx';
import { Register } from './pages/Register.tsx';
import { NotFound } from './pages/NotFound.tsx';
import { MySpace } from './pages/MySpace.tsx';

function App() {
  return (
    // Routes : regarde l'adresse actuelle et affiche la première Route qui
    // correspond
    <Routes>
      {/* Route parente sans adresse : le Layout entoure toutes les pages
         (affichées dans son <Outlet />) */}
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        {/* /connexion → page de connexion (US04) */}
        <Route path="/connexion" element={<Login />} />
        {/* /inscription → page de création de compte (US03) */}
        <Route path="/inscription" element={<Register />} />
        {/* path="*" : toute autre adresse → page introuvable (doit rester en
           dernier) */}
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Pages réservées aux utilisateurs connectés : RequireAuth vérifie la
         session, puis SpaceLayout affiche la barre latérale et la barre du
         haut autour de la page */}
      <Route element={<RequireAuth />}>
        <Route element={<SpaceLayout />}>
          {/* /mon-espace → historique et suppression (US05, US06) */}
          <Route path="/mon-espace" element={<MySpace />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
