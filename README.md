# Carouself

Carouself is a zero-knowledge, end-to-end encrypted digital journaling application. It is designed to provide uncompromising security and complete data ownership, ensuring that private entries remain mathematically inaccessible to anyone but the author.

## Architecture & Security Implementation

The core architectural principle of Carouself is strict isolation between the client interface and server infrastructure. The server infrastructure is treated as entirely untrusted and is physically incapable of decrypting user data.

### Zero-Knowledge Cryptography
All encryption and decryption processes occur strictly on the client side, within the user's browser.
- **Key Derivation**: Upon authentication, the client utilizes Argon2id to derive two distinct cryptographic keys from the user's Master Password. The first is an authentication hash transmitted to the server. The second is an encryption key retained solely in the client's volatile memory.
- **Data Encryption**: When an entry is composed, the text and associated metadata are serialized and encrypted using the XChaCha20-Poly1305 authenticated encryption algorithm. This operation is powered by the industry-standard Libsodium cryptography library.
- **Ciphertext Storage**: The server receives and stores only the resulting ciphertext and cryptographic nonce. It never receives the plaintext, nor does it receive the encryption key required to read it.

### Application Stack
The application is built upon a modern, type-safe stack optimized for performance and maintainability:
- **Framework**: Next.js App Router, enabling efficient server-side rendering for non-authenticated interfaces and robust API routing.
- **RPC Layer**: tRPC facilitates strongly-typed, end-to-end communication between the client and the server, ensuring interface contracts are strictly enforced at compile time.
- **Database ORM**: Drizzle ORM provides a lightweight, highly performant abstraction over the SQL database, ensuring type safety at the persistence layer.
- **Interface**: The frontend is constructed using React and styled with Tailwind CSS. The rich-text editing experience is powered by the headless TipTap framework.

---

## Self-Hosting Guide

Carouself is entirely open-source and designed to be easily self-hosted. By self-hosting, you retain absolute physical and cryptographic control over your data environment.

### Prerequisites
To deploy your own instance of Carouself, you will need the following dependencies available in your environment:
- Node.js (Version 18 or higher)
- npm, yarn, or pnpm
- A PostgreSQL database (or an equivalent SQL database supported by Drizzle ORM)
- A Web3Forms Access Key (Optional, strictly for contact form functionality)

### Installation Steps

1. **Clone the Repository**
   Clone the source code to your local machine or server.
   ```bash
   git clone https://github.com/hafiz-own/carouself.git
   cd carouself
   ```

2. **Install Dependencies**
   Install the required Node.js packages.
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create your configuration file.
   ```bash
   cp .env.example .env
   ```
   Open the `.env` file and configure the following variables:
   - `DATABASE_URL`: The connection string to your SQL database.
   - `JWT_SECRET`: A highly secure, randomly generated string used for signing authentication tokens.
   - `NEXT_PUBLIC_WEB3FORMS_KEY`: (Optional) Your Web3Forms access key if you wish to enable the contact form.

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
   npm run start
   ```

### Production Considerations
When deploying to a production environment, ensure that your application is served exclusively over HTTPS. Modern browsers restrict the usage of cryptographic Web APIs (such as those utilized by Libsodium) to secure contexts. Without HTTPS, the zero-knowledge encryption layer will fail to initialize securely. 

Additionally, ensure your `JWT_SECRET` is generated using a secure random number generator and is stored safely within your deployment environment's secret management system.
