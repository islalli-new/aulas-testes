---
name: daisyui
description: Use this skill whenever building or modifying UI components, pages, layouts, or styling in this project. DaisyUI is the chosen component library (built on top of TailwindCSS). Apply daisyUI semantic component classes (btn, card, modal, alert, navbar, drawer, etc.) and daisyUI themes instead of writing raw CSS, hand-rolling Tailwind utility soups, or pulling in other component libraries (Bootstrap, MUI, shadcn, Chakra, etc.). Triggers on requests mentioning UI, components, styling, forms, buttons, modals, layouts, themes, dark mode, or any frontend visual work.
---

# DaisyUI

This project uses **daisyUI** (https://daisyui.com) on top of TailwindCSS for all UI work.

## Rules

1. **Prefer daisyUI component classes over raw Tailwind utility chains.**
   - Good: `<button class="btn btn-primary">Salvar</button>`
   - Avoid: `<button class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">Salvar</button>`

2. **Don't introduce other component libraries.** No Bootstrap, MUI, Chakra, shadcn, Ant Design, etc. If a component is missing in daisyUI, compose it from existing daisyUI primitives + Tailwind utilities.

3. **Use daisyUI themes for colors.** Reference semantic tokens (`primary`, `secondary`, `accent`, `neutral`, `base-100`, `info`, `success`, `warning`, `error`) instead of hard-coded Tailwind palette colors (`bg-blue-500`, `text-gray-700`, etc.). This keeps theme switching working.

4. **Dark mode is theme-based.** Toggle via `data-theme="dark"` on `<html>` (or the configured theme name), not via Tailwind's `dark:` variants when a daisyUI equivalent exists.

5. **Common components to reach for first:**
   - Layout: `navbar`, `drawer`, `footer`, `hero`
   - Data display: `card`, `table`, `stat`, `badge`, `chat`
   - Inputs: `input`, `select`, `textarea`, `checkbox`, `radio`, `toggle`, `range`, `file-input`
   - Actions: `btn` (with modifiers like `btn-primary`, `btn-ghost`, `btn-outline`, `btn-sm`)
   - Feedback: `alert`, `toast`, `loading`, `progress`, `skeleton`
   - Overlays: `modal`, `dropdown`, `tooltip`, `collapse`

6. **Check setup before adding a component.** If `tailwind.config.js` / `tailwind.config.ts` doesn't list `daisyui` in `plugins`, add it before using classes — otherwise the styles won't apply.

7. **When uncertain about a class name or API**, consult https://daisyui.com/components/ rather than guessing — daisyUI's naming is consistent but specific.
