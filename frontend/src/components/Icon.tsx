// =============================================================================
// Fichier : Icon.tsx
// Rôle : Composant réutilisable d'icônes (dessins vectoriels SVG au trait, dans
//   le style des maquettes). Une seule source pour toutes les icônes : nom,
//   taille, couleur héritée du texte (currentColor).
//   🔒 / ♿ Les icônes sont décoratives (aria-hidden) : le texte ou l'aria-label
//   du bouton qui les contient est lu par les lecteurs d'écran.
// Utilise :
//   - rien (SVG standard)
// Utilisé par :
//   - components/SpaceLayout.tsx, pages/MySpace.tsx (et les écrans suivants)
// =============================================================================
import type { ReactNode } from 'react';

export type IconName =
  | 'file'
  | 'lock'
  | 'trash'
  | 'arrow-right'
  | 'upload'
  | 'download'
  | 'copy'
  | 'logout'
  | 'menu'
  | 'close'
  | 'more';

// Tracés de chaque icône (grille de 24 × 24)
const PATHS: Record<IconName, ReactNode> = {
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </>
  ),
  'arrow-right': <path d="M5 12h14M12 5l7 7-7 7" />,
  upload: (
    <>
      <path d="M16 16l-4-4-4 4" />
      <path d="M12 12v9" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </>
  ),
  download: (
    <>
      <path d="M8 17l4 4 4-4" />
      <path d="M12 12v9" />
      <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </>
  ),
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  close: <path d="M18 6L6 18M6 6l12 12" />,
  more: (
    <>
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="19" r="1" />
    </>
  ),
};

interface IconProps {
  name: IconName;
  // Taille en pixels (16 par défaut, comme le texte)
  size?: number;
}

export function Icon({ name, size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
