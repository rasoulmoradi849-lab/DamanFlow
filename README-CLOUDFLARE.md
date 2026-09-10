# DamarFlow — Cloudflare deployment package

This package is prepared from `damarflow-homepage-advanced.html` for a static Cloudflare Pages deployment.

## Structure

- `index.html` — production homepage
- `404.html` — branded not-found page
- `robots.txt` — crawler directives
- `sitemap.xml` — canonical sitemap
- `site.webmanifest` — installable web-app metadata
- `_redirects` — Cloudflare Pages redirects
- `_headers` — security/cache headers
- `assets/svg/favicon.svg` — vector favicon
- `assets/svg/damarflow-workflow.svg` — scientific workflow illustration
- `assets/img/damarflow-og.png` — 1200×630 social/Open Graph preview
- `assets/img/favicon-32.png` and `favicon-192.png` — PNG favicon sizes

## Custom domain

The package is configured for:

`https://damarflow.com/`

If your purchased domain is different, replace `damarflow.com` in `index.html`, `robots.txt`, and `sitemap.xml` before production.

## Cloudflare Pages settings

For a Git-connected static site:
- Production branch: `main`
- Framework preset: None
- Build command: `exit 0`
- Build output directory: `/`

Push this folder to GitHub, then connect the repository to Cloudflare Pages.

## Custom domain

In Cloudflare:
Workers & Pages → your project → Custom domains → Set up a domain.

For an apex domain such as `damarflow.com`, Cloudflare requires the domain to be added as a Cloudflare zone and its nameservers configured at the registrar.

## Important

The interactive model laboratory in the homepage is a conceptual front-end visualization. It is not a production reactive-transport solver and should not be presented as validated model output until connected to your validated numerical/PINN backend.
