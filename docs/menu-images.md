# Menu images (Railway Object Storage)

Menu item thumbnails are stored in **Railway Object Storage** (S3-compatible). The API validates uploads, resizes to a small WebP thumbnail, uploads to the bucket, and persists the public URL in `menu_items.image_url`. The order-ahead app loads those URLs with lazy `img` tags.

## Architecture

```mermaid
flowchart LR
  AdminUpload["Admin picks image"] --> ApiUpload["API validates and resizes"]
  ApiUpload --> RailwayBucket["Railway Object Storage"]
  RailwayBucket --> PublicUrl["Public thumbnail URL"]
  PublicUrl --> MenuItem["menu_items.image_url"]
  MenuItem --> OrderAhead["Order-ahead lazy image cards"]
  TemplateSeed["Default template images"] --> RailwayBucket
```

## Railway setup

1. In your Railway project, create an **Object Storage** bucket (e.g. `moonshot-menu-images`).
2. Note the S3-compatible credentials (`railway bucket credentials --bucket <name> --json`).
3. Configure a **public base URL** for browser access (Railway bucket public URL or custom domain).
4. Set these variables on the **API service**:

| Variable | Description |
|----------|-------------|
| `MENU_IMAGE_BUCKET` | Bucket name |
| `MENU_IMAGE_ENDPOINT` | S3 endpoint URL |
| `MENU_IMAGE_REGION` | Region (`auto` is fine for Railway) |
| `MENU_IMAGE_ACCESS_KEY_ID` | Access key |
| `MENU_IMAGE_SECRET_ACCESS_KEY` | Secret key |
| `MENU_IMAGE_PUBLIC_BASE_URL` | Public CDN/base URL (no trailing slash) |

The order-ahead and admin frontends **do not** need bucket credentials.

## Object key layout

| Path | Purpose |
|------|---------|
| `template/drinks/{drink-key}.webp` | Canonical starter template thumbnails |
| `cafes/{cafeId}/menu-items/{itemId}/thumbnail.webp` | Per-café item uploads |

## Upload API

`POST /api/v1/menu/:itemId/image`

- Auth: admin JWT + `X-Cafe-Slug`
- Body: `multipart/form-data` with field `image`
- Accepts: JPEG, PNG, WebP (validated from file bytes)
- Max upload: 5MB
- Output: 360×240 WebP thumbnail, metadata stripped
- Response: updated `NormalisedMenuItem` with `imageUrl`

## Starter template defaults

On onboarding template save, each drink row gets `image_url` pointing at:

`{MENU_IMAGE_PUBLIC_BASE_URL}/template/drinks/{templateKey}.webp`

Sync default images to the bucket:

```bash
cd apps/moonshot-api
pnpm sync:menu-template-images
```

The script reads optional sources from `assets/menu-template/drinks/{key}.webp` or generates coloured placeholders, then uploads to Railway.

Run this once per environment after creating the bucket, and again when you add new template drink keys.

## Performance

- One thumbnail variant per item (card size ~360×240 WebP, quality ~80).
- Objects use `Cache-Control: public, max-age=31536000, immutable`.
- Deterministic keys mean replacing an image overwrites the same URL; switch to versioned keys if cache busting becomes necessary.
- Order-ahead uses `loading="lazy"` and `decoding="async"` except the first featured / item-detail hero image.

## Admin UI

Dashboard → Menu & pricing → expand an item → **Upload photo** / **Replace photo**. New items must be saved before a photo can be uploaded.

## Local development

Without `MENU_IMAGE_*` configured:

- Template onboarding sets `image_url` to `null`.
- Image upload returns `503` with a clear error.
- Order-ahead shows neutral placeholders.

For full local testing, create a dev bucket on Railway and point env vars at it.
