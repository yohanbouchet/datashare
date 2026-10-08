// ================================================================================================
// Fichier : Bandeau.tsx
// Rôle : Composant réutilisable « Callout Component » des maquettes : bandeau coloré avec icône.
//   3 variantes : info (bleu), alerte (orange), erreur (rouge).
//   Accessible : une erreur est annoncée immédiatement (role="alert"), une information poliment (role="status").
// Utilise :
//   - index.css : classes bandeau, bandeau--info, bandeau--alerte, bandeau--erreur
// Utilisé par :
//   - pages/Connexion.tsx, pages/Inscription.tsx (et plus tard la page de téléchargement)
// ================================================================================================
import type { ReactNode } from 'react';

interface ProprietesBandeau {
  variante: 'info' | 'alerte' | 'erreur';
  children: ReactNode;
}

export function Bandeau({ variante, children }: ProprietesBandeau) {
  return (
    <div
      className={`bandeau bandeau--${variante}`}
      role={variante === 'erreur' ? 'alert' : 'status'}
    >
      {/* Icône décorative (cercle avec « i » ou « ! ») : ignorée par les lecteurs d'écran */}
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
        {variante === 'info' ? (
          <path d="M12 16v-4M12 8h.01" />
        ) : (
          <path d="M12 8v4M12 16h.01" />
        )}
      </svg>
      <span>{children}</span>
    </div>
  );
}
