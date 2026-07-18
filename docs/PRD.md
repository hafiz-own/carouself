# PRD: carouself

## 1. Project Overview

**What it is:** carouself is an open-source, end-to-end encrypted web journaling app with a best-in-class rich-text writing experience.

**Who it's for:** Privacy-conscious individuals who journal regularly and want to verify — not be told — that no one else can read their entries.

**Problem it solves:** Existing journaling apps force a trade-off between a genuinely good editor and real privacy guarantees, or hide privacy claims behind closed-source servers and feature paywalls. carouself removes that trade-off.

**What it is NOT:**
- Not a native mobile app (web-responsive only for v1)
- Not a collaborative or social journaling tool (no sharing, comments, or public entries)
- Not an AI-powered journaling assistant (no prompts, summarization, or sentiment analysis)
- Not a general-purpose note-taking or task-management tool

---

## 2. User Personas

**The Habitual Journaler** — Writes daily or near-daily. Has bounced between Penzu, Monkee, and physical notebooks. Currently frustrated by clunky editors, features locked behind paywalls, and vague trust in whether a company can actually read their entries. Success looks like: journaling becomes a daily habit again because opening the app is fast, frictionless, and something they don't have to think twice about trusting.

**The Security-Conscious Developer** — Technically literate, currently avoids journaling apps entirely because closed-source encryption claims can't be verified. Would self-host if given the option. Success looks like: being able to read the encryption implementation themselves and trust it on that basis, not on a vendor's word.

---

## 3. User Stories & Acceptance Criteria (organized by build milestone)

Each milestone below is a self-contained, independently verifiable unit. Build and verify them in order — see Section 9 for the enforced build sequence.

### Milestone 0 — Project Scaffolding & Deployment Pipeline

**Story:** As the developer, I want the project scaffolded and deployed end-to-end before any feature work begins, so every subsequent milestone builds on a working foundation.
**Acceptance Criteria:**
- [ ] Next.js (App Router) project initialized with TypeScript, Tailwind CSS, and the folder structure defined in Section 5
- [ ] Drizzle ORM connects successfully to a Neon Postgres instance using `DATABASE_URL` from environment variables
- [ ] Project deploys to Vercel and a placeholder page is reachable at the deployed URL
- [ ] A trivial database round-trip (insert one row, read it back) succeeds against the deployed Neon instance
- [ ] tRPC is wired up with at least one working query endpoint callable from the frontend

### Milestone 1 — Encryption Core (isolated, no UI)

**Story:** As the developer, I want the client-side encryption core built and unit-tested in isolation, so every later feature can rely on correct, verified crypto behavior.
**Acceptance Criteria:**
- [ ] libsodium.js is integrated; Argon2id key derivation produces deterministic output for a given password + salt
- [ ] Two distinct keys (auth key, encryption key) are derivable from one master password using separate KDF contexts, and are verified to differ from each other
- [ ] XChaCha20-Poly1305 encrypt→decrypt round-trip returns the original plaintext for a sample entry
- [ ] Decryption with an incorrect key fails explicitly (throws/rejects) rather than returning corrupted plaintext
- [ ] All of the above are covered by automated unit tests that pass locally/in CI, with no UI involved

### Milestone 2 — Account Creation & Recovery Key

**Story:** As a new user, I want to create an account protected by a master password so that only I can ever decrypt my journal.
**Acceptance Criteria:**
- [ ] Signup requires email + master password (minimum 12 characters)
- [ ] The master password is never transmitted to or stored on the server in plaintext or reversible form
- [ ] The client derives the auth key and encryption key per Milestone 1's logic; only the auth key is sent to the server
- [ ] A one-time recovery key is generated and displayed exactly once at signup, with an explicit "save this now — it cannot be recovered later" warning
- [ ] Account creation completes and lands the user on an empty journal view in under 3 seconds on a typical broadband connection

### Milestone 3 — Login & Session

**Story:** As a returning user, I want to log in and unlock my journal so that I can read and write entries.
**Acceptance Criteria:**
- [ ] Login accepts email + master password, verified via the auth key (server never sees the encryption key)
- [ ] Failed login attempts are rate-limited to 5 per minute per IP
- [ ] Successful login issues a JWT in an httpOnly cookie; session persists 7 days by default
- [ ] Incorrect credentials show a single generic "invalid credentials" error (no user enumeration via distinct messages)

### Milestone 4 — Entry Writing & Autosave

**Story:** As a logged-in user, I want to write a new journal entry with a rich-text editor so that I can express myself with formatting, not just plain text.
**Acceptance Criteria:**
- [ ] Editor supports bold, italic, headings, bulleted/numbered lists, and blockquotes at minimum
- [ ] Entry content is encrypted client-side (using Milestone 1's core) before any network request that persists it
- [ ] The entry autosaves within 2 seconds of the user pausing typing, with no full page reload
- [ ] An autosave failure (e.g. network drop) shows a visible "not saved" indicator until it succeeds
- [ ] A new entry can be created, written, and successfully autosaved in under 10 seconds end-to-end on first use

### Milestone 5 — Entry Browsing (Calendar & List)

**Story:** As a user, I want to browse past entries via a calendar or list view so that I can find and revisit what I wrote before.
**Acceptance Criteria:**
- [ ] Entries are browsable in both a calendar view (by date) and a chronological list view, toggleable by the user
- [ ] Selecting a date or list item decrypts and displays that entry in under 1 second
- [ ] Dates with an entry are visually distinguishable from empty dates in the calendar view
- [ ] The list view supports pagination or infinite scroll for accounts with 500+ entries without any single load exceeding 2 seconds

### Milestone 6 — Search

**Story:** As a user, I want to search across my past entries so that I can find something I wrote without remembering the exact date.
**Acceptance Criteria:**
- [ ] Search executes client-side, after entries are decrypted in-browser — no plaintext query or content is ever sent to the server
- [ ] Search matches on entry content with partial-word matching
- [ ] Results display the matching entry's date and a short surrounding-text snippet
- [ ] Search returns results within 500ms for an account with up to 2,000 entries

### Milestone 7 — Backend Observability

**Story:** As the operator, I want visibility into backend logs and error events so that I can confirm the system behaves correctly and catch bugs.
**Acceptance Criteria:**
- [ ] All API errors return a JSON body shaped as `{ error: string, code: string }`
- [ ] 500-level errors are logged with full request context (endpoint, timestamp, user ID) — never entry content or encryption keys
- [ ] Backend function logs are viewable via the Vercel dashboard for every deployed environment
- [ ] No plaintext journal content or encryption keys appear in logs under any error condition, verified by manual review before launch

### Milestone 8 — UI Polish & Accessibility Pass

**Story:** As a user, I want the interface to be visually polished and accessible so the app feels trustworthy and is usable by everyone.
**Acceptance Criteria:**
- [ ] All interactive elements have visible focus states and meet WCAG 2.1 AA contrast ratio (4.5:1 minimum)
- [ ] Layout is verified at all three defined breakpoints (mobile <640px, tablet 640–1024px, desktop >1024px) with no overlapping or clipped elements
- [ ] Every acceptance criterion in Milestones 0–7 has been re-verified end-to-end in the deployed environment
- [ ] No console errors or warnings appear during normal use of core flows (signup, login, write, browse, search)

---

## 4. Technical Constraints

**Language / Runtime:** TypeScript, Node.js 22 LTS
**Framework:** Next.js (App Router), latest stable at project start — exact version TBD
**Database:** PostgreSQL via Neon (free tier)
**Auth:** Custom — JWT in httpOnly cookie, issued after client-derived auth-key verification (not standard password auth); no third-party OAuth for MVP
**Key third-party integrations:**
  - libsodium.js — client-side encryption (Argon2id KDF, XChaCha20-Poly1305 AEAD)
  - Drizzle ORM — Postgres access
  - tRPC — type-safe API layer
**Environment variables needed:** `DATABASE_URL`, `JWT_SECRET` (additional vars TBD during TechDesign)
**Deployment target:** Vercel (Hobby/free tier initially — note: Hobby ToS is non-commercial only; revisit before any monetization)

**Frontend specifics:**
- CSS approach: Tailwind CSS
- Component library: none — TipTap is headless, UI built custom on top of it
- Responsive breakpoints: mobile (<640px), tablet (640–1024px), desktop (>1024px); responsive web only, no native app

**Backend specifics:**
- API style: tRPC
- Rate limiting: login endpoint limited to 5 attempts/minute/IP; general API rate limiting TBD
- Expected request volume: low — personal-scale MVP, order of magnitude <10k requests/day

---

## 5. Folder / File Structure

```
carouself/
├── src/
│   ├── app/                 # Next.js App Router routes
│   ├── components/          # Editor, calendar, entry list, UI primitives
│   ├── lib/
│   │   ├── crypto/           # libsodium wrappers, key derivation
│   │   ├── db/                # Drizzle schema + client
│   │   └── trpc/              # tRPC routers
│   └── styles/
├── tests/
├── docs/
│   ├── PRD.md
│   └── TechDesign.md
├── drizzle/                  # migrations
├── .env.example
├── package.json
└── README.md
```

---

## 6. Non-Goals

- No AI features (prompts, summarization, sentiment analysis) — not part of the core value proposition
- No native mobile app — web-responsive only for v1, deferred to v2
- No offline/PWA support — requires an online connection for v1, deferred to v2
- No reminders or notifications — deferred to v2
- No social or sharing features — journaling stays private by design, not planned
- No image/file attachments — text-only for MVP, deferred to v1.1 pending storage-provider decision
- No paid tier — fully free and open source at launch; monetization model deferred
- No admin panel — account management via direct database access for now; revisit once user volume makes that impractical

---

## 7. Acceptance Criteria Summary

- [ ] Next.js/TypeScript/Tailwind project scaffolded per Section 5 structure
- [ ] Drizzle connects to Neon via `DATABASE_URL`; DB round-trip succeeds
- [ ] Project deploys to Vercel with a reachable placeholder page
- [ ] tRPC wired with at least one working endpoint
- [ ] Argon2id key derivation deterministic for password + salt
- [ ] Auth key and encryption key derived separately and verified distinct
- [ ] XChaCha20-Poly1305 encrypt→decrypt round-trip verified
- [ ] Decryption with wrong key fails explicitly
- [ ] Crypto core covered by passing automated unit tests
- [ ] Signup requires email + master password (min 12 characters)
- [ ] Master password never transmitted or stored in plaintext/reversible form
- [ ] One-time recovery key shown at signup with explicit non-recoverable warning
- [ ] Account creation completes in under 3 seconds
- [ ] Login verified via auth key only; encryption key never sent to server
- [ ] Login rate-limited to 5 attempts/minute/IP
- [ ] JWT session in httpOnly cookie, 7-day default expiry
- [ ] Generic invalid-credentials error, no user enumeration
- [ ] Editor supports bold, italic, headings, lists, blockquotes
- [ ] Entry content encrypted client-side before persistence
- [ ] Autosave within 2 seconds of typing pause, no full reload
- [ ] Visible "not saved" indicator on autosave failure
- [ ] New entry created and autosaved in under 10 seconds end-to-end
- [ ] Calendar and list views both available and toggleable
- [ ] Entry opens (decrypted) in under 1 second
- [ ] Calendar visually distinguishes dates with entries
- [ ] List view paginates/infinite-scrolls without exceeding 2 second loads at 500+ entries
- [ ] Search runs client-side post-decryption; no content/query sent to server
- [ ] Search supports partial-word matching
- [ ] Search results show date + snippet
- [ ] Search returns within 500ms at up to 2,000 entries
- [ ] API errors return `{ error, code }` JSON shape
- [ ] 500-level errors logged with full context, no sensitive data
- [ ] Backend logs viewable via Vercel dashboard
- [ ] No plaintext content or keys in logs, verified before launch
- [ ] Focus states and WCAG 2.1 AA contrast (4.5:1) verified across the app
- [ ] Layout verified at mobile/tablet/desktop breakpoints, no clipping/overlap
- [ ] All Milestone 0–7 criteria re-verified end-to-end before launch
- [ ] No console errors/warnings during core flows

---

## 8. Open Questions

- [ ] Exact Next.js version to pin at project start
- [ ] Full list of environment variables beyond `DATABASE_URL` and `JWT_SECRET`
- [ ] General API rate-limiting policy beyond the login endpoint
- [ ] Storage provider for attachments in v1.1 (Vercel Blob vs Cloudflare R2) — not needed for MVP, worth deciding before v1.1 starts

**Resolved:**
- Session length: confirmed at 7 days
- Personas: both share the same flow/features — no persona-specific UI or feature differences needed
- Admin panel: excluded from MVP — see Non-Goals

---

## 9. Build Order & Milestone Timeline

Build and verify strictly in this order. **Do not begin the next milestone until every acceptance criterion in the current one is checked off and manually verified.** This sequence is dependency-driven, not arbitrary — entries can't be correctly encrypted or attributed to a user until both the crypto core and auth exist, so nothing downstream of those should be started early.

| Order | Milestone | Depends on | Gate |
|---|---|---|---|
| 1 | M0 — Project Scaffolding & Deployment Pipeline | — | STOP. Verify all M0 criteria before proceeding. |
| 2 | M1 — Encryption Core (isolated, unit-tested) | M0 | STOP. Verify all M1 criteria before proceeding. |
| 3 | M2 — Account Creation & Recovery Key | M0, M1 | STOP. Verify all M2 criteria before proceeding. |
| 4 | M3 — Login & Session | M2 | STOP. Verify all M3 criteria before proceeding. |
| 5 | M4 — Entry Writing & Autosave | M1, M3 | STOP. Verify all M4 criteria before proceeding. |
| 6 | M5 — Entry Browsing (Calendar & List) | M4 | STOP. Verify all M5 criteria before proceeding. |
| 7 | M6 — Search | M5 | STOP. Verify all M6 criteria before proceeding. |
| 8 | M7 — Backend Observability | M0–M6 (layered across existing endpoints) | STOP. Verify all M7 criteria before proceeding. |
| 9 | M8 — UI Polish & Accessibility Pass | M0–M7 (all functionally complete) | LAUNCH-READY once verified. |

**Instruction for the coding agent (Antigravity / Claude Code):** implement exactly one milestone at a time. After finishing a milestone's implementation, stop, run/check its acceptance criteria list from Section 3, and wait for explicit confirmation that it passed before starting the next milestone. Do not parallelize milestones or begin implementation work on a later milestone while an earlier one has unchecked criteria.
