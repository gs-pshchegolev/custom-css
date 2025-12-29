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

## TPS Integration

Add this script to TPS to enable debug mode with Vite HMR:

```html
<script type="module">
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('__debugMode') && localStorage.hasItem('__viteDevServer');) {
      const viteHost = localStorage.getItem('__viteDevServer');
      await import(`${viteHost}/@vite/client`);
      await import(`${viteHost}/src/main.css`);
    }
  } catch (error) {
    console.error('Vite HMR Error:', error);
  } finally {
    console.log('%c⚠️ DEBUG CUSTOM CSS IS ON - REMOVE BEFORE GOING LIVE ⚠️', 'background: red; color: white; font-size: 20px; padding: 10px;');
  }
</script>
```

### Activation

1. Run `npm run dev` and get your forwarded URL
2. Set the Vite URL in localStorage (run in browser console):

```javascript
localStorage.setItem('vite', 'https://YOUR-FORWARDED-URL');
```

3. Add `?__debugMode` to any page URL to activate HMR

### Notes

- Vite URL persists in localStorage until cleared
- To change: `localStorage.setItem('vite', 'NEW-URL')`
- To disable: `localStorage.removeItem('vite')`

## Chrome DevTools Local Overrides

An alternative to platform HTML widgets - use Chrome's Local Overrides to inject the Vite client into any page.

### Setup (one-time)

1. Open Chrome DevTools (`F12` or `Cmd+Option+I`)
2. Go to **Sources** tab
3. Click **Overrides** in the left sidebar (you may need to click `>>` to find it)
4. Click **Select folder for overrides** → create/select a folder (e.g., `~/chrome-overrides`)
5. Click **Allow** when Chrome asks for permission

### Enable HMR on a page

1. Run `npm run dev` and get your forwarded URL
2. In DevTools **Sources** → **Page**, find the HTML file (usually the main document)
3. Right-click → **Save for overrides**
4. Add this script inside `<head>` or before `</body>`:

```html
<script type="module">
  import 'https://YOUR-FORWARDED-URL/@vite/client';
  import 'https://YOUR-FORWARDED-URL/src/main.css';
</script>
```

5. Save (`Cmd+S`) and refresh the page
6. Console should show `[vite] connected.`

### Notes

- You need to add the script to **each HTML page** you want HMR on
- Overrides persist across browser restarts
- Purple dot on file icon = file has local override
- To disable: uncheck **Enable Local Overrides** in the Overrides panel
- To remove: right-click the override file → **Delete**

## Tips

- Keep terminal running with `npm run dev`
- Check Vite output for HMR status
- Use browser DevTools to verify CSS loading
- Console should show `[vite] connected.` when HMR is active
