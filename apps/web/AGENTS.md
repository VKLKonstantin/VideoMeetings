<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## UI changes must be visually verified before considered done

Any change that affects UI (new component, layout/style tweak, form, etc.) is not complete until you've:

1. Run the app and visually checked the change in a real browser (not just type-checked/linted) — golden path and relevant edge cases (error states, empty states, etc). The dev server (`yarn dev` / `yarn dev:web`) is usually already running — check for it (e.g. `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000`, or check for a `next dev` process) before starting a new one, to avoid port conflicts or duplicate processes.
2. Run it through the `ui-ux-pro-max` skill (`.agents/skills/ui-ux-pro-max`) and addressed what it flags — check against the relevant domains (`ux` for accessibility/forms/interaction, plus `--stack nextjs` guidance) and against the actual behavior of the components used (e.g. read HeroUI source/docs via the `heroui-react` skill rather than assuming), not just the checklist in the abstract.

Don't report a UI task as finished on type-check/lint passing alone.
