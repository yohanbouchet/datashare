// ================================================================================================
// Fichier : Inscription.tsx
// Rôle : Page « Créer un compte » (adresse « /inscription », US03), conforme à la maquette.
//   1. Validation côté client : email au bon format, mot de passe d'au moins 8 caractères,
//      vérification identique au mot de passe ; message sous chaque champ concerné.
//   2. Envoi à l'API (POST /api/auth/register) ; le bouton est désactivé pendant l'envoi.
//   3. Succès → page Connexion avec le bandeau « Ton compte est créé » (l'inscription ne connecte pas) ;
//      échec → bandeau d'erreur avec le message de l'API (« Cet email est déjà utilisé », serveur injoignable…).
// Utilise :
//   - services/api.ts (authApi.inscription, ApiError)
//   - context/useAuth.ts (utilisateur : redirection si déjà connecté)
//   - components/Champ.tsx, components/Bandeau.tsx
//   - react-router (Link, Navigate, useNavigate)
// Utilisé par :
//   - App.tsx (route « /inscription »), Connexion.tsx (lien « Créer un compte »)
// ================================================================================================
import { useState, type SubmitEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { Bandeau } from '../components/Bandeau.tsx';
import { Champ } from '../components/Champ.tsx';
import { useAuth } from '../context/useAuth.ts';
import { ApiError, authApi } from '../services/api.ts';

// Vérification simple du format « quelque-chose@domaine.extension » (le serveur revérifie de toute façon)
const FORMAT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Messages d'erreur par champ ; le « ? » rend chaque case facultative (présente seulement en cas d'erreur)
interface ErreursInscription {
  email?: string;
  password?: string;
  confirmation?: string;
}

export function Inscription() {
  // Le contexte sert seulement à savoir si quelqu'un est déjà connecté : s'inscrire ne connecte pas
  const { utilisateur } = useAuth();
  const naviguer = useNavigate();

  // Mémoire du formulaire
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erreurs, setErreurs] = useState<ErreursInscription>({});
  const [erreurServeur, setErreurServeur] = useState<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [confirmation, setConfirmation] = useState('');

  // Déjà connecté : inutile d'afficher le formulaire
  if (utilisateur) {
    return <Navigate to="/" replace />;
  }

  // Validation côté client : confort de l'utilisateur (le serveur reste l'arbitre final)
  function valider(): ErreursInscription {
    const resultat: ErreursInscription = {};
    if (!FORMAT_EMAIL.test(email.trim())) {
      resultat.email = "L'adresse email n'est pas valide";
    }
    // Règle de l'US03 (le serveur applique la même règle avec le DTO)
    if (password.length < 8) {
      resultat.password = 'Le mot de passe doit contenir au moins 8 caractères';
    }
    // Vérification uniquement côté client : protège contre les fautes de frappe, l'API n'en a pas besoin
    if (confirmation !== password) {
      resultat.confirmation = 'Les mots de passe ne correspondent pas';
    }
    return resultat;
  }

  // async : la soumission attend la réponse de l'API.
  // SubmitEvent : le type de l'événement « envoi du formulaire ».
  async function soumettre(evenement: SubmitEvent<HTMLFormElement>) {
    // preventDefault : empêche le navigateur de recharger la page (comportement par défaut d'un formulaire)
    evenement.preventDefault();
    setErreurServeur(null);
    const erreursTrouvees = valider();
    setErreurs(erreursTrouvees);
    if (Object.keys(erreursTrouvees).length > 0) return;

    setEnvoiEnCours(true);
    try {
      await authApi.inscription(email.trim(), password);
      // state : information transmise à la page Connexion, qui affiche alors le bandeau bleu
      naviguer('/connexion', { state: { compteCree: true } });
    } catch (erreur) {
      // ApiError : message prévu par l'API ou par le service ; autre erreur : message générique
      setErreurServeur(
        erreur instanceof ApiError
          ? erreur.message
          : 'Une erreur inattendue est survenue.',
      );
    } finally {
      // finally : exécuté dans tous les cas, succès ou échec
      setEnvoiEnCours(false);
    }
  }

  return (
    <section className="carte">
      <h1 className="carte__titre">Créer un compte</h1>

      {erreurServeur && <Bandeau variante="erreur">{erreurServeur}</Bandeau>}

      {/* noValidate : on désactive les bulles du navigateur pour afficher nos propres messages en français */}
      <form className="formulaire" onSubmit={soumettre} noValidate>
        <Champ
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="Saisissez votre email..."
          autoComplete="email"
          erreur={erreurs.email}
        />
        <Champ
          id="password"
          label="Mot de passe"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="Saisissez votre mot de passe..."
          autoComplete="new-password"
          erreur={erreurs.password}
        />

        <Champ
          id="confirmation"
          label="Vérification du mot de passe"
          type="password"
          value={confirmation}
          onChange={setConfirmation}
          placeholder="Saisissez le à nouveau"
          autoComplete="new-password"
          erreur={erreurs.confirmation}
        />

        <Link to="/connexion" className="lien-accent">
          J'ai déjà un compte
        </Link>

        {/* disabled pendant l'envoi : évite les doubles clics (et donc les doubles requêtes) */}
        <button
          type="submit"
          className="bouton-principal"
          disabled={envoiEnCours}
        >
          {envoiEnCours ? 'Création…' : 'Créer mon compte'}
        </button>
      </form>
    </section>
  );
}
