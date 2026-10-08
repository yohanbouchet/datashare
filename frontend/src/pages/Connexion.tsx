// ================================================================================================
// Fichier : Connexion.tsx
// Rôle : Page de connexion (adresse « /connexion », US04), conforme à la maquette « Connexion ».
//   1. Validation côté client (email au bon format, mot de passe renseigné) : message sous chaque champ.
//   2. Envoi à l'API via le contexte (connexion) ; le bouton est désactivé pendant l'envoi.
//   3. Succès → retour à l'accueil (l'en-tête affiche « Mon espace ») ; échec → bandeau d'erreur
//      avec le message de l'API (« Email ou mot de passe incorrect », serveur injoignable…).
//   Affiche un bandeau d'information si l'utilisateur arrive juste après avoir créé son compte.
// Utilise :
//   - context/useAuth.ts (connexion, utilisateur)
//   - services/api.ts (ApiError)
//   - components/Champ.tsx, components/Bandeau.tsx
//   - react-router (Link, Navigate, useLocation, useNavigate)
// Utilisé par :
//   - App.tsx (route « /connexion »), Header.tsx et Accueil.tsx (liens)
// ================================================================================================
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { Bandeau } from '../components/Bandeau.tsx';
import { Champ } from '../components/Champ.tsx';
import { useAuth } from '../context/useAuth.ts';
import { ApiError } from '../services/api.ts';

// Vérification simple du format « quelque-chose@domaine.extension » (le serveur revérifie de toute façon)
const FORMAT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ErreursConnexion {
  email?: string;
  password?: string;
}

export function Connexion() {
  const { connexion, utilisateur } = useAuth();
  const naviguer = useNavigate();
  // location.state : informations transmises par la page précédente (ici : « compte créé »)
  const location = useLocation();
  const compteCree = (location.state as { compteCree?: boolean } | null)
    ?.compteCree;

  // Mémoire du formulaire
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erreurs, setErreurs] = useState<ErreursConnexion>({});
  const [erreurServeur, setErreurServeur] = useState<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  // Déjà connecté : inutile d'afficher le formulaire
  if (utilisateur) {
    return <Navigate to="/" replace />;
  }

  // Validation côté client : confort de l'utilisateur (le serveur reste l'arbitre final)
  function valider(): ErreursConnexion {
    const resultat: ErreursConnexion = {};
    if (!FORMAT_EMAIL.test(email.trim())) {
      resultat.email = "L'adresse email n'est pas valide";
    }
    if (!password) {
      resultat.password = 'Le mot de passe est obligatoire';
    }
    return resultat;
  }

  // async : la soumission attend la réponse de l'API
  async function soumettre(evenement: FormEvent<HTMLFormElement>) {
    // preventDefault : empêche le navigateur de recharger la page (comportement par défaut d'un formulaire)
    evenement.preventDefault();
    setErreurServeur(null);
    const erreursTrouvees = valider();
    setErreurs(erreursTrouvees);
    if (Object.keys(erreursTrouvees).length > 0) return;

    setEnvoiEnCours(true);
    try {
      await connexion(email.trim(), password);
      naviguer('/');
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
      <h1 className="carte__titre">Connexion</h1>

      {compteCree && (
        <Bandeau variante="info">
          Ton compte est créé, tu peux te connecter.
        </Bandeau>
      )}
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
          autoComplete="current-password"
          erreur={erreurs.password}
        />

        <Link to="/inscription" className="lien-accent">
          Créer un compte
        </Link>

        {/* disabled pendant l'envoi : évite les doubles clics (et donc les doubles requêtes) */}
        <button
          type="submit"
          className="bouton-principal"
          disabled={envoiEnCours}
        >
          {envoiEnCours ? 'Connexion…' : 'Connexion'}
        </button>
      </form>
    </section>
  );
}
