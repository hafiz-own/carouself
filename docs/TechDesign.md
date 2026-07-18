# TechDesign: carouself

## 1. Architecture Overview
`carouself` is an end-to-end encrypted journaling application built with Next.js (App Router), leveraging serverless technologies for deployment (Vercel) and database management (Neon PostgreSQL).

**Core Stack:**
- **Frontend/Framework:** Next.js (App Router), TypeScript, React, Tailwind CSS
- **API Layer:** tRPC (provides end-to-end type safety between frontend and backend)
- **Database:** PostgreSQL (Neon serverless) with Drizzle ORM
- **Cryptography:** `libsodium-wrappers` (WebAssembly-based libsodium implementation for the browser)
- **Editor:** TipTap (Headless, heavily customized)

The application relies heavily on client-side processing for security. All encryption and decryption happen strictly in the browser. The server only sees ciphertext and an authentication key (which is distinct from the encryption key).

## 2. Cryptography Design

### 2.1 Key Derivation
To ensure the server cannot decrypt entries, two distinct keys are generated from the user's master password using Argon2id (via libsodium):
1.  **Authentication Key (Auth Key):** Used by the server to verify login credentials.
2.  **Encryption Key (Enc Key):** Never leaves the client. Used to encrypt/decrypt journal entries.

**Process:**
- User inputs `email` and `master_password`.
- A random `salt` is generated on signup (and retrieved during login based on email).
- Argon2id is run with `master_password` + `salt`.
- To generate distinct keys, we use libsodium's `crypto_kdf_derive_from_key`:
    - `Context "auth____"` -> generates `Auth Key`
    - `Context "enc_____"` -> generates `Enc Key`
- Only the `Auth Key` is sent to the server as a hash during signup, and verified during login.

### 2.2 Encryption/Decryption
Encryption uses the XChaCha20-Poly1305 Authenticated Encryption with Associated Data (AEAD) algorithm.
- **Plaintext:** The JSON/HTML output from TipTap.
- **Nonce:** A randomly generated 24-byte nonce for every single entry update.
- **Ciphertext:** Stored in the database along with the plaintext nonce.

The server only receives and stores the resulting ciphertext and nonce.

## 3. Database Schema (Drizzle ORM)

### `users` table
- `id`: UUID (Primary Key)
- `email`: Varchar (Unique, Indexed)
- `auth_key_hash`: Varchar (Hashed Auth Key for verification)
- `salt`: Varchar (Random salt used for client-side Argon2id)
- `recovery_key_hash`: Varchar (Hashed recovery key)
- `created_at`: Timestamp

### `entries` table
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key to users)
- `ciphertext`: Text (Encrypted content of the journal entry)
- `nonce`: Varchar (Random nonce used for encryption)
- `date`: Date (The logical date of the entry for calendar grouping)
- `created_at`: Timestamp
- `updated_at`: Timestamp

## 4. Authentication Flow

**Signup:**
1. Client generates `salt`, runs Argon2id on `password` + `salt` to get `master_key`.
2. Client derives `auth_key` and `enc_key` from `master_key`.
3. Client generates a random `recovery_key` and hashes it.
4. Client sends `email`, `auth_key` (to be hashed by server), `salt`, and `recovery_key_hash` to the server.
5. Server stores the user and sets a session cookie (JWT).

**Login:**
1. Client sends `email` to server to fetch the user's `salt`.
2. Client runs Argon2id on `password` + `salt` to get `master_key`.
3. Client derives `auth_key` and `enc_key`.
4. Client sends `email` and `auth_key` to server.
5. Server verifies `auth_key` against `auth_key_hash`. If successful, sets session cookie (JWT).

**Session Management:**
JWT is stored in an `httpOnly`, `Secure`, `SameSite=Strict` cookie, valid for 7 days. It contains the user's `id`.

## 5. API Layer (tRPC)

tRPC routers are broken into domains:
- `authRouter`: Signup, login, logout, getSalt.
- `entryRouter`: Create, read (list/calendar), update, delete entries.

All protected endpoints utilize a tRPC middleware that checks for the presence and validity of the JWT in the cookies and injects the `user_id` into the request context.

## 6. Editor Implementation (TipTap)

The editor uses TipTap, a headless wrapper around ProseMirror.
- Extensions: StarterKit (bold, italic, headings, lists, blockquotes).
- State: Maintained in React state.
- Autosave: Implemented via a debounced hook (e.g., 2000ms after last keystroke).
- Saving mechanism:
    1. TipTap generates HTML or JSON content.
    2. Client-side cryptography module encrypts the content using the `enc_key` currently held in memory.
    3. tRPC mutation sends the `ciphertext` and `nonce` to the server.

## 7. Search & Performance

Because data is end-to-end encrypted, search **must** run entirely on the client.
- The client fetches all entries (paginated or complete depending on volume) on demand.
- Entries are decrypted in memory.
- A simple client-side search (e.g., using a library like `fuse.js` or basic String includes/Regex) filters the decrypted entries.
- To maintain performance (<500ms for 2000 entries), only necessary metadata (date, id, snippet) will be kept in the search index once decrypted.

## 8. Error Handling & Observability

- All tRPC errors are structured automatically. Custom `TRPCError` instances will be thrown.
- Sensitive information (`auth_key`, `ciphertext`, passwords) will NEVER be logged.
- The `crypto` module will be strictly unit tested in isolation to verify correct behavior before any UI integration.
