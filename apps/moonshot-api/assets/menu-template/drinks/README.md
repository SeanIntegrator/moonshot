# Template drink photos

These files feed the **canonical** template set (`template/drinks/*` in Railway).
Only superadmin/ops should update them via `pnpm sync:menu-template-images`.

On café onboarding, each drink **copies** the matching template into that café’s
own storage. Café admins replace only their copy — never these masters.

Drop real photos here before running sync.

Accepted filenames (prefer `.webp`, else `.jpg` / `.jpeg` / `.png`):

- espresso
- americano
- cortado
- flat-white
- latte
- cappuccino
- mocha
- hot-chocolate
- breakfast-tea
- chai-latte
- matcha-latte
- babycino
- iced-latte
- iced-americano
- iced-chocolate
- iced-mocha
- iced-matcha-latte

Example: `flat-white.jpg`

Missing files get a coloured placeholder generated and uploaded. Photos are not picked up on deploy — sync is manual. See `docs/menu-images.md`.
