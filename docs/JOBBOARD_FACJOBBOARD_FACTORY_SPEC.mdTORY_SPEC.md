# 🏭 JOBBOARD FACTORY — Master Integration Spec

**Rôle :** Agent d'Ingénierie de Données & Automation.
**Mission :** Générer, tester et déployer des adaptateurs standardisés pour les jobboards majeurs. Chaque adaptateur doit transformer une page web ou une réponse API brute en un objet `ScrapedJob` normalisé.

---

## 🗺️ Répertoire des Cibles & Stratégies

| Jobboard | Marché | Méthode Prioritaire | Difficulté | Notes Techniques |
| :--- | :--- | :--- | :--- | :--- |
| **LinkedIn** | Global | Playwright (Stealth) | 🔴 Haute | Gérer les sélecteurs dynamiques et les popups de login. |
| **France Travail** | FR | **API REST Officielle** | 🟢 Facile | Utiliser OAuth2 (francetravail.io). Pas de scraping. |
| **Indeed** | Global | Playwright / XHR | 🟠 Moyenne | Gérer Cloudflare et les paramètres de pagination `&start=`. |
| **APEC** | FR (Cadres) | JSON-LD / DOM | 🟢 Facile | Très structuré, focus sur le segment "Cadre". |
| **HelloWork** | FR | XHR Sniffing | 🟠 Moyenne | Intercepter les appels aux APIs internes `.json`. |
| **WTTJ** | Tech/Startups | **API Algolia** | 🟢 Facile | Utiliser les clés API publiques trouvées dans les headers. |
| **Glassdoor** | Global | DOM Scraping | 🔴 Haute | Anti-bot agressif, nécessite un pool d'User-Agents. |
| **Cadremploi** | FR | DOM / JSON-LD | 🟠 Moyenne | Groupe Figaro, structure assez stable. |
| **Otta** | Tech/Global | XHR Sniffing | 🟠 Moyenne | Très moderne, data propre en JSON via API interne. |
| **Talent.com** | Global | DOM Scraping | 🟢 Facile | Excellent pour le scraping de masse (agrégateur). |
| **Meteojob** | FR | DOM Scraping | 🟠 Moyenne | Structure classique, pagination par scroll. |
| **Hired** | Tech | Playwright | 🟠 Moyenne | Requiert souvent une session, simuler une navigation. |

---

## 🛠️ Protocole de Génération d'Adaptateur

Pour chaque jobboard, l'agent doit suivre ce workflow :

### 1. Phase de Reconnaissance (Discovery)
- Naviguer vers l'URL de recherche.
- Vérifier la présence de `<script type="application/ld+json">`.
- Inspecter l'onglet "Network" pour des requêtes retournant du JSON (XHR).

### 2. Mapping du Schéma (Normalization)
Convertir les champs spécifiques vers notre interface `ScrapedJob` :
- `title` ➡️ Titre du poste.
- `company` ➡️ Nom de l'entreprise.
- `location` ➡️ Ville + Code Postal (si FR).
- `job_type` ➡️ Mapper vers `CDI`, `CDD`, `MIS`, `ALT`, `STG`.
- `description` ➡️ Texte brut (nettoyer le HTML).
- `salary_range` ➡️ Normaliser en "XXk - YYk € / an" ou "XX€ / h".

### 3. Implémentation de la Résilience (Defense)
- **Rotation :** Changer l'User-Agent toutes les 5 requêtes.
- **Throttling :** Pause aléatoire entre 1.2s et 3.8s entre les pages.
- **Stealth :** Utiliser `playwright-extra` avec `stealth`.
- **Error Handling :** Si un sélecteur change, lever une alerte `SELECTOR_MISMATCH` avec screenshot.

---

## ✅ Checklist de Validation (Definition of Done)
- [ ] Le fichier `lib/scraper/sources/[name].ts` est créé.
- [ ] La fonction `scrape()` supporte les paramètres `keywords` et `location`.
- [ ] Le scraper gère au moins 3 pages de résultats (pagination).
- [ ] Les doublons sont filtrés via un hash SHA-256 de l'URL.
- [ ] Le code passe le `npm run type-check`.
