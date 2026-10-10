// =============================================================================
// Fichier : Login.tsx
// Rôle : Page de connexion (adresse « /connexion », US04), conforme à la
//   maquette « Connexion ».
//   1. Validation côté client (email au bon format, mot de passe renseigné) :
//      message sous chaque champ.
//   2. Envoi à l'API via le contexte (connexion) ; le bouton est désactivé
//      pendant l'envoi.
//   3. Succès → retour à l'accueil (l'en-tête affiche « Mon espace ») ; échec →
//      bandeau d'erreur avec le message de l'API (« Email ou mot de passe
//      incorrect », serveur injoignable…).
//   Affiche un bandeau d'information si l'utilisateur arrive juste après avoir
//   créé son compte.
// Utilise :
//   - context/useAuth.ts (connexion, utilisateur)
//   - services/api.ts (ApiError)
//   - components/Field.tsx, components/Banner.tsx
//   - react-router (Link, Navigate, useLocation, useNavigate)
// Utilisé par :
//   - App.tsx (route « /connexion »), Header.tsx et Home.tsx (liens)
// =============================================================================
import { useState, type SubmitEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { Banner } from '../components/Banner.tsx';
import { Field } from '../components/Field.tsx';
import { useAuth } from '../context/useAuth.ts';
import { ApiError } from '../services/api.ts';

// Vérification simple du format « quelque-chose@domaine.extension » (le serveur
// revérifie de toute façon)
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface LoginErrors {
  email?: string;
  password?: string;
}

export function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  // location.state : informations transmises par la page précédente (ici : «
  // compte créé »)
  const location = useLocation();
  const accountCreated = (location.state as { accountCreated?: boolean } | null)
    ?.accountCreated;

  // Mémoire du formulaire
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Déjà connecté : inutile d'afficher le formulaire
  if (user) {
    return <Navigate to="/" replace />;
  }

  // Validation côté client : confort de l'utilisateur (le serveur reste
  // l'arbitre final)
  function validate(): LoginErrors {
    const result: LoginErrors = {};
    if (!EMAIL_PATTERN.test(email.trim())) {
      result.email = "L'adresse email n'est pas valide";
    }
    if (!password) {
      result.password = 'Le mot de passe est obligatoire';
    }
    return result;
  }

  // async : la soumission attend la réponse de l'API.
  // SubmitEvent : le type de l'événement « envoi du formulaire » (FormEvent est
  // déclaré obsolète dans React 19).
  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    // preventDefault : empêche le navigateur de recharger la page (comportement
    // par défaut d'un formulaire)
    event.preventDefault();
    setServerError(null);
    const foundErrors = validate();
    setErrors(foundErrors);
    if (Object.keys(foundErrors).length > 0) return;

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (error) {
      // ApiError : message prévu par l'API ou par le service ; autre erreur :
      // message générique
      setServerError(
        error instanceof ApiError
          ? error.message
          : 'Une erreur inattendue est survenue.',
      );
    } finally {
      // finally : exécuté dans tous les cas, succès ou échec
      setSubmitting(false);
    }
  }

  return (
    <section className="card">
      <h1 className="card__title">Connexion</h1>

      {accountCreated && (
        <Banner variant="info">
          Ton compte est créé, tu peux te connecter.
        </Banner>
      )}
      {serverError && <Banner variant="error">{serverError}</Banner>}

      {/* noValidate : on désactive les bulles du navigateur pour afficher
         nos propres messages en français */}
      <form className="form" onSubmit={handleSubmit} noValidate>
        <Field
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="Saisissez votre email..."
          autoComplete="email"
          error={errors.email}
        />
        <Field
          id="password"
          label="Mot de passe"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="Saisissez votre mot de passe..."
          autoComplete="current-password"
          error={errors.password}
        />

        <Link to="/inscription" className="link-accent">
          Créer un compte
        </Link>

        {/* disabled pendant l'envoi : évite les doubles clics (et donc les
           doubles requêtes) */}
        <button type="submit" className="button-primary" disabled={submitting}>
          {submitting ? 'Connexion…' : 'Connexion'}
        </button>
      </form>
    </section>
  );
}
