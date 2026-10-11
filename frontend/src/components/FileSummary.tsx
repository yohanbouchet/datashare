// =============================================================================
// Fichier : FileSummary.tsx
// Rôle : Composant réutilisable « résumé d'un fichier » des maquettes : icône,
//   nom (coupé par « … » s'il est trop long, nom complet en infobulle),
//   taille lisible (« 2,6 Mo »), en rouge si le fichier est trop gros, et
//   type du fichier s'il est fourni (« image/jpeg », page Téléchargement).
// Utilise :
//   - components/Icon.tsx ; utils/format.ts (formatSize)
// Utilisé par :
//   - components/UploadCard.tsx (téléversement), pages/Download.tsx
// =============================================================================
import { formatSize } from '../utils/format.ts';
import { Icon } from './Icon.tsx';

interface FileSummaryProps {
  name: string;
  size: number;
  // true : taille affichée en rouge (fichier de plus de 1 Go)
  tooLarge?: boolean;
  // Type du fichier (facultatif) : affiché après la taille
  type?: string;
}

export function FileSummary({
  name,
  size,
  tooLarge = false,
  type,
}: FileSummaryProps) {
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
          {type && ` · ${type}`}
        </p>
      </div>
    </div>
  );
}
