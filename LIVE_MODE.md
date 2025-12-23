# Live Development Mode

## Quick Start

```bash
npm run dev
```

This starts Vite dev server at `http://localhost:5173` with Hot Module Replacement (HMR).

## VS Code Port Forwarding

1. Run `npm run dev`
2. Open **Ports** panel (View → Ports, or click "Ports" in bottom panel)
3. Click **Forward a Port** → enter `5173`
4. Set visibility to **Public** (right-click → Port Visibility → Public)
5. Copy the forwarded URL (e.g., `https://xxx-5173.preview.app.github.dev`)

## Using in Platform

Add **both** scripts to your platform's custom HTML widget:

```html
<!-- Vite HMR client (required for hot reload) -->
<script type="module" src="https://YOUR-FORWARDED-URL/@vite/client"></script>

<!-- Your CSS -->
<link rel="stylesheet" href="https://YOUR-FORWARDED-URL/src/main.css">
```

Or as a single script that loads both:

```html
<script type="module">
  import 'https://YOUR-FORWARDED-URL/@vite/client';
  import 'https://YOUR-FORWARDED-URL/src/main.css';
</script>
```

Changes in `src/` files will hot-reload instantly in the browser.

## Tips

- Keep terminal running with `npm run dev`
- Check Vite output for HMR status
- Use browser DevTools to verify CSS loading
- Console should show `[vite] connected.` when HMR is active
