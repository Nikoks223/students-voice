# Средношколски Глас

React + Vite SPA, Firebase Firestore/Auth backend, deployed on Netlify.

## Known limitations

**File attachment scanning is not performed (MVP free-tier).** Uploaded PDF/DOC/DOCX files are validated for MIME type, file size (≤ 25 MB), and suspicious filename patterns before upload, but no server-side malware scanning runs against the content. Real scanning (e.g. via Cloudinary's malware detection add-on or a Cloud Function + VirusTotal) requires a paid plan and is deferred to Phase 3. Current mitigations: strict client-side MIME and filename validation, a click-through download confirmation modal that warns users to trust the source, an admin "remove attachment" action in the thread options menu, and the existing user reporting flow.

---

## Email digest setup

A weekly digest email is sent every Friday at 15:00 UTC (~16:00 Macedonia winter / 17:00 summer) via a Netlify scheduled function. It sends the top 5 trending threads from the past 7 days to opted-in users.

### Environment variables (set in Netlify → Site settings → Environment variables)

| Variable | Description |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | Firebase Admin SDK service account JSON, base64-encoded. Generate in Firebase Console → Project Settings → Service accounts → Generate new private key, then `base64 -i key.json`. |
| `RESEND_API_KEY` | API key from [resend.com](https://resend.com) dashboard. |
| `DIGEST_FROM_EMAIL` | Sender address. Use `onboarding@resend.dev` for sandbox, or `digest@srednoskolskiglas.mk` after domain verification. |
| `DIGEST_TEST_RECIPIENT` | Email address to receive all digests in sandbox mode. |
| `DIGEST_BASE_URL` | Base URL used in email links (e.g. `https://srednoskolskiglas.netlify.app`). |
| `DIGEST_TRIGGER_SECRET` | Random secret for the manual trigger endpoint. Generate with `openssl rand -hex 16`. |

### Schedule

- Cron: `0 15 * * 5` (every Friday at 15:00 UTC)
- Macedonia winter time (UTC+1): 16:00 · Summer (UTC+2): 17:00

### Manual trigger (for testing)

After deploy, call:

```
https://<your-site>.netlify.app/.netlify/functions/weekly-digest-trigger?secret=<DIGEST_TRIGGER_SECRET>
```

Returns `{ ok: true, sent: 1, threads: [...] }` on success.

### Switching from sandbox to verified domain

1. Verify your domain on Resend (add the DNS records they provide).
2. Update `DIGEST_FROM_EMAIL` to e.g. `digest@srednoskolskiglas.mk`.
3. In `netlify/functions/_lib/digest.mts`, replace the sandbox send block:
   - Remove the single `resend.emails.send({ to: TEST_RECIPIENT, ... })` call.
   - Query Firestore: `db.collection('users').where('emailDigestOptIn', '==', true).get()`
   - Paginate in batches (Resend free tier: 100 emails/day, 3 000/month).
   - Send to each user's email address.
   - Add a small delay between batches if you have >100 opted-in users.
4. Remove `DIGEST_TEST_RECIPIENT` from Netlify env (no longer needed).
5. Verify with the manual trigger endpoint.

### Security

The `FIREBASE_SERVICE_ACCOUNT_BASE64` value grants full admin access to your Firestore. Never log it, return it in a response, or commit it to git. The base64 string in Netlify env vars is the only place it should exist outside Firebase Console.
