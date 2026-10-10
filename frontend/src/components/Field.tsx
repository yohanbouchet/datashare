// =============================================================================
// Fichier : Field.tsx
// Rôle : Composant réutilisable « Input Component » des maquettes : une
//   étiquette + un champ de saisie + un message d'erreur sous le champ.
//   Accessible : l'étiquette est reliée au champ (htmlFor / id), le champ en
//   erreur est signalé (aria-invalid) et relié à son message
//   (aria-describedby), que les lecteurs d'écran lisent automatiquement.
// Utilise :
//   - index.css : classes field, field__label, field__input, field__error
// Utilisé par :
//   - pages/Login.tsx, pages/Register.tsx (et plus tard les formulaires de
//     fichiers)
// =============================================================================
import type { ChangeEvent } from 'react';

// Les « props » : les réglages que la page donne au composant (comme les
// paramètres d'une fonction)
interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'password';
  placeholder?: string;
  // autoComplete : aide le navigateur et les gestionnaires de mots de passe à
  // remplir le champ
  autoComplete?: string;
  error?: string;
}

export function Field({
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
  error,
}: FieldProps) {
  const errorId = `${id}-erreur`;
  return (
    <div className="field">
      {/* htmlFor = id du champ : cliquer sur l'étiquette place le curseur
         dans le champ */}
      <label htmlFor={id} className="field__label">
        {label}
      </label>
      <input
        id={id}
        className="field__input"
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        // Champ « contrôlé » : React garde la valeur et la met à jour à chaque
        // frappe
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onChange(e.target.value)
        }
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {/* Le message n'existe que s'il y a une erreur */}
      {error && (
        <p id={errorId} className="field__error">
          {error}
        </p>
      )}
    </div>
  );
}
