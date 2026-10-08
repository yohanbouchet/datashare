// ================================================================================================
// Fichier : Champ.tsx
// Rôle : Composant réutilisable « Input Component » des maquettes : une étiquette + un champ de saisie
//   + un message d'erreur sous le champ. Accessible : l'étiquette est reliée au champ (htmlFor / id),
//   le champ en erreur est signalé (aria-invalid) et relié à son message (aria-describedby),
//   que les lecteurs d'écran lisent automatiquement.
// Utilise :
//   - index.css : classes champ, champ__label, champ__saisie, champ__erreur
// Utilisé par :
//   - pages/Connexion.tsx, pages/Inscription.tsx (et plus tard les formulaires de fichiers)
// ================================================================================================
import type { ChangeEvent } from 'react';

// Les « props » : les réglages que la page donne au composant (comme les paramètres d'une fonction)
interface ProprietesChamp {
  id: string;
  label: string;
  value: string;
  onChange: (valeur: string) => void;
  type?: 'text' | 'email' | 'password';
  placeholder?: string;
  // autoComplete : aide le navigateur et les gestionnaires de mots de passe à remplir le champ
  autoComplete?: string;
  erreur?: string;
}

export function Champ({
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
  erreur,
}: ProprietesChamp) {
  const idErreur = `${id}-erreur`;
  return (
    <div className="champ">
      {/* htmlFor = id du champ : cliquer sur l'étiquette place le curseur dans le champ */}
      <label htmlFor={id} className="champ__label">
        {label}
      </label>
      <input
        id={id}
        className="champ__saisie"
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        // Champ « contrôlé » : React garde la valeur et la met à jour à chaque frappe
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onChange(e.target.value)
        }
        aria-invalid={erreur ? true : undefined}
        aria-describedby={erreur ? idErreur : undefined}
      />
      {/* Le message n'existe que s'il y a une erreur */}
      {erreur && (
        <p id={idErreur} className="champ__erreur">
          {erreur}
        </p>
      )}
    </div>
  );
}
