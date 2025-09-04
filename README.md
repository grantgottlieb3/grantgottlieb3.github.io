
# Grant Gottlieb — Personal Website

A clean, Apple‑inspired single‑page site built with just HTML/CSS/JS. Simple to edit and deploy on GitHub Pages.

## Quick start

1. **Download** this folder or clone the repo you push it to.
2. Open `index.html` in a browser to preview.
3. Replace placeholder images in `/assets` and look for **EDIT ME** comments in `index.html`.
4. Customize colors in `styles.css` (CSS variables at the top).
5. Optional: add a PDF of your resume to the repo and link it to the "Download Resume" button.

## Structure

```
.
├── index.html      # All content lives here (find EDIT ME markers)
├── styles.css      # Colors/layout/typography
├── script.js       # Smooth scrolling + handy helpers
├── assets/         # Images (replace placeholders with real photos/renders)
└── .nojekyll       # Ensures GitHub Pages serves files as-is
```

## Suggested Sections to Keep Updated

- **Experience** — Add bullet points that show impact/results.
- **Projects** — 3–6 cards with 1 image each; link to repos or videos.
- **Awards & Service** — Keep short; recruiters scan these quickly.

## Add a new project

1. Duplicate any `.project` card in the **Projects** section of `index.html`.
2. Put a 16:9 image in `/assets` (e.g., `my-project.jpg`) and update the `<img src>`.
3. Keep the blurb to ~3 sentences and add a few tags.

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
