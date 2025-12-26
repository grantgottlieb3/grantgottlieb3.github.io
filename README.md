
# Grant Gottlieb — Personal Website

A clean, Apple‑inspired single‑page site built with just HTML/CSS/JS. Simple to edit and deploy on GitHub Pages.

## Quick start

1. **Download** this folder or clone the repo you push it to.
2. Open `index.html` in a browser to preview.
3. Replace placeholder images in `assets/images/**` and look for **EDIT ME** comments in the HTML.
4. Customize colors in `assets/css/styles.css` (CSS variables at the top).
5. Optional: drop PDFs or videos into `assets/docs` and `assets/video` and link them from the relevant project page.

## Structure

```
.
├── index.html              # Landing page / portfolio
├── assets/
│   ├── css/styles.css      # Colors/layout/typography
│   ├── js/script.js        # Smooth scrolling + footer year helper
│   ├── images/             # headshots, skills, personal, and project media
│   ├── video/              # project demo clips
│   └── docs/               # PDFs and other documents
├── projects/               # One folder per project page
│   ├── safe-send/index.html
│   ├── edwin/index.html
│   ├── starship/index.html
│   ├── fea/index.html
│   ├── spanish/index.html
│   └── hev/index.html
├── budget-test.html        # standalone budgeting prototype
├── emma-budget.html        # variant of the budgeting prototype
└── api/ai.js               # serverless proxy for the Spanish app
```

## Suggested Sections to Keep Updated

- **Experience** — Add bullet points that show impact/results.
- **Projects** — 3–6 cards with 1 image each; link to repos or videos.
- **Awards & Service** — Keep short; recruiters scan these quickly.

## Add a new project

1. Duplicate any `.project` card in the **Projects** section of `index.html`.
2. Add a 16:9 thumbnail to `assets/images/projects/<your-project>/` and update the `<img src>` to point to it.
3. If you need a full project page, duplicate a folder in `projects/`, adjust copy/media paths (use `../assets/...`), and keep the blurb to ~3 sentences with a few tags on the card.

## Deploy to GitHub Pages

1. Create a new public repo (e.g., `grantgottlieb.com` or `grantgottlieb-site`).
2. Commit these files and push to `main`.
3. In **Settings → Pages**, pick **Deploy from Branch**, select `main` and `/ (root)`.
4. After the site builds, you'll get a live URL. (Optional) Add a custom domain later.

## Local editing tips

- Use VS Code + the **Live Server** extension for instant preview.
- Image exports: prefer 1200–1600px wide JPEG/PNG; compress with TinyPNG/Squoosh.
- Keep copy concise. Think results + role + tools.

## License

MIT — do whatever you want; attribution appreciated.
