import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { db } from '../../db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { createHash, createHmac } from 'crypto';
import { cookies } from 'next/headers';
import { signToken } from '../../auth/jwt';
import { publicProcedure, protectedProcedure, router } from '../trpc';

// Simple in-memory rate limiter for login
// In a real multi-server environment, use Redis or a DB table
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_ATTEMPTS = 5;

function getClientIp(): string {
  // Since we don't have access to the raw request in this minimal tRPC setup by default,
  // we'll use a placeholder "unknown" or in the future inject it via Context.
  // For the MVP, if everyone falls under "unknown", rate limiting applies globally.
  // Ideally, context should inject the req.headers['x-forwarded-for'].
  // But for this requirement without rewriting context, we'll implement a basic one.
  return "global"; 
}

function checkRateLimit(ip: string) {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return;
  }
  
  if (now - record.firstAttempt > RATE_LIMIT_WINDOW) {
    // Reset window
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return;
  }
  
  if (record.count >= MAX_ATTEMPTS) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many login attempts. Please try again later.',
    });
  }
  
  record.count += 1;
}

function resetRateLimit(ip: string) {
  loginAttempts.delete(ip);
}

export const authRouter = router({
  signup: publicProcedure
    .input(z.object({
      email: z.string().email(),
      authKey: z.string(), // We expect hex or base64 representation
      salt: z.string(),
      encryptedDek: z.string(),
      dekNonce: z.string(),
      recoveryKeyHash: z.string()
    }))
    .mutation(async ({ input }) => {
      const existingUser = await db.select().from(users).where(eq(users.email, input.email));
      if (existingUser.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'An account with this email already exists',
        });
      }

      const authKeyHash = createHash('sha256').update(input.authKey).digest('hex');

      const [newUser] = await db.insert(users).values({
        email: input.email,
        authKeyHash: authKeyHash,
        salt: input.salt,
        encryptedDek: input.encryptedDek,
        dekNonce: input.dekNonce,
        recoveryKeyHash: input.recoveryKeyHash
      }).returning();

      const token = await signToken({ userId: newUser.id });
      const cookieStore = await cookies();
      cookieStore.set('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
        path: '/'
      });

      return { success: true, userId: newUser.id };
    }),

  getSalt: publicProcedure
    .input(z.object({
      email: z.string().email()
    }))
    .query(async ({ input }) => {
      const existingUser = await db.select({ 
        salt: users.salt, 
        encryptedDek: users.encryptedDek, 
        dekNonce: users.dekNonce 
      }).from(users).where(eq(users.email, input.email));
      
      if (existingUser.length > 0) {
        return { 
          salt: existingUser[0].salt,
          encryptedDek: existingUser[0].encryptedDek,
          dekNonce: existingUser[0].dekNonce
        };
      }
      
      // Prevent user enumeration by generating a deterministic fake salt
      // Ensure we always return exactly 32 hex chars (16 bytes)
      const fakeSalt = createHmac('sha256', process.env.JWT_SECRET || 'fallback_secret')
        .update(input.email)
        .digest('hex')
        .substring(0, 32);
        
      return { 
        salt: fakeSalt,
        encryptedDek: fakeSalt,
        dekNonce: fakeSalt.substring(0, 24)
      };
    }),

  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      authKey: z.string()
    }))
    .mutation(async ({ input }) => {
      const ip = getClientIp();
      checkRateLimit(ip);

      const existingUser = await db.select().from(users).where(eq(users.email, input.email));
      
      // Generic error function
      const genericError = () => {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
        });
      };

      if (existingUser.length === 0) {
        return genericError();
      }

      const user = existingUser[0];
      const incomingAuthKeyHash = createHash('sha256').update(input.authKey).digest('hex');

      if (user.authKeyHash !== incomingAuthKeyHash) {
        return genericError();
      }

      // Success
      resetRateLimit(ip);

      const token = await signToken({ userId: user.id });
      const cookieStore = await cookies();
      cookieStore.set('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60,
        path: '/'
      });

      return { success: true, userId: user.id };
    }),

  me: protectedProcedure
    .query(async ({ ctx }) => {
      const existingUser = await db.select({ email: users.email }).from(users).where(eq(users.id, ctx.user.id));
      if (existingUser.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      return { email: existingUser[0].email };
    }),

  logout: publicProcedure
    .mutation(async () => {
      const cookieStore = await cookies();
      cookieStore.delete('session');
      return { success: true };
    }),

  deleteAccount: protectedProcedure
    .mutation(async ({ ctx }) => {
      const userId = ctx.user.id;
      
      // Delete all entries for the user
      // Require importing `entries` from schema
      const { entries } = await import('../../db/schema');
      await db.delete(entries).where(eq(entries.userId, userId));
      
      // Delete the user
      await db.delete(users).where(eq(users.id, userId));
      
      // Destroy session
      const cookieStore = await cookies();
      cookieStore.delete('session');
      
      return { success: true };
    }),

  changePassword: protectedProcedure
    .input(z.object({
      newAuthKey: z.string(),
      newSalt: z.string(),
      newEncryptedDek: z.string(),
      newDekNonce: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const newAuthKeyHash = createHash('sha256').update(input.newAuthKey).digest('hex');
      
      await db.update(users)
        .set({
          authKeyHash: newAuthKeyHash,
          salt: input.newSalt,
          encryptedDek: input.newEncryptedDek,
          dekNonce: input.newDekNonce
        })
        .where(eq(users.id, ctx.user.id));
        
      return { success: true };
    })
});
