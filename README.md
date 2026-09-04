# ZMCA Machinery & Services

A production-ready, zero-build website for ZMCA Machinery & Services. The frontend is responsive and accessible, while the backend uses Vercel Functions for equipment recommendations and validated inquiries.

## Included

- Spatial, responsive industrial interface
- Equipment-category browser
- Guided machine finder backed by `/api/recommend`
- Validated inquiry flow backed by `/api/contact`
- Messenger handoff with an inquiry reference
- Optional Resend email delivery or generic webhook delivery
- Honeypot, request-size limits, input sanitization, and best-effort rate limiting
- Security headers, structured data, sitemap, robots file, and web manifest
- Automated API and structural tests

## Local development

Requires Node.js 20 or newer.

```bash
npm run dev
```

Open `http://localhost:4173`.

## Validate

```bash
npm run check
```

## Inquiry delivery

The form always returns a prepared Facebook Messenger handoff. To also send inquiries automatically, configure either option in Vercel:

### Email through Resend

- `RESEND_API_KEY`
- `INQUIRY_TO_EMAIL`
- `INQUIRY_FROM_EMAIL` — optional; use a verified sender for production

### Generic webhook

- `INQUIRY_WEBHOOK_URL`
- `INQUIRY_WEBHOOK_SECRET` — optional bearer token

Do not commit secrets to the repository.

## Deploy

Import this repository into Vercel. No build command or output directory is required. Vercel serves the static frontend and deploys each file under `api/` as a function.
