// Composant racine provisoire de DataShare.
// Rôle à l'étape 2 : prouver que le front (port 5173) et l'API (port 3000) communiquent.
// Il sera remplacé par les vrais écrans (connexion, téléversement, mon espace…) à partir de l'étape 3.

// useState = la "mémoire" du composant ; useEffect = une action déclenchée par l'affichage.
import { useEffect, useState } from 'react';

function App() {
  // Mémoire du composant : le texte à afficher, "Chargement…" au départ
  const [message, setMessage] = useState<string>('Chargement…');

  // Au premier affichage de la page, on appelle l'API une seule fois ([] = une seule fois)
  useEffect(() => {
    // L'adresse de l'API vient de frontend/.env (VITE_API_URL) : rien n'est écrit en dur.
    fetch(import.meta.env.VITE_API_URL)
      .then((response) => {
        // fetch ne considère pas un 404 ou un 500 comme une erreur : on le vérifie nous-mêmes
        if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
        return response.text();
      })
      .then((texte) => setMessage(texte)) // on range la réponse dans la mémoire → l'écran se met à jour
      .catch(() => setMessage("Impossible de joindre l'API")); // API arrêtée, CORS refusé…
  }, []);

  // Le JSX ci-dessous décrit l'écran ; {message} affiche la valeur actuelle de la mémoire.
  return (
    <main>
      <h1>DataShare</h1>
      <p>Réponse de l'API : {message}</p>
    </main>
  );
}

// Export par défaut : permet à main.tsx d'importer ce composant.
export default App;
