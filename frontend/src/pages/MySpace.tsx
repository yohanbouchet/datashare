// =============================================================================
// Fichier : MySpace.tsx
// Rôle : Page « Mes fichiers » (adresse /mon-espace, US05 et US06), conforme
//   à la maquette :
//   1. charge l'historique depuis l'API (GET /api/files?status=…) selon le
//      filtre choisi : Tous (par défaut, comme la maquette), Actifs, Expiré ;
//   2. affiche chaque fichier : nom, délai d'expiration, cadenas s'il est
//      protégé, boutons « Supprimer » et « Accéder » (menu « ⋮ » sur mobile) ;
//   3. supprime un fichier après confirmation (DELETE /api/files/:id).
//   Session expirée (401) → déconnexion et retour à la page de connexion.
// Utilise :
//   - services/api.ts (filesApi, ApiError, types) ; utils/format.ts
//   - context/useAuth.ts (logout) ; components/Banner.tsx, Icon.tsx
// Utilisé par :
//   - App.tsx (route /mon-espace, dans SpaceLayout, derrière RequireAuth)
// =============================================================================
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Banner } from '../components/Banner.tsx';
import { Icon } from '../components/Icon.tsx';
import { useAuth } from '../context/useAuth.ts';
import {
  ApiError,
  filesApi,
  type FileHistoryItem,
  type FileStatus,
} from '../services/api.ts';
import { expiryLabel } from '../utils/format.ts';

// Les 3 options de l'interrupteur (valeur envoyée à l'API + texte affiché)
const FILTERS: { value: FileStatus; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'active', label: 'Actifs' },
  { value: 'expired', label: 'Expiré' },
];

export function MySpace() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  // Mémoire de la page
  const [status, setStatus] = useState<FileStatus>('all');
  // null = en cours de chargement ; [] = aucun fichier
  const [files, setFiles] = useState<FileHistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Chargement de la liste à l'arrivée sur la page et à chaque changement de
  // filtre ([status] : la liste des valeurs qui relancent l'effet)
  useEffect(() => {
    // ignore : si le filtre change avant la réponse, l'ancienne réponse
    // (arrivée en retard) est ignorée, elle n'écrase pas la nouvelle
    let ignore = false;
    filesApi
      .list(status)
      .then((list) => {
        if (!ignore) setFiles(list);
      })
      .catch((err: unknown) => {
        if (ignore) return;
        // Jeton expiré (1 h) : on repart sur la page de connexion
        if (err instanceof ApiError && err.status === 401) {
          logout();
          navigate('/connexion');
          return;
        }
        setError(
          err instanceof ApiError
            ? err.message
            : 'Une erreur inattendue est survenue.',
        );
      });
    // Fonction de « nettoyage » : appelée avant le prochain effet
    return () => {
      ignore = true;
    };
  }, [status, logout, navigate]);

  // Changement de filtre : on vide la liste (affiche « Chargement… ») et les
  // messages, l'effet ci-dessus recharge la liste
  function changeStatus(value: FileStatus) {
    setStatus(value);
    setFiles(null);
    setError(null);
    setNotice(null);
  }

  // Suppression (US06) : confirmation obligatoire, puis appel à l'API
  async function handleDelete(file: FileHistoryItem) {
    const confirmed = window.confirm(
      `Supprimer « ${file.originalName} » ? Cette action est définitive.`,
    );
    if (!confirmed) return;
    setError(null);
    setNotice(null);
    try {
      await filesApi.remove(file.id);
      // On retire la ligne de la liste affichée, sans recharger toute la page
      setFiles((current) => current?.filter((f) => f.id !== file.id) ?? null);
      setNotice(`« ${file.originalName} » a été supprimé.`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Une erreur inattendue est survenue.',
      );
    }
  }

  return (
    <section>
      <h1 className="space__title">Mes fichiers</h1>

      {/* Interrupteur : des boutons « enfoncés » ou non (aria-pressed),
         regroupés et nommés pour les lecteurs d'écran */}
      <div className="switch" role="group" aria-label="Filtrer les fichiers">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className="switch__option"
            aria-pressed={status === filter.value}
            onClick={() => changeStatus(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error && <Banner variant="error">{error}</Banner>}
      {notice && <Banner variant="info">{notice}</Banner>}

      {files === null && !error && <p>Chargement…</p>}
      {files !== null && files.length === 0 && <p>Aucun fichier à afficher.</p>}
      {files !== null && files.length > 0 && (
        <ul className="file-list">
          {files.map((file) => (
            <FileRow key={file.id} file={file} onDelete={handleDelete} />
          ))}
        </ul>
      )}
    </section>
  );
}

// Une ligne de la liste (composant interne à la page, non exporté)
interface FileRowProps {
  file: FileHistoryItem;
  onDelete: (file: FileHistoryItem) => void;
}

function FileRow({ file, onDelete }: FileRowProps) {
  // Les deux actions, affichées en boutons (ordinateur) ou dans le menu « ⋮ »
  // (mobile). aria-label : « Supprimer photo.jpg » plutôt que « Supprimer »,
  // pour qu'un lecteur d'écran sache de quel fichier il s'agit.
  const actions = (
    <>
      <button
        type="button"
        className="button-outline"
        onClick={() => onDelete(file)}
        aria-label={`Supprimer ${file.originalName}`}
      >
        <Icon name="trash" />
        Supprimer
      </button>
      {/* « Accéder » ouvre la page de téléchargement du lien, dans un nouvel
         onglet (noopener : l'onglet ouvert ne peut pas agir sur celui-ci) */}
      <a
        href={`/d/${file.token}`}
        className="button-outline"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Accéder à ${file.originalName} (nouvel onglet)`}
      >
        Accéder
        <Icon name="arrow-right" />
      </a>
    </>
  );

  return (
    <li className="file-row">
      <span className="file-row__icon">
        <Icon name="file" size={20} />
      </span>
      <div className="file-row__info">
        {/* title : infobulle avec le nom complet, s'il est coupé par « … » */}
        <p className="file-row__name" title={file.originalName}>
          {file.originalName}
        </p>
        <p
          className={`file-row__expiry${file.isExpired ? ' file-row__expiry--expired' : ''}`}
        >
          {expiryLabel(file.expiresAt)}
        </p>
      </div>

      {file.isExpired ? (
        <p className="file-row__expired-note">
          Ce fichier a expiré, il n'est plus stocké chez nous
        </p>
      ) : (
        <>
          {file.isProtected && (
            <span className="file-row__lock" title="Protégé par mot de passe">
              <Icon name="lock" />
              <span className="visually-hidden">Protégé par mot de passe</span>
            </span>
          )}
          <div className="file-row__actions">{actions}</div>
          <details className="row-menu">
            <summary aria-label={`Actions pour ${file.originalName}`}>
              <Icon name="more" />
            </summary>
            <div className="row-menu__panel">{actions}</div>
          </details>
        </>
      )}
    </li>
  );
}
