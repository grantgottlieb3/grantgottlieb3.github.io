# Emma's Gallery

A single page photography portfolio with a pannable, zoomable photo cluster. Plain HTML, CSS, and JavaScript. No build step, no backend.

## Files

| File | What it does | Edit it? |
|---|---|---|
| `photos.js` | The list of photos | Yes, this is the only file you edit |
| `images/thumbs/` | Small copies for the collage | Add and remove photos here |
| `images/full/` | Large copies for the lightbox | Add and remove photos here |
| `index.html` | Page structure | Rarely |
| `styles.css` | Look and motion | Rarely |
| `script.js` | Filters, cluster layout, pan and zoom, lightbox | Rarely |

## Add a photo

1. Export two copies with the same filename (sizes below).
2. Put the small one in `images/thumbs/` and the large one in `images/full/`.
3. Open `photos.js`, copy an existing line, and change the details:
   ```js
   { file: "lisbon-rooftops.jpg", category: "Travel", featured: false, alt: "Terracotta rooftops at sunset" },
   ```
4. Save and refresh.

Remove a photo by deleting its line. Move it by changing its category. A new category name creates a new bubble on its own, and a category with no photos disappears.

Filenames are case sensitive once the site is online. `Paris.jpg` and `paris.jpg` are different files on GitHub Pages even though your computer may treat them as the same. Use lowercase names with no spaces.

## Recommended export sizes

| Copy | Long edge | Format | Target file size |
|---|---|---|---|
| Thumbnail | 600 px | JPEG, quality 80, sRGB | under 120 KB |
| Full | 2000 px | JPEG, quality 82 to 85, sRGB | under 700 KB |

Export both copies from the same crop so their shapes match. Lightroom: set up two export presets (one per size) and run both on the same selection.

Optional speed boost: add `width` and `height` (the thumbnail's pixel size) to an entry in `photos.js`. With those filled in, the page places the photo without downloading it first, so true lazy loading kicks in. Without them, the page downloads each thumbnail in the current filter once to read its shape.

## Preview on your computer

Double click `index.html`. Everything works offline except the two web fonts, which fall back to system fonts.

## Deploy to GitHub Pages

1. Create a new public repository on GitHub, for example `emmas-gallery`.
2. Upload every file and folder from this project to the repository root (Add file > Upload files, or `git push`).
3. Open the repository's Settings > Pages.
4. Under Build and deployment, choose Deploy from a branch, pick `main` and `/ (root)`, then Save.
5. Wait a minute or two. The site appears at `https://YOUR-USERNAME.github.io/emmas-gallery/`.

To update the site later, upload changed files (or push) and GitHub republishes automatically.

## Add a custom domain later

1. Buy the domain from any registrar (Namecheap, Cloudflare, Squarespace Domains, and so on).
2. In the repository's Settings > Pages, type the domain under Custom domain and Save. GitHub adds a `CNAME` file to the repository; keep it.
3. At the registrar, add DNS records:
   * For the root domain (`emmasgallery.com`): four `A` records pointing to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, and `185.199.111.153`.
   * For `www`: a `CNAME` record pointing to `YOUR-USERNAME.github.io`.
4. DNS can take up to 24 hours. Once GitHub shows the domain as verified, tick Enforce HTTPS.

Check GitHub's current docs before step 3, since these addresses can change: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site

## Future About section

Look for `ABOUT SECTION SLOT` in `index.html` and `styles.css`.
