# Custom CSS Build System

A round-trip CSS build system for managing platform styles. Supports both **development** (building from source) and **reverse-engineering** (extracting from bundled CSS).

## Quick Start

```bash
npm install
npm run build      # Build CSS bundle from source
npm run unbundle   # Extract CSS from community bundle
npm run sync       # Check/fix main.css imports
```

## Folder Structure

```
custom-css/
├── input/                    # 📥 INPUT: Place community bundles here
│   └── platform-bundle.css   #    (downloaded from platform)
├── dist/                     # 📤 OUTPUT: Built bundles go here
│   └── platform-bundle.css
├── src/                      # 📝 SOURCE: Editable CSS files
│   ├── main.css              #    Entry point (imports all files)
│   ├── common/
│   │   └── global.css        #    Global styles (no anchor)
│   └── by-css-anchor/        #    Widget styles (by data-css-anchor)
│       ├── header.css
│       ├── footer.css
│       └── ...
└── scripts/                  # 🔧 Build tools
```

## Workflows

### Flow 1: Development (Source → Bundle)

Build CSS from source files into a single bundle.

```mermaid
flowchart LR
    subgraph src[Source Files]
        main[main.css]
        global[common/global.css]
        widgets[by-css-anchor/*.css]
    end
    
    subgraph dist[Output]
        bundle[platform-bundle.css]
    end
    
    main --> |npm run build| bundle
    global --> main
    widgets --> main
```

**Commands:**
```bash
npm run build     # Build bundle from source
npm run dev       # Watch mode for development
```

---

### Flow 2: Reverse Engineering (Bundle → Source)

Extract CSS from a community bundle back into organized source files.

```mermaid
flowchart LR
    subgraph input[Input]
        community[platform-bundle.css<br/>from community]
    end
    
    subgraph process[Processing]
        unbundle[npm run unbundle]
        routing{Route by<br/>data-css-anchor}
    end
    
    subgraph src[Source Files]
        global[common/global.css]
        widgets[by-css-anchor/*.css]
        quarantine[quarantine.css]
    end
    
    community --> unbundle
    unbundle --> routing
    routing --> |no anchor| global
    routing --> |single anchor| widgets
    routing --> |parse error| quarantine
```

**Commands:**
```bash
# 1. Place bundle in input folder
cp ~/Downloads/community-styles.css input/platform-bundle.css

# 2. Run unbundle
npm run unbundle

# 3. Sync main.css imports
npm run sync --fix
```

---

### Flow 3: Round-Trip (Full Cycle)

Complete workflow for syncing changes from community back to source and rebuilding.

```mermaid
flowchart TD
    subgraph Community
        download[Download bundle<br/>from platform]
    end
    
    subgraph Local[Local Development]
        input[input/platform-bundle.css]
        unbundle[npm run unbundle]
        src[src/ files]
        edit[Edit source files]
        sync[npm run sync --fix]
        build[npm run build]
        output[dist/platform-bundle.css]
    end
    
    subgraph Upload
        upload[Upload to platform]
    end
    
    download --> input
    input --> unbundle
    unbundle --> src
    src --> edit
    edit --> sync
    sync --> build
    build --> output
    output --> upload
```

---

## Routing Logic

CSS rules are routed based on the `data-css-anchor` attribute in selectors:

| Selector Pattern | Destination |
|-----------------|-------------|
| `#customcss [data-css-anchor="header"]` | `src/by-css-anchor/header.css` |
| `#customcss [data-css-anchor="footer"] .link` | `src/by-css-anchor/footer.css` |
| `.global-class { ... }` (no anchor) | `src/common/global.css` |
| Multiple anchors in one rule | `src/common/global.css` |
| Unparseable CSS | `src/quarantine.css` |

### Examples

```css
/* → src/by-css-anchor/header.css */
#customcss [data-css-anchor="header"] {
  background: #fff;
}

/* → src/common/global.css (no anchor) */
body {
  margin: 0;
}

/* → src/common/global.css (multiple anchors) */
#customcss [data-css-anchor="header"],
#customcss [data-css-anchor="footer"] {
  padding: 20px;
}
```

---

## Commands Reference

| Command | Description |
|---------|-------------|
| `npm run build` | Build CSS bundle from source |
| `npm run dev` | Start Vite dev server |
| `npm run unbundle` | Extract CSS from `input/platform-bundle.css` |
| `npm run sync` | Check if main.css imports are in sync |
| `npm run sync -- --fix` | Auto-add missing imports to main.css |

---

## Backward Compatibility

This system is designed to work with:

- ✅ **Existing CSS** - Any valid CSS will be parsed and routed
- ✅ **Legacy bundles** - No special markers required
- ✅ **Manual edits** - Changes in the bundle are preserved during unbundle
- ✅ **New anchors** - Automatically creates new files for unknown anchors
