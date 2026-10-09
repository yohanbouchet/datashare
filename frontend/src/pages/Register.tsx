// ================================================================================================
// Fichier : Register.tsx
// Rôle : Page « Créer un compte » (adresse « /inscription », US03), conforme à la maquette.
//   1. Validation côté client : email au bon format, mot de passe d'au moins 8 caractères,
//      vérification identique au mot de passe ; message sous chaque champ concerné.
//   2. Envoi à l'API (POST /api/auth/register) ; le bouton est désactivé pendant l'envoi.
//   3. Succès → page Connexion avec le bandeau « Ton compte est créé » (l'inscription ne connecte pas) ;
//      échec → bandeau d'erreur avec le message de l'API (« Cet email est déjà utilisé », serveur injoignable…).
// Utilise :
//   - services/api.ts (authApi.register, ApiError)
//   - context/useAuth.ts (utilisateur : redirection si déjà connecté)
//   - components/Field.tsx, components/Banner.tsx
//   - react-router (Link, Navigate, useNavigate)
// Utilisé par :
//   - App.tsx (route « /inscription »), Login.tsx (lien « Créer un compte »)
// ================================================================================================
import { useState, type SubmitEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { Banner } from '../components/Banner.tsx';
import { Field } from '../components/Field.tsx';
import { useAuth } from '../context/useAuth.ts';
import { ApiError, authApi } from '../services/api.ts';

// Vérification simple du format « quelque-chose@domaine.extension » (le serveur revérifie de toute façon)
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Messages d'erreur par champ ; le « ? » rend chaque case facultative (présente seulement en cas d'erreur)
interface RegisterErrors {
  email?: string;
  password?: string;
  confirmation?: string;
}

export function Register() {
  // Le contexte sert seulement à savoir si quelqu'un est déjà connecté : s'inscrire ne connecte pas
  const { user } = useAuth();
  const navigate = useNavigate();

  // Mémoire du formulaire
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState('');

  // Déjà connecté : inutile d'afficher le formulaire
  if (user) {
    return <Navigate to="/" replace />;
  }

  // Validation côté client : confort de l'utilisateur (le serveur reste l'arbitre final)
  function validate(): RegisterErrors {
    const result: RegisterErrors = {};
    if (!EMAIL_PATTERN.test(email.trim())) {
      result.email = "L'adresse email n'est pas valide";
    }
    // Règle de l'US03 (le serveur applique la même règle avec le DTO)
    if (password.length < 8) {
      result.password = 'Le mot de passe doit contenir au moins 8 caractères';
    }
    // Vérification uniquement côté client : protège contre les fautes de frappe, l'API n'en a pas besoin
    if (confirmation !== password) {
      result.confirmation = 'Les mots de passe ne correspondent pas';
    }
    return result;
  }

  // async : la soumission attend la réponse de l'API.
  // SubmitEvent : le type de l'événement « envoi du formulaire ».
  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    // preventDefault : empêche le navigateur de recharger la page (comportement par défaut d'un formulaire)
    event.preventDefault();
    setServerError(null);
    const foundErrors = validate();
    setErrors(foundErrors);
    if (Object.keys(foundErrors).length > 0) return;

    setSubmitting(true);
    try {
      await authApi.register(email.trim(), password);
      // state : information transmise à la page Connexion, qui affiche alors le bandeau bleu
      navigate('/connexion', { state: { accountCreated: true } });
    } catch (error) {
      // ApiError : message prévu par l'API ou par le service ; autre erreur : message générique
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
      <h1 className="card__title">Créer un compte</h1>

      {serverError && <Banner variant="error">{serverError}</Banner>}

      {/* noValidate : on désactive les bulles du navigateur pour afficher nos propres messages en français */}
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
          autoComplete="new-password"
          error={errors.password}
        />

        <Field
          id="confirmation"
          label="Vérification du mot de passe"
          type="password"
          value={confirmation}
          onChange={setConfirmation}
          placeholder="Saisissez le à nouveau"
          autoComplete="new-password"
          error={errors.confirmation}
        />

        <Link to="/connexion" className="link-accent">
          J'ai déjà un compte
        </Link>

        {/* disabled pendant l'envoi : évite les doubles clics (et donc les doubles requêtes) */}
        <button type="submit" className="button-primary" disabled={submitting}>
          {submitting ? 'Création…' : 'Créer mon compte'}
        </button>
      </form>
    </section>
  );
}
