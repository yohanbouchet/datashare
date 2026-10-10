// =============================================================================
// Fichier : Home.tsx
// Rôle : Page d'accueil (adresse « / ») : « Tu veux partager un fichier ? » +
//   bouton rond de téléversement (US01, maquette Figma « Téléversement »).
//   - Pas connecté : le téléversement exige un compte, le bouton mène à la
//     page de connexion.
//   - Connecté : le bouton ouvre le sélecteur de fichier du système ; le
//     fichier choisi s'affiche dans la carte « Ajouter un fichier »
//     (UploadCard), à la place du titre et du bouton.
// Utilise :
//   - context/useAuth.ts (user) ; components/UploadCard.tsx, Icon.tsx
//   - react-router (Link)
//   - index.css : classes home, home__title, home__button
// Utilisé par :
//   - App.tsx (route « / ») ; « Ajouter des fichiers » de Mon espace
// =============================================================================
import { useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router';
import { Icon } from '../components/Icon.tsx';
import { UploadCard } from '../components/UploadCard.tsx';
import { useAuth } from '../context/useAuth.ts';

export function Home() {
  const { user } = useAuth();
  // useRef : accès direct au champ <input type="file"> caché, pour l'ouvrir
  // depuis le bouton rond ou le bouton « Changer »
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  function openPicker() {
    inputRef.current?.click();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    if (chosen) setFile(chosen);
    // Remise à zéro : rechoisir le même fichier déclenchera bien un changement
    event.target.value = '';
  }

  return (
    <>
      {/* Sélecteur de fichier du système, caché : on l'ouvre par le code */}
      {user && (
        <input
          ref={inputRef}
          type="file"
          className="visually-hidden"
          tabIndex={-1}
          aria-hidden="true"
          onChange={handleFileChange}
        />
      )}

      {file ? (
        // key : un nouveau fichier recrée la carte (formulaire remis à zéro)
        <UploadCard
          key={`${file.name}-${file.size}-${file.lastModified}`}
          file={file}
          onChangeFile={openPicker}
        />
      ) : (
        <section className="home">
          {/* h1 : le titre principal de la page (un seul par page, repère
             pour l'accessibilité) */}
          <h1 className="home__title">Tu veux partager un fichier ?</h1>
          {/* aria-label : le bouton ne contient qu'une icône, ce texte est lu
             par les lecteurs d'écran */}
          {user ? (
            <button
              type="button"
              className="home__button"
              onClick={openPicker}
              aria-label="Téléverser un fichier"
            >
              <Icon name="upload" size={40} />
            </button>
          ) : (
            <Link
              to="/connexion"
              className="home__button"
              aria-label="Téléverser un fichier (connexion requise)"
            >
              <Icon name="upload" size={40} />
            </Link>
          )}
        </section>
      )}
    </>
  );
}
