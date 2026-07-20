import sodium from 'libsodium-wrappers-sumo';

self.addEventListener('message', async (e: MessageEvent) => {
  const { password, salt } = e.data;
  try {
    await sodium.ready;
    const key = sodium.crypto_pwhash(
      32, // master key length (32 bytes)
      password,
      salt,
      sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_ALG_ARGON2ID13
    );
    self.postMessage({ success: true, key });
  } catch (error) {
    self.postMessage({ success: false, error: (error as Error).message });
  }
});
