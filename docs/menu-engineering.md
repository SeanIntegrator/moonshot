# Menu Engineering & UK Price Benchmark Tool

This document records the architecture, boundaries, and design decisions for the **Menu Engineering & Price Benchmark Audit** prototype mounted at the bottom of `@moonshot/marketing` (`#menu-audit`) and served by `@moonshot/api` (`/api/v1/menu-engineering/*`).

## 1. Architecture & Data Flow

```mermaid
flowchart LR
  subgraph Client["@moonshot/marketing (Browser)"]
    Upload["Step 1: Photo / PDF / Sample"]
    Canvas["Client Normaliser\n(pdfjs-dist <canvas>, heic2any,\nmax 1800px JPEG @ 0.86)"]
    Confirm["Step 2: Editable Confirmation Table\n(Never skipped)"]
    Report["Step 3: Report + 4 Charts\n+ Daily Customers Slider"]
  end

  subgraph API["@moonshot/api (Stateless Express Routes)"]
    Guard["Rate Limiter + Optional Turnstile\n+ Magic-Byte & Sharp Check"]
    Adapter["MenuEngineeringLlmAdapter\n(Gemini 2.5 Flash or Swap)"]
    Engine["Deterministic Rules Engine\n(@moonshot/domain)"]
  end

  Upload -->|Files| Canvas
  Canvas -->|POST /extract| Guard
  Guard -->|In-memory JPEG buffers| Adapter
  Adapter -->|ExtractedMenuPayload| Confirm
  Upload -->|GET /sample| Confirm
  Confirm -->|POST /analyse| Engine
  Engine -->|MenuEngineeringFindings JSON| Adapter
  Adapter -->|MenuEngineeringNarrative| Report
  Engine -->|Findings + Entitlements| Report
```

## 2. Strict Boundary & Separation of Concerns

1. **Isolated from POS / Order-Ahead / KDS tables**:
   - All shared contracts live in `packages/types/src/menu-engineering.ts`.
   - All canonical items, UK regional benchmarks, and deterministic rules live in `packages/domain/src/menu-engineering/`.
   - Nothing reads or writes the operational `menu_items`, `orders`, or `cafes` PostgreSQL tables.
2. **Stateless Free Tier (Zero Image Persistence)**:
   - Uploaded menu photos and rendered PDF pages are held strictly in memory (`multer.memoryStorage()`), validated via magic bytes (`file-type`) and `sharp`, passed to the vision adapter, and immediately garbage-collected.
3. **Single Free vs. Paid Entitlement Switch**:
   - `resolveMenuEngineeringEntitlements(tier)` in `packages/domain/src/menu-engineering/entitlements.ts` is the sole switch controlling free-tier capabilities (`canExtractAndAuditPricing: true`) vs. paid-tier Menu Studio capabilities (`canRestructureMenuLayout`, `canRewriteMenuCopy`, `canExportPrintTemplates`, `canSaveAndHostQrMenu`).

## 3. Why Deterministic Rules + Constrained LLM Narration?

- **Vision extraction (`extractMenuFromImages`)**: Multimodal models read skewed chalkboard photos and multi-column layouts into a strict JSON schema (`responseSchema`). Canonical ids stay in the prompt, not the schema: repeating the ~47-value `CANONICAL_ITEM_IDS` enum on every item and modifier makes Gemini reject the request with HTTP 400. `normaliseRawModelExtraction` repairs unknown ids. Provider failures are returned as `ApiHttpError` (sanitised message, provider status, model name) instead of the generic "Internal error" envelope.
- **Confirmation step (`MenuConfirmTable`)**: Always shown before running analysis so the café owner can fix OCR quirks, section names, or canonical mappings.
- **Deterministic math (`analyseMenuAgainstBenchmarks`)**: Every price band comparison (`below_range`, `in_range_low`, `optimal`, `in_range_high`, `above_range`), ladder check (coffee size spread, tight brunch clustering within £2, missing premium brunch anchor, syrup pricing vs 60p–95p benchmark, missing brunch add-on box, overloaded sections >= 9 items), category gross margin estimate, and monthly pound uplift is computed deterministically in TypeScript.
- **Zero-hallucination narration (`narrateFindings`)**: The LLM (or deterministic fallback when `GEMINI_API_KEY` is not set) only turns the structured `MenuEngineeringFindings` JSON into owner-friendly prose. Both the prose report and the 4 visual charts read from the exact same `findings` payload, guaranteeing they never disagree.

## 4. Swapping Vision / Narration Models

`apps/moonshot-api/src/lib/menu-engineering/llm-adapter.ts` defines the provider-agnostic `MenuEngineeringLlmAdapter` interface:

- `extractMenuFromImages(images: MenuImageInput[]): Promise<ExtractedMenuPayload>`
- `narrateFindings(findings: MenuEngineeringFindings): Promise<MenuEngineeringNarrative>`

`GeminiMenuEngineeringAdapter` (`gemini-adapter.ts`) implements this contract using `@google/genai`. `resolveMenuEngineeringLlmAdapter()` builds a cascade of up to three models that share `GEMINI_API_KEY`: `GEMINI_MODEL` first (default `gemini-3.8-flash`), then `GEMINI_MODEL_FALLBACKS` (default `gemini-3.6-flash`, `gemini-3.5-flash-lite`). A retryable failure — overload, unknown model, empty read — tries the next model. An auth failure stops the chain. Another provider is another `MenuEngineeringLlmAdapter` appended in that resolver once its API key is set.

## 5. Production API origin

The marketing SPA calls the API from the visitor's browser. `GEMINI_API_KEY` lives only on `moonshot-api`. The browser needs `VITE_API_URL` on `moonshot-marketing`, written to `/runtime-config.js` by `scripts/write-runtime-config.mjs` during `postbuild` and again on `pnpm start` / `pnpm preview`.

Use the API origin only (`https://moonshotapi-production.up.railway.app`). Do not fall back to `http://localhost:3000` in the bundle — a phone then requests its own loopback and the UI shows "Failed to fetch". `CORS_ORIGINS` on the API must include the marketing origin (`https://moonshotmarketing-production.up.railway.app`).
