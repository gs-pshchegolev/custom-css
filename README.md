# Custom CSS Build System

A round-trip CSS build system for managing platform styles. Supports both **development** (building from source) and **reverse-engineering** (extracting from bundled CSS).

## Quick Start

```bash
npm install
npm run build      # Build CSS bundle from source
npm run unbundle   # Extract CSS from community bundle
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
        community[platform-bundle.css<br/>with file markers]
    end
    
    subgraph process[Processing]
        unbundle[npm run unbundle]
        parse{Parse by<br/>file markers}
    end
    
    subgraph src[Source Files]
        global[common/global.css]
        widgets[by-css-anchor/*.css]
    end
    
    community --> unbundle
    unbundle --> parse
    parse --> global
    parse --> widgets
```

**Commands:**
```bash
# 1. Place bundle in input folder
cp ~/Downloads/community-styles.css input/platform-bundle.css

# 2. Run unbundle
npm run unbundle
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
    edit --> build
    build --> output
    output --> upload
```

---

## Routing Logic

The bundle uses `/* @file: path */` markers to track file boundaries. When unbundling:

| Marker | Destination |
|--------|-------------|
| `/* @file: src/common/global.css */` | `src/common/global.css` |
| `/* @file: src/by-css-anchor/header.css */` | `src/by-css-anchor/header.css` |

Markers are automatically injected during `npm run build` based on `main.css` imports.

### Example Bundle Output

```css
/* @file: src/common/global.css */
body {
  margin: 0;
}

/* @file: src/by-css-anchor/header.css */
#customcss [data-css-anchor="header"] {
  background: #fff;
}
```

---

## Commands Reference

| Command | Description |
|---------|-------------|
| `npm run build` | Build CSS bundle from source |
| `npm run dev` | Start Vite dev server with HMR |
| `npm run unbundle` | Extract CSS from `input/platform-bundle.css` |

---

## Backward Compatibility

This system requires bundles built with this tool (containing `/* @file: */` markers).

- ✅ **Round-trip safe** - Build and unbundle preserve file structure
- ✅ **Manual edits** - Edit source files, rebuild to update bundle
- ✅ **New files** - Add new CSS files, import in main.css
