// =============================================================================
// Fichier : Download.tsx
// Rôle : Page publique « Télécharger un fichier » (adresse /d/<jeton>, US02),
//   conforme à la maquette Figma (section Téléchargement). Aucun compte n'est
//   demandé : le jeton aléatoire du lien suffit.
//   1. Charge les informations du fichier (GET /api/download/:token) : nom,
//      taille, date d'expiration, protégé ou non. Lien inconnu (404) ou
//      expiré (410) → bandeau rouge avec le message de l'API.
//   2. Bandeau d'expiration : bleu « expirera dans N jours », orange
//      « expirera demain » ou « aujourd'hui ».
//   3. Fichier protégé : champ mot de passe ; le bouton reste grisé tant
//      qu'il est vide. Au clic, le mot de passe est vérifié (POST …/verify) :
//      faux → message sous le champ, sans lancer de téléchargement.
//   4. Téléchargement : un vrai formulaire HTML est envoyé (POST
//      /api/download/:token) ; le NAVIGATEUR reçoit le fichier en flux et
//      l'enregistre directement sur le disque (jamais chargé en mémoire).
// Utilise :
//   - services/api.ts (downloadApi, ApiError, DownloadInfo) ; utils/format.ts
//   - components/Banner.tsx, Field.tsx, FileSummary.tsx, Icon.tsx
//   - react-router (useParams : le jeton pris dans l'adresse)
// Utilisé par :
//   - App.tsx (route /d/:token) ; lien partagé, bouton « Accéder » de Mon
//     espace, lien de la carte de succès du téléversement
// =============================================================================
import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { useParams } from 'react-router';
import { Banner } from '../components/Banner.tsx';
import { Field } from '../components/Field.tsx';
import { FileSummary } from '../components/FileSummary.tsx';
import { Icon } from '../components/Icon.tsx';
import { ApiError, downloadApi, type DownloadInfo } from '../services/api.ts';
import { daysUntil } from '../utils/format.ts';

const UNEXPECTED = 'Une erreur inattendue est survenue.';

// Bandeau d'expiration de la maquette : bleu (info) s'il reste plusieurs
// jours, orange (alerte) si le fichier expire demain ou aujourd'hui
function expiryNotice(expiresAt: string): {
  variant: 'info' | 'warning';
  text: string;
} {
  const days = daysUntil(expiresAt);
  if (days <= 0) {
    return { variant: 'warning', text: "Ce fichier expirera aujourd'hui." };
  }
  if (days === 1) {
    return { variant: 'warning', text: 'Ce fichier expirera demain.' };
  }
  return { variant: 'info', text: `Ce fichier expirera dans ${days} jours.` };
}

export function Download() {
  // :token de la route /d/:token ('' s'il manquait, ce qui donnera un 404)
  const { token = '' } = useParams();
  // Accès direct au formulaire, pour l'envoyer nous-mêmes après vérification
  const formRef = useRef<HTMLFormElement>(null);

  // Mémoire de la page
  const [info, setInfo] = useState<DownloadInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [started, setStarted] = useState(false);

  // Chargement des informations du fichier à l'ouverture de la page
  useEffect(() => {
    let ignore = false;
    downloadApi
      .info(token)
      .then((data) => {
        if (!ignore) setInfo(data);
      })
      .catch((err: unknown) => {
        if (!ignore) {
          setLoadError(err instanceof ApiError ? err.message : UNEXPECTED);
        }
      });
    return () => {
      ignore = true;
    };
  }, [token]);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    // On bloque l'envoi automatique : on vérifie d'abord, puis on l'envoie
    event.preventDefault();
    if (!info) return;
    setPasswordError(null);
    setStarted(false);
    setChecking(true);
    try {
      // Protégé : le mot de passe est-il le bon ? Sinon : le fichier est-il
      // toujours disponible (il a pu expirer depuis l'ouverture de la page) ?
      if (info.isProtected) {
        await downloadApi.verify(token, password);
      } else {
        await downloadApi.info(token);
      }
      // Envoi « classique » du formulaire par le navigateur : le fichier est
      // enregistré sur le disque, la page reste affichée
      formRef.current?.submit();
      setStarted(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // Mot de passe incorrect : message sous le champ
        setPasswordError(err.message);
      } else {
        // Lien devenu invalide ou expiré, serveur injoignable…
        setInfo(null);
        setLoadError(err instanceof ApiError ? err.message : UNEXPECTED);
      }
    } finally {
      setChecking(false);
    }
  }

  const expiry = info ? expiryNotice(info.expiresAt) : null;

  return (
    <section
      className="card file-card download-card"
      aria-labelledby="download-title"
    >
      <h1 id="download-title" className="card__title">
        Télécharger un fichier
      </h1>

      {loadError && <Banner variant="error">{loadError}</Banner>}
      {!info && !loadError && <p>Chargement…</p>}

      {info && expiry && (
        // method="post" + action : le formulaire vise directement l'API
        // (contrat § 5.3). Seuls les champs qui ont un « name » sont envoyés.
        <form
          ref={formRef}
          className="form"
          method="post"
          action={downloadApi.fileUrl(token)}
          onSubmit={handleSubmit}
          noValidate
        >
          <FileSummary name={info.originalName} size={info.size} />
          <Banner variant={expiry.variant}>{expiry.text}</Banner>

          {info.isProtected && (
            <>
              <Field
                id="download-password"
                label="Mot de passe"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Saisissez le mot de passe..."
                autoComplete="off"
                error={passwordError ?? undefined}
              />
              {/* 🔒 Le mot de passe part dans le CORPS de la requête POST,
                 jamais dans l'adresse (historique, journaux) */}
              <input type="hidden" name="password" value={password} />
            </>
          )}

          <button
            type="submit"
            className="button-soft button-soft--block"
            disabled={checking || (info.isProtected && password === '')}
          >
            <Icon name="download" />
            Télécharger
          </button>

          {started && (
            <p className="download-card__status" role="status">
              Le téléchargement a commencé.
            </p>
          )}
        </form>
      )}
    </section>
  );
}
