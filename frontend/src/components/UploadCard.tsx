// =============================================================================
// Fichier : UploadCard.tsx
// Rôle : Carte « Ajouter un fichier » du téléversement (US01), conforme à la
//   maquette Figma (section Téléversement) :
//   1. résumé du fichier choisi (nom, taille) et bouton « Changer » ;
//      🔒 1er niveau de contrôle de la taille : plus de 1 Go → message en
//      rouge et bouton « Téléverser » désactivé, AVANT tout envoi ;
//   2. formulaire : mot de passe facultatif (6 caractères minimum), durée
//      d'expiration (1 à 7 jours, une semaine par défaut), tags facultatifs
//      (champ ajouté à la maquette : US01/US08) ;
//   3. envoi avec barre de progression, puis carte de succès : lien de
//      partage et bouton « Copier le lien ».
//   Les erreurs de l'API (extension interdite, 413…) s'affichent dans un
//   bandeau ; une session expirée (401) renvoie vers la page de connexion.
// Utilise :
//   - services/api.ts (filesApi.upload, ApiError, UploadedFile)
//   - utils/format.ts (formatSize) ; context/useAuth.ts (logout)
//   - components/Field.tsx, Banner.tsx, Icon.tsx
// Utilisé par :
//   - pages/Home.tsx (après le choix d'un fichier)
// =============================================================================
import { useState, type SubmitEvent } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/useAuth.ts';
import { ApiError, filesApi, type UploadedFile } from '../services/api.ts';
import { formatSize } from '../utils/format.ts';
import { Banner } from './Banner.tsx';
import { Field } from './Field.tsx';
import { Icon } from './Icon.tsx';

// Taille maximale d'un fichier : 1 Go (même limite que l'API)
const MAX_FILE_SIZE = 1024 ** 3;

// Durées proposées (liste « Expiration » de la maquette)
const DURATIONS = [
  { days: 1, label: 'Une journée' },
  { days: 2, label: 'Deux jours' },
  { days: 3, label: 'Trois jours' },
  { days: 4, label: 'Quatre jours' },
  { days: 5, label: 'Cinq jours' },
  { days: 6, label: 'Six jours' },
  { days: 7, label: 'Une semaine' },
];

interface UploadErrors {
  password?: string;
  tags?: string;
}

interface UploadCardProps {
  file: File;
  // Rouvre le sélecteur de fichier (bouton « Changer »)
  onChangeFile: () => void;
}

export function UploadCard({ file, onChangeFile }: UploadCardProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Mémoire du formulaire
  const [password, setPassword] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [tags, setTags] = useState('');
  const [errors, setErrors] = useState<UploadErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  // Progression de l'envoi en % (null : aucun envoi en cours)
  const [progress, setProgress] = useState<number | null>(null);
  // Fichier enregistré par l'API (affiche la carte de succès)
  const [result, setResult] = useState<UploadedFile | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const tooLarge = file.size > MAX_FILE_SIZE;
  const uploading = progress !== null;
  const durationLabel =
    DURATIONS.find((d) => d.days === expiresInDays)?.label ?? 'Une semaine';

  // Tags saisis « photos, vacances » → ['photos', 'vacances'] (vides retirés)
  function parseTags(): string[] {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag !== '');
  }

  // Validation côté client : confort (l'API applique les mêmes règles)
  function validate(): UploadErrors {
    const found: UploadErrors = {};
    if (password !== '' && password.length < 6) {
      found.password =
        'Le mot de passe du fichier doit contenir au moins 6 caractères';
    }
    const list = parseTags();
    if (list.length > 10) {
      found.tags = 'Un fichier peut avoir au plus 10 tags';
    } else if (list.some((tag) => tag.length > 30)) {
      found.tags = 'Un tag ne doit pas dépasser 30 caractères';
    } else if (new Set(list).size !== list.length) {
      found.tags = 'Un même tag ne peut pas être ajouté deux fois';
    }
    return found;
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);
    if (tooLarge) return;
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    // multipart/form-data : un compartiment par champ (contrat, § 4.1)
    const data = new FormData();
    data.append('file', file);
    data.append('expiresInDays', String(expiresInDays));
    if (password !== '') data.append('password', password);
    for (const tag of parseTags()) data.append('tags', tag);

    setProgress(0);
    try {
      setResult(await filesApi.upload(data, setProgress));
    } catch (err) {
      // Session expirée : retour à la connexion
      if (err instanceof ApiError && err.status === 401) {
        logout();
        navigate('/connexion');
        return;
      }
      setServerError(
        err instanceof ApiError
          ? err.message
          : 'Une erreur inattendue est survenue.',
      );
    } finally {
      setProgress(null);
    }
  }

  // ---- Carte de succès : lien de partage ----
  if (result) {
    // Lien vers la page de téléchargement du front (/d/<jeton>)
    const link = `${window.location.origin}/d/${result.token}`;

    async function copyLink() {
      try {
        await navigator.clipboard.writeText(link);
        setCopyStatus('Lien copié dans le presse-papiers.');
      } catch {
        // Presse-papiers indisponible (ex. page non sécurisée en HTTP)
        setCopyStatus('Copie impossible : sélectionne le lien et copie-le.');
      }
    }

    return (
      <section className="card upload-card" aria-labelledby="upload-title">
        <h1 id="upload-title" className="card__title">
          Ajouter un fichier
        </h1>
        <FileSummary name={result.originalName} size={result.size} />
        {/* role="status" : le succès est annoncé par les lecteurs d'écran */}
        <p className="upload-card__success" role="status">
          Félicitations, ton fichier sera conservé chez nous pendant{' '}
          {durationLabel.toLowerCase()} !
        </p>
        <a
          className="upload-card__link"
          href={link}
          target="_blank"
          rel="noopener noreferrer"
        >
          {link}
        </a>
        <button type="button" className="button-soft" onClick={copyLink}>
          <Icon name="copy" />
          Copier le lien
        </button>
        {copyStatus && (
          <p className="upload-card__copy-status" role="status">
            {copyStatus}
          </p>
        )}
      </section>
    );
  }

  // ---- Formulaire ----
  return (
    <section className="card upload-card" aria-labelledby="upload-title">
      <h1 id="upload-title" className="card__title">
        Ajouter un fichier
      </h1>

      <div className="upload-card__file">
        <FileSummary name={file.name} size={file.size} tooLarge={tooLarge} />
        <button
          type="button"
          className="button-outline button-outline--large"
          onClick={onChangeFile}
          disabled={uploading}
        >
          Changer
        </button>
      </div>
      {tooLarge && (
        <p className="field__error" role="alert">
          La taille des fichiers est limitée à 1 Go
        </p>
      )}

      {serverError && <Banner variant="error">{serverError}</Banner>}

      {/* noValidate : nos propres messages en français */}
      <form
        className="form upload-card__form"
        onSubmit={handleSubmit}
        noValidate
      >
        {/* autoComplete="new-password" : le navigateur ne propose pas le mot
           de passe du COMPTE pour ce champ */}
        <Field
          id="file-password"
          label="Mot de passe"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="Optionnel"
          autoComplete="new-password"
          error={errors.password}
        />
        <div className="field">
          <label htmlFor="file-expiration" className="field__label">
            Expiration
          </label>
          <select
            id="file-expiration"
            className="field__input field__select"
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(Number(e.target.value))}
          >
            {DURATIONS.map((duration) => (
              <option key={duration.days} value={duration.days}>
                {duration.label}
              </option>
            ))}
          </select>
        </div>
        <Field
          id="file-tags"
          label="Tags"
          value={tags}
          onChange={setTags}
          placeholder="Optionnel, séparés par des virgules"
          error={errors.tags}
        />

        {/* <progress> : barre native, annoncée par les lecteurs d'écran */}
        {uploading && (
          <progress
            className="upload-card__progress"
            value={progress}
            max={100}
            aria-label="Progression de l'envoi"
          >
            {progress} %
          </progress>
        )}

        <button
          type="submit"
          className="button-soft"
          disabled={tooLarge || uploading}
        >
          <Icon name="upload" />
          {uploading ? `Envoi… ${progress} %` : 'Téléverser'}
        </button>
      </form>
    </section>
  );
}

// Résumé d'un fichier : icône, nom (coupé par « … » s'il est long), taille
interface FileSummaryProps {
  name: string;
  size: number;
  tooLarge?: boolean;
}

function FileSummary({ name, size, tooLarge = false }: FileSummaryProps) {
  return (
    <div className="file-summary">
      <Icon name="file" size={24} />
      <div className="file-summary__text">
        <p className="file-summary__name" title={name}>
          {name}
        </p>
        <p
          className={`file-summary__size${tooLarge ? ' file-summary__size--error' : ''}`}
        >
          {formatSize(size)}
        </p>
      </div>
    </div>
  );
}
