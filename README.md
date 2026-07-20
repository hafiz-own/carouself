# carouself

carouself is a premium, zero-knowledge, end-to-end encrypted digital journaling application. Designed for developers and privacy advocates, it combines a distraction-free "hacker-chic" aesthetic with uncompromising security guarantees. Your private entries remain mathematically inaccessible to everyone but you.

## Features

- **Zero-Knowledge Architecture**: The server infrastructure is treated as entirely untrusted. All encryption and decryption processes occur strictly on the client side using the industry-standard Libsodium library.
- **Distraction-Free Interface**: A minimalist, typography-driven UI utilizing Geist and Geist Mono. Features seamless dark/light modes, dynamic micro-animations, and an intuitive sidebar.
- **Journal Dashboard**: Track your writing habit with statistics like Total Words, Entry Count, and Current Streak, alongside an interactive memory carousel of your recent entries.
- **Rich Text Editing**: A robust, markdown-compatible rich text editor powered by Tiptap, engineered to safely encrypt HTML output before it ever leaves your device.
- **Inline Emojis**: A lightning-fast, Slack-style inline emoji picker natively integrated into the editor. Type `:` to instantly express yourself without touching the mouse.

## Architecture & Security Implementation

- **Key Derivation**: Upon authentication, the client utilizes a WebWorker running Argon2id to derive two distinct cryptographic keys from your Master Password. The first is an authentication hash. The second is an encryption key retained solely in the client's volatile memory.
- **Data Encryption**: Entries and metadata are serialized and encrypted using the XChaCha20-Poly1305 authenticated encryption algorithm. 
- **Ciphertext Storage**: The server receives and stores only the resulting ciphertext and cryptographic nonce. It never sees the plaintext or the encryption key.

### Application Stack
- **Framework**: Next.js 14 (App Router)
- **RPC Layer**: tRPC for strongly-typed client/server communication
- **Database ORM**: Drizzle ORM
- **Styling**: Tailwind CSS & Framer Motion

---

## Self-Hosting Guide

carouself is entirely open-source and designed to be easily self-hosted. By self-hosting, you retain absolute physical and cryptographic control over your data environment.

### Prerequisites
- Node.js (Version 18 or higher)
- npm, yarn, or pnpm
- A PostgreSQL database (e.g., local Postgres, Neon, Supabase)
- A Web3Forms Access Key (Optional, for contact form functionality on the landing page)

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/hafiz-own/carouself.git
   cd carouself
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   ```
   Open the `.env` file and configure the following variables:
   - `DATABASE_URL`: The connection string to your PostgreSQL database.
   - `JWT_SECRET`: A highly secure, randomly generated string used for signing authentication tokens. Generate one using `openssl rand -base64 32`.
   - `NEXT_PUBLIC_WEB3FORMS_KEY`: (Optional) Your Web3Forms access key.

4. **Initialize the Database**
   Push the Drizzle schema to your database to construct the required tables.
   ```bash
   npm run db:push
   ```

5. **Start the Application**
   For local usage and testing, run the development server:
   ```bash
   npm run dev
   ```
   For production deployments, build the application and start the optimized server:
   ```bash
   npm run build
   npm start
   ```

### Production Considerations
When deploying to a production environment, ensure that your application is served exclusively over HTTPS. Modern browsers restrict the usage of cryptographic Web APIs (such as those utilized by Libsodium's WebWorkers) to secure contexts. Without HTTPS, the zero-knowledge encryption layer will fail to initialize securely. 

Additionally, ensure your `JWT_SECRET` is stored safely within your deployment environment's secret management system.
