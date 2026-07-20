import { SignJWT, jwtVerify } from 'jose';

// Helper to get the secret as a Uint8Array for jose
const getSecret = () => {
  const secretStr = process.env.JWT_SECRET;
  if (!secretStr) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(secretStr);
};

export interface SessionPayload {
  userId: string;
}

/**
 * Signs a JWT for the given user ID.
 * Defaults to 7 days expiration as per the PRD.
 */
export async function signToken(payload: SessionPayload): Promise<string> {
  const secret = getSecret();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

/**
 * Verifies the JWT and returns the parsed payload.
 * Throws an error if the token is invalid or expired.
 */
export async function verifyToken(token: string): Promise<SessionPayload> {
  const secret = getSecret();
  const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
  return payload as unknown as SessionPayload;
}
