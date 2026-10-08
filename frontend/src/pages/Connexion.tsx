// ================================================================================================
// Fichier : Connexion.tsx
// Rôle : Page de connexion (adresse « /connexion », US04). PROVISOIRE : carte vide avec son titre.
//   Le formulaire (email, mot de passe, appel à POST /api/auth/login) sera ajouté à la brique 3.
// Utilise :
//   - index.css : classes carte, carte__titre
// Utilisé par :
//   - App.tsx (route « /connexion »), Header.tsx et Accueil.tsx (liens)
// ================================================================================================
export function Connexion() {
  return (
    <section className="carte">
      <h1 className="carte__titre">Connexion</h1>
    </section>
  );
}
