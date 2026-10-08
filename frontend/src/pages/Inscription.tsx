// ================================================================================================
// Fichier : Inscription.tsx
// Rôle : Page « Créer un compte » (adresse « /inscription », US03). PROVISOIRE : carte vide avec son titre.
//   Le formulaire (email, mot de passe, vérification, appel à POST /api/auth/register) viendra à la brique 3.
// Utilise :
//   - index.css : classes carte, carte__titre
// Utilisé par :
//   - App.tsx (route « /inscription »)
// ================================================================================================
export function Inscription() {
  return (
    <section className="carte">
      <h1 className="carte__titre">Créer un compte</h1>
    </section>
  );
}
