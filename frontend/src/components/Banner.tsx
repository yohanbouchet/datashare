// =============================================================================
// Fichier : Banner.tsx
// Rôle : Composant réutilisable « Callout Component » des maquettes : bandeau
//   coloré avec icône. 3 variantes (variant) : info (bleu), warning (orange,
//   alerte), error (rouge, erreur). Accessible : une erreur est annoncée
//   immédiatement (role="alert"), une information poliment (role="status").
// Utilise :
//   - index.css : classes banner, banner--info, banner--warning, banner--error
// Utilisé par :
//   - pages/Login.tsx, pages/Register.tsx (et plus tard la page de
//     téléchargement)
// =============================================================================
import type { ReactNode } from 'react';

interface BannerProps {
  variant: 'info' | 'warning' | 'error';
  children: ReactNode;
}

export function Banner({ variant, children }: BannerProps) {
  return (
    <div
      className={`banner banner--${variant}`}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      {/* Icône décorative (cercle avec « i » ou « ! ») : ignorée par les
         lecteurs d'écran */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        {variant === 'info' ? (
          <path d="M12 16v-4M12 8h.01" />
        ) : (
          <path d="M12 8v4M12 16h.01" />
        )}
      </svg>
      <span>{children}</span>
    </div>
  );
}
