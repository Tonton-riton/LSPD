# LSPD // MDT — Calculateur de Peines & Panel de Gestion (San Andreas)

Application React + Vite complète pour le calcul des amendes, peines de prison, circonstances aggravantes, génération d'images PNG récapitulatives et rédaction automatique/éditable des Rapports d'Arrestation LSPD & Droits Miranda.

## Fonctionnalités
- **84 Infractions & 159 Circonstances Aggravantes** issues du Google Sheet officiel.
- **Moteur de formules conforme au Sheet** (`Tentative ×0.5`, `Complicité ×0.75`, `Avocat ×0.9`, Paliers `MIN 1 (20%)`, `MIN 2 (40%)`, `NOMINALE (60%)`, `AGGRAVÉ (80%)`, `MAXIMAL (100%)`, Rétention `3h / 12h / 24h`, Conversion UP).
- **Générateur d'image PNG** de toutes les amendes mises (copie directe dans le presse-papiers pour Discord ou téléchargement `.PNG`).
- **Rapport d'Arrestation Officiel LSPD & Droits Miranda** générés automatiquement, 100% modifiables en direct et copiables en un clic.
- **Entièrement réglable** (coefficients, paliers, barèmes des peines et circonstances aggravantes).

## Lancement
- Double-cliquez sur `LANCER_LE_SITE.bat` (ou `npm install` puis `npm run dev`), ou ouvrez directement `dist/index.html`.
