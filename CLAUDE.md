# Portfolio d'Esteban Lafargue — notes pour Claude

Site statique (HTML/CSS/JS à la main, sans framework) publié par GitHub Pages depuis `main`, à la racine :
https://esteban-lafargue.github.io — dépôt `Esteban-Lafargue/esteban-lafargue.github.io` (ancienne adresse katarn34.github.io, sans redirection).

Esteban est Technical Designer sous Unreal Engine 5 (Montpellier). Il me parle en **français** ;
le site est en **anglais d'abord**, puis traduit en français dans `/fr/` (généré).

> Ce fichier est public (le site sert tout le dépôt). N'y mettre aucune info privée ni détail sous NDA.

## Règles de contenu (non négociables)
- **Aucun chiffre ni fait inventé.** Seulement ce qu'Esteban a confirmé. Dans le doute, demander.
- **WolfPeak Studio est sous NDA :** nom du studio citable, jeu « multijoueur non annoncé ». Illustrations génériques, clairement signalées comme telles.
- Vocabulaire : « refactorisation / refactorisé », jamais « refonte / refondu ». Gameplay Tags = liste UE5, pas « data-driven ».
- Chaîne YouTube : https://youtube.com/@estebanlafargue
- Chiffres validés pour l'accueil : nouvel objet en **< 1 min** sans programmeur · **8 effets** créés sans C++ · **5 outils de debug** IA · **60+ étudiants**. Pitch : « I build gameplay & AI systems Designers can tune without waiting for code. »
- Ton : phrases courtes, concrètes ; un recruteur lit en 30 s.

## Structure
- Pages EN : `index.html` (accueil), `projects/`, `klappen/`, `klappen/building/`, `wolfpeak/`, `flying-ai/`, `abyss/`, `about/`, `tutorials/`, `contact/`.
- `fr/…` : **généré, ne jamais modifier à la main.**
- `css/style.css` (tokens, nav, nodes Blueprint, rail, cartes, survols), `css/case.css` (études de cas, thèmes `[data-theme]`), `css/home.css` (accueil + page contact).
- `js/main.js` : apparition au scroll, façade YouTube, vidéos au survol, lightbox, **rail d'exécution** (fil à gauche, arrêts sur `.stitle` et `[data-stop]`), formulaire Web3Forms, bouton lecture de la Demo Reel.
- `js/projects.js` + `data/projects.json` : cartes de projets (`data-projects="featured"` avec `data-layout="bento"`, ou `"all"`). Champs : `title, category, period, team, role, pitch, hook, metric, kind, status, url, thumb, hover, featured` et bloc `fr` pour la traduction. `data-base` = chemin des données/médias, `data-link-base` = chemin des liens (pour rester dans la bonne langue).
- `js/abyss.js` + `data/abyss.json` : feuille de route et devlog d'Abyss.
- Médias : `assets/img/…`, `assets/video/…` (Demo Reel : `assets/video/reel/demo-reel.mp4`), CV EN/FR en PDF **à la racine**, noms courts pour LinkedIn : `Esteban-Lafargue-CV-EN.pdf` et `Esteban-Lafargue-CV-FR.pdf` (https://esteban-lafargue.github.io/Esteban-Lafargue-CV-EN.pdf). Ne pas les renommer ni les déplacer : ces URL sont partagées sur LinkedIn. Pour mettre à jour un CV, remplacer le fichier sous le même nom.

## Workflow obligatoire à chaque modification
1. Modifier les pages **anglaises** (et `data/*.json` si besoin).
2. Si un CSS/JS change : incrémenter `?v=N` dans **toutes** les pages (`grep -rl 'v=48' --include=*.html . | xargs sed -i 's/v=48/v=49/g'`). Version actuelle : **v=48**.
3. Traductions : `python3 tools/build_fr.py` (nécessite `beautifulsoup4`). Il doit afficher **0 missing**. Sinon, ajouter les clés listées dans `tools/i18n/missing.json` dans un fichier `tools/i18n/fr-NN-sujet.json` (clé = HTML interne anglais, espaces normalisés ; valeur = HTML français), puis relancer.
   - Nouvelle page → l'ajouter à `PAGES` dans `tools/build_fr.py`.
4. Vérifier visuellement (bureau 1440 px + mobile 390 px, pas de défilement horizontal) : `python3 -m http.server` puis capture Playwright ou navigateur.
5. Commit + push sur `main`, puis **vérifier le déploiement** : `gh run list -R Esteban-Lafargue/esteban-lafargue.github.io -L 1`. Si GitHub bloque (« in progress deployment », « syncing files »), relancer ou pousser un commit vide.
   - Auteur des commits : Esteban Lafargue <estebanlafargue34@gmail.com>.

## Abyss (routine)
- `python3 tools/sync_abyss.py <chemin vers Plan.md>` régénère les jalons dans `data/abyss.json` (garde le devlog et `milestone_names_fr`).
- Nouvelle entrée de devlog : l'ajouter dans `data/abyss.json` (EN + bloc `fr`), puis lancer `build_fr.py`.

## Médias
- Vidéo web : `ffmpeg -an -vf scale=1280:-2 -c:v libx264 -preset veryfast -crf 25 -pix_fmt yuv420p -movflags +faststart` (garder l'audio pour la Demo Reel : `-c:a aac -b:a 128k`).
- Images : JPG qualité ≈ 84, largeur max 1920 ; PNG pour les graphes Blueprint.
- Sources vidéo de la Demo Reel : `F:\Portfolio\Video Demo Reel` (PC d'Esteban).

## Design
**Mots d'ordre : satisfaisant, agréable et vivant.** Du *gamefeel* / *juice* comme dans un jeu : chaque action (scroll, survol, clic, arrivée sur une section) donne un retour net et plaisant (pop, onde, lueur, léger rebond), sans gêner la lecture. `prefers-reduced-motion` = **mode doux** (choix d'Esteban) : le site reste vivant (fond ralenti, clics, lueurs, son, compteur, fondus), seuls les gros mouvements sont coupés (tilt, rebonds, glissements, particules). Le site doit paraître vivant (fond animé discret : impulsions sur la grille, lueur sous la souris, onde + impulsions au clic sur la grille vide), sans jamais déconcentrer de la lecture. Ex. : le rail s'arrête pile sur son dernier point et chaque point « pop » ; les chiffres clés comptent ; les titres de section « pop ». Effets regroupés en fin de `css/style.css` (« Alive + juice ») et `js/main.js` §9-14.
Effets validés par Esteban (ne pas en ajouter sans son accord ; « c'est un portfolio, pas un jeu ») : cartes de projets inclinées vers la souris + reflet + écrasement au clic (§12) ; transitions entre pages : fondu + fil fin en haut, pas de rideau (§13) ; impulsion d'exécution sur l'en-tête des nodes au survol, pins de BP_Esteban en cascade ; téléchargement du CV = particules + toast « CV acquired ✓ » sous le bouton (§14) ; son « blip » très léger et varié au clic sur la grille (Web Audio, gamme pentatonique) ; **chasse aux bugs** : de petits bugs marchent sur la grille vide et contournent le contenu (jamais sur le texte), l'explosion du clic les corrige aussitôt (flash rouge de breakpoint, éclats, « pop », bulle « BUG_007 · FIXED »), bug critique doré rare (+3), compteur discret « Bugs fixed » en haut à droite (sessionStorage).
**Veille gamefeel (règle pour toute session) :** quand une modification ajoute ou change un élément du site (nouvelle section, page, bouton, carte, formulaire, média…), vérifier s'il gagnerait à avoir du juice cohérent avec les effets existants. Si oui, ne pas l'ajouter soi-même : finir la tâche, puis proposer à Esteban en une ligne l'idée précise et de la confier au fil « Améliorer le gamefeel du portfolio ». Ne proposer que quand c'est vraiment pertinent (pas à chaque modification).
Procédure gamefeel : un effet = un commit, mis en ligne, puis validé ou annulé (`git revert`) par Esteban. Rappeler Ctrl+F5 page par page (GitHub Pages met les pages en cache 10 min).

Univers du CV : fond très sombre, couleurs par section, « pins » et nodes Blueprint, Poppins + JetBrains Mono.
Tout élément cliquable doit le montrer (survol + bouton visible au repos, utile sur mobile). Menu identique partout :
Home · Projects · Tutorials · About · Contact · FR · CV.

## En attente (à demander à Esteban)
- Étude de cas **SplashDown** (rôle, équipe, année 2024 ; sources dans `F:\Portfolio\SplashDown`).
- **Abyss** : avancement actuel + capture ou vidéo (la carte d'accueil n'a pas d'image).
- Genre du jeu WolfPeak, si citable sans casser le NDA ; post-mortem WolfPeak.
- Confirmer le nombre d'arbres/rochers de Kläppen (le CV dit « des milliers ») avant de l'afficher.
- Liens blueprintUE (Kläppen : Get Snap Location, Math Function Snapping, Blueprint to HISM, HISM to Blueprint ; graphes Flying AI).
- Mesures de performance Flying AI ; plateformes (Kläppen, Project Defender, casque VR).
- Témoignages ; infos VR Fabre, Interim-14 ; contenu des ateliers Blueprint à paliers.
- Demo Reel v3 : musique libre de droits, rôle d'Esteban par projet, WolfPeak/Abyss, puis la publier sur YouTube (remettre le lecteur YouTube à la place du MP4 si besoin).
- Plus tard : univers visuel propre à chaque projet.
