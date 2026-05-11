---
applyTo: "46f33a5e43ab-aothf/**"
---

# AoTech Frontend Instructions (Current State)

Use this file as the source of truth for HTML updates in `46f33a5e43ab-aothf`.

## 1. Current Page Map

This folder currently has two page families. Follow the matching layout family when creating or editing pages.

1. `index.html`
   - Standalone Microsoft-style account picker page.
   - Does not use the AoTech app header/nav shell.
2. `dashboard.html`, `assets01.html`, `assets02.html`, `assets03.html`
   - AoTech app pages using shared top bar + primary nav shell.

## 2. Global Head Requirements (All Pages)

Every HTML page in this folder must include:

1. `<!DOCTYPE html>` and `lang="en"`.
2. `<meta charset="UTF-8" />`.
3. `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`.
4. `<meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />`.

## 3. Shared AoTech App Shell (Dashboard + Assets Pages)

For app pages (`dashboard.html`, `assets01.html`, `assets02.html`, `assets03.html`), keep this structure and routing behavior:

1. Sticky header with:
   - `.top-bar`
   - `.main-nav`
2. Brand and utility links:
   - Brand link text: `AoTech`
   - Brand link target: `dashboard.html`
   - Profile icon is an anchor to `index.html` (not a button)
3. Primary nav links and order:
   - `users01.html`
   - `reports01.html`
   - `contractor01.html`
   - `calendar01.html`
   - `assets01.html`
   - `sites01.html`
4. Main content container:
   - `<main class="page-content" id="page-content">...</main>`

## 4. Design Tokens and Typography

Use the existing token system and font import used in current app pages.

```css
@import url("https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700&family=Sora:wght@600;700&display=swap");

:root {
  --font-display: "Sora", "Segoe UI", sans-serif;
  --font-body: "Public Sans", "Segoe UI", sans-serif;

  --color-nav-top: #2a3f56;
  --color-nav-main: #334d69;
  --color-nav-active: #3f5f80;
  --color-nav-hover: #3a5878;

  --color-page-bg: #f3f5f8;
  --color-surface: #ffffff;
  --color-border: #d7e0ea;

  --color-text-strong: #10233a;
  --color-text-body: #26394f;
  --color-text-muted: #5f7185;
  --color-text-on-dark: #f7fbff;

  --color-focus: #5b8cc2;
  --shadow-soft: 0 1px 2px rgba(10, 24, 40, 0.08), 0 6px 16px rgba(17, 36, 56, 0.04);

  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --radius-sm: 6px;
  --radius-md: 10px;
}
```

Notes:

1. `assets01.html` additionally uses `--color-surface-muted`, status colors (`--color-success`, `--color-warning`, `--color-danger`), and `--space-1`.
2. `assets02.html` and `assets03.html` also include `--color-surface-muted` and `--space-1`.
3. Keep display typography on page titles and key metric numbers (`var(--font-display)`), body UI in `var(--font-body)`.

## 5. Page-Specific Patterns

### 5.1 index.html (Sign-in Picker)

1. Uses `.app-shell` centered card layout with decorative radial background shapes.
2. Contains Microsoft-style brand block, account list, and account link to `dashboard.html`.
3. Keep compact Segoe-based typography and subtle gray palette as currently implemented.

### 5.2 dashboard.html (Home)

1. Uses full AoTech app shell.
2. Main container is currently empty (`<main class="page-content" id="page-content"></main>`).
3. If content is added, keep existing shell and token system unchanged.

### 5.3 assets01.html (Asset Register)

1. Header/nav shell with `Assets` nav item active.
2. Toolbar with title/subtitle and `+ Create Asset` action linking to `assets02.html`.
3. Stats cards, table card, and pagination footer.
4. Row links in the register table route to `assets03.html`.

### 5.4 assets02.html (Create Asset)

1. Header/nav shell with `Assets` nav item active.
2. Two-column form card: `Asset Details` and `Cost and Limits`.
3. Actions:
   - `Cancel` links to `assets01.html`
   - `Create Asset` links to `assets01.html`

### 5.5 assets03.html (Edit Asset)

1. Same form layout and shell conventions as `assets02.html`.
2. Includes read-only fields (`qr-code`, `date-purchased`) and a captured photo section (`.captured-photo`).
3. Actions:
   - `Cancel` links to `assets01.html`
   - `Save Changes` links to `assets01.html`

## 6. Interaction and Accessibility Baseline

1. Keep visible focus states using `:focus-visible` and `--color-focus`.
2. Keep icon-only controls labeled (`aria-label`).
3. Preserve semantic landmarks (`header`, `nav`, `main`, and labeled sections/forms).
4. Keep responsive rules at `max-width: 768px` for top bar and page content padding.

## 7. Guardrails for New Edits

1. Do not change existing route targets unless explicitly requested.
2. Do not remove the robots meta directive.
3. Do not swap the app font stack away from Sora/Public Sans on AoTech app pages.
4. Keep the shared AoTech shell structure consistent across dashboard and assets pages.
