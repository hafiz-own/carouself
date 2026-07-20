import sodium from 'libsodium-wrappers-sumo';

/**
 * Initializes the libsodium library. Must be called and awaited before
 * any other cryptographic functions are used.
 */
export async function initCrypto(): Promise<void> {
  await sodium.ready;
}

/**
 * Generates a random salt for use with Argon2id.
 * @returns Uint8Array 16-byte random salt
 */
export function generateSalt(): Uint8Array {
  return sodium.randombytes_buf(16);
}

/**
 * Derives the master key from the given password and salt using Argon2id.
 * @param password The user's master password
 * @param salt The salt generated during signup
 * @returns Uint8Array 32-byte master key
 */
export async function deriveMasterKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
  if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./worker.ts', import.meta.url));
      worker.onmessage = (e) => {
        if (e.data.success) {
          resolve(e.data.key);
        } else {
          reject(new Error(e.data.error));
        }
        worker.terminate();
      };
      worker.onerror = (e) => {
        reject(e);
        worker.terminate();
      };
      worker.postMessage({ password, salt });
    });
  }

  // Fallback for Node.js (tests)
  return sodium.crypto_pwhash(
    32, // master key length (32 bytes)
    password,
    salt,
    sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_ALG_ARGON2ID13
  );
}

/**
 * Derives the Authentication Key from the master key.
 * @param masterKey The master key derived from the password and salt
 * @returns Uint8Array 32-byte Auth Key
 */
export function deriveAuthKey(masterKey: Uint8Array): Uint8Array {
  return sodium.crypto_kdf_derive_from_key(
    32, // output key length
    1, // subkey ID
    "auth____", // context (must be exactly 8 bytes)
    masterKey
  );
}

/**
 * Derives the Encryption Key from the master key.
 * @param masterKey The master key derived from the password and salt
 * @returns Uint8Array 32-byte Enc Key
 */
export function deriveEncKey(masterKey: Uint8Array): Uint8Array {
  return sodium.crypto_kdf_derive_from_key(
    32, // output key length
    2, // subkey ID (using 2, although contexts already separate them)
    "enc_____", // context (must be exactly 8 bytes)
    masterKey
  );
}

/**
 * Generates a random 32-byte Data Encryption Key (DEK).
 * @returns Uint8Array 32-byte DEK
 */
export function generateDEK(): Uint8Array {
  return sodium.randombytes_buf(32);
}

export interface EncryptedData {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
}

/**
 * Encrypts plaintext using XChaCha20-Poly1305 AEAD.
 * Generates a random 24-byte nonce internally.
 * @param plaintext The string data to encrypt
 * @param encKey The Encryption Key
 * @returns EncryptedData containing ciphertext and nonce
 */
export function encryptEntry(plaintext: string, encKey: Uint8Array): EncryptedData {
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    plaintext,
    null, // no additional data
    null, // no secret nonce
    nonce,
    encKey
  );
  
  return { ciphertext, nonce };
}

/**
 * Encrypts the DEK using the KEK (Key Encryption Key).
 * Uses XChaCha20-Poly1305.
 * @param dek The raw Data Encryption Key (32 bytes)
 * @param kek The Key Encryption Key derived from the password
 * @returns EncryptedData containing encrypted DEK and nonce
 */
export function encryptDEK(dek: Uint8Array, kek: Uint8Array): EncryptedData {
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    dek,
    null, // no additional data
    null, // no secret nonce
    nonce,
    kek
  );
  
  return { ciphertext, nonce };
}

/**
 * Decrypts XChaCha20-Poly1305 ciphertext back to plaintext.
 * Throws an error if the decryption fails (e.g., incorrect key, tampered data).
 * @param ciphertext The encrypted data
 * @param nonce The nonce used during encryption
 * @param encKey The Encryption Key
 * @returns string The decrypted plaintext
 */
export function decryptEntry(ciphertext: Uint8Array, nonce: Uint8Array, encKey: Uint8Array): string {
  try {
    const plaintextBytes = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null, // no secret nonce
      ciphertext,
      null, // no additional data
      nonce,
      encKey
    );
    
    return sodium.to_string(plaintextBytes);
  } catch (_error) {
    // Explicitly throw a meaningful error on failure to satisfy AC
    throw new Error('Decryption failed: Incorrect key or corrupted data.');
  }
}

/**
 * Decrypts the Encrypted DEK using the KEK.
 * @param ciphertext The encrypted DEK
 * @param nonce The nonce used during DEK encryption
 * @param kek The Key Encryption Key
 * @returns Uint8Array The decrypted raw DEK
 */
export function decryptDEK(ciphertext: Uint8Array, nonce: Uint8Array, kek: Uint8Array): Uint8Array {
  try {
    return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null, // no secret nonce
      ciphertext,
      null, // no additional data
      nonce,
      kek
    );
  } catch (_error) {
    throw new Error('Failed to decrypt DEK: Incorrect master password.');
  }
}
