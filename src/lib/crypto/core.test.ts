import { describe, it, expect, beforeAll } from 'vitest';
import sodium from 'libsodium-wrappers-sumo';
import {
  initCrypto,
  generateSalt,
  deriveMasterKey,
  deriveAuthKey,
  deriveEncKey,
  encryptEntry,
  decryptEntry
} from './core';

describe('Encryption Core', () => {
  beforeAll(async () => {
    // Wait for sodium to initialize before any tests run
    await initCrypto();
  });

  it('Argon2id key derivation produces deterministic output for a given password + salt', async () => {
    const password = 'my_super_secret_password';
    const salt = generateSalt();

    const masterKey1 = await deriveMasterKey(password, salt);
    const masterKey2 = await deriveMasterKey(password, salt);

    // Both derivations with the exact same inputs should produce the exact same byte array
    expect(masterKey1).toEqual(masterKey2);
  });

  it('Two distinct keys (auth key, encryption key) are derivable from one master password and differ from each other', async () => {
    const password = 'my_super_secret_password';
    const salt = generateSalt();

    const masterKey = await deriveMasterKey(password, salt);
    
    const authKey = deriveAuthKey(masterKey);
    const encKey = deriveEncKey(masterKey);

    // Ensure both derived keys are generated
    expect(authKey).toBeDefined();
    expect(encKey).toBeDefined();

    // Ensure they are 32 bytes long
    expect(authKey.length).toBe(32);
    expect(encKey.length).toBe(32);

    // They must be distinct keys
    expect(authKey).not.toEqual(encKey);
  });

  it('XChaCha20-Poly1305 encrypt -> decrypt round-trip returns the original plaintext for a sample entry', async () => {
    const password = 'my_super_secret_password';
    const salt = generateSalt();
    const masterKey = await deriveMasterKey(password, salt);
    const encKey = deriveEncKey(masterKey);

    const plaintext = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "This is my highly confidential journal entry." }]
        }
      ]
    });

    const { ciphertext, nonce } = encryptEntry(plaintext, encKey);

    // Ciphertext must be different from plaintext
    expect(ciphertext).not.toEqual(sodium.from_string(plaintext));

    // Decrypt it back
    const decryptedText = decryptEntry(ciphertext, nonce, encKey);

    expect(decryptedText).toBe(plaintext);
  });

  it('Decryption with an incorrect key fails explicitly rather than returning corrupted plaintext', async () => {
    const password = 'my_super_secret_password';
    const salt = generateSalt();
    const masterKey = await deriveMasterKey(password, salt);
    const encKey = deriveEncKey(masterKey);

    const wrongPassword = 'wrong_password';
    const wrongMasterKey = await deriveMasterKey(wrongPassword, salt);
    const wrongEncKey = deriveEncKey(wrongMasterKey);

    const plaintext = 'Secret data';
    const { ciphertext, nonce } = encryptEntry(plaintext, encKey);

    // Decrypting with wrong key should throw
    expect(() => {
      decryptEntry(ciphertext, nonce, wrongEncKey);
    }).toThrow('Decryption failed: Incorrect key or corrupted data.');
  });
});
