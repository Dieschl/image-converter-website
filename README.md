# Bildformat-Konverter

Ein schneller, rein clientseitiger Bildformat‑Konverter (PNG/JPG/WEBP/AVIF) mit vorbereiteten Werbeplätzen (oben, links, rechts, unten). 

- **Kein Server erforderlich** – alles passiert im Browser (DSGVO‑freundlich).
- **Hosting-Empfehlung**: Cloudflare Pages (Free Plan reicht aus).
- **Deploy**: Repo mit Cloudflare Pages verknüpfen → kein Build-Command nötig (statische Seite).

## Ordnerstruktur

```
image-converter-website/
├── index.html
├── assets/
│   └── favicon.png
├── css/
│   └── styles.css
├── js/
│   └── app.js
├── legal/
│   ├── impressum.html
│   ├── datenschutz.html
│   └── cookies.html
├── .gitignore
└── README.md
```

## Lokale Nutzung

- Öffne `index.html` einfach im Browser.

## Cloudflare Pages (kurz)

- Neues GitHub‑Repo anlegen und Dateien hochladen.
- In Cloudflare Dashboard → **Workers & Pages → Create → Pages** → **Connect to Git** → Repo wählen.
- **Build command** leer lassen, **Output directory**: `/`.
- Deploy starten.

Stand: 2026-01-22 09:28:55 UTC
