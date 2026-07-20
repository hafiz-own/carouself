import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { db } from '../../db';
import { users, entries, rateLimits } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { createHash, createHmac } from 'crypto';
import { cookies } from 'next/headers';
import { signToken } from '../../auth/jwt';
import { publicProcedure, protectedProcedure, router } from '../trpc';

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_ATTEMPTS = 5;

async function checkRateLimit(ip: string) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW);

  const existingRecord = await db.select().from(rateLimits).where(eq(rateLimits.ip, ip));

  if (existingRecord.length === 0) {
    await db.insert(rateLimits).values({
      ip,
      attempts: 1,
      firstAttemptAt: now
    });
    return;
  }

  const record = existingRecord[0];

  if (record.firstAttemptAt < windowStart) {
    // Reset window
    await db.update(rateLimits).set({
      attempts: 1,
      firstAttemptAt: now
    }).where(eq(rateLimits.ip, ip));
    return;
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many login attempts. Please try again later.',
    });
  }

  await db.update(rateLimits).set({
    attempts: record.attempts + 1
  }).where(eq(rateLimits.ip, ip));
}

async function resetRateLimit(ip: string) {
  await db.delete(rateLimits).where(eq(rateLimits.ip, ip));
}

export const authRouter = router({
  signup: publicProcedure
    .input(z.object({
      email: z.string().email(),
      authKey: z.string(), // We expect hex or base64 representation
      salt: z.string(),
      encryptedDek: z.string(),
      dekNonce: z.string(),
      recoveryKeyHash: z.string(),
      recoveryEncryptedDek: z.string().optional(),
      recoveryDekNonce: z.string().optional()
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
        recoveryKeyHash: input.recoveryKeyHash,
        recoveryEncryptedDek: input.recoveryEncryptedDek,
        recoveryDekNonce: input.recoveryDekNonce
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
        dekNonce: users.dekNonce,
        recoveryEncryptedDek: users.recoveryEncryptedDek,
        recoveryDekNonce: users.recoveryDekNonce
      }).from(users).where(eq(users.email, input.email));
      
      if (existingUser.length > 0) {
        return { 
          salt: existingUser[0].salt,
          encryptedDek: existingUser[0].encryptedDek,
          dekNonce: existingUser[0].dekNonce,
          recoveryEncryptedDek: existingUser[0].recoveryEncryptedDek,
          recoveryDekNonce: existingUser[0].recoveryDekNonce
        };
      }
      
      if (!process.env.JWT_SECRET) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Server configuration error' });
      }

      // Prevent user enumeration by generating a deterministic fake salt
      const fakeSalt = createHmac('sha256', process.env.JWT_SECRET)
        .update(input.email)
        .digest('hex')
        .substring(0, 32);
        
      const fakeEncryptedDek = createHmac('sha256', process.env.JWT_SECRET)
        .update(input.email + 'dek')
        .digest('hex')
        .substring(0, 80);

      const fakeNonce = createHmac('sha256', process.env.JWT_SECRET)
        .update(input.email + 'nonce')
        .digest('hex')
        .substring(0, 48);
      const fakeRecoveryEncryptedDek = createHmac('sha256', process.env.JWT_SECRET)
        .update(input.email + 'recdek')
        .digest('hex')
        .substring(0, 80);

      const fakeRecoveryDekNonce = createHmac('sha256', process.env.JWT_SECRET)
        .update(input.email + 'recnonce')
        .digest('hex')
        .substring(0, 48);
        
      return { 
        salt: fakeSalt,
        encryptedDek: fakeEncryptedDek,
        dekNonce: fakeNonce,
        recoveryEncryptedDek: fakeRecoveryEncryptedDek,
        recoveryDekNonce: fakeRecoveryDekNonce
      };
    }),

  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      authKey: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      const ip = ctx.ip || 'unknown';
      await checkRateLimit(ip);

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
      await resetRateLimit(ip);

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

  logout: protectedProcedure
    .mutation(async () => {
      const cookieStore = await cookies();
      cookieStore.delete('session');
      return { success: true };
    }),

  recoverAccount: publicProcedure
    .input(z.object({
      email: z.string().email(),
      recoveryKeyHash: z.string(),
      
      // New credentials
      salt: z.string(),
      authKey: z.string(),
      encryptedDek: z.string(),
      dekNonce: z.string(),
      
      // New recovery key
      newRecoveryKeyHash: z.string(),
      recoveryEncryptedDek: z.string(),
      recoveryDekNonce: z.string()
    }))
    .mutation(async ({ input }) => {
      const existingUser = await db.select().from(users).where(eq(users.email, input.email));
      if (existingUser.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Account not found' });
      }

      const user = existingUser[0];

      // Verify the recovery key hash
      if (user.recoveryKeyHash !== input.recoveryKeyHash) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid recovery key' });
      }

      // Hash the new auth key for storage
      const authKeyHash = createHash('sha256').update(input.authKey).digest('hex');

      // Update the user record
      await db.update(users)
        .set({
          authKeyHash,
          salt: input.salt,
          encryptedDek: input.encryptedDek,
          dekNonce: input.dekNonce,
          recoveryKeyHash: input.newRecoveryKeyHash,
          recoveryEncryptedDek: input.recoveryEncryptedDek,
          recoveryDekNonce: input.recoveryDekNonce
        })
        .where(eq(users.id, user.id));

      // Generate a new session token
      const token = await signToken({ userId: user.id });
      const cookieStore = await cookies();
      cookieStore.set('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
        path: '/'
      });

      return { success: true, userId: user.id };
    }),

  deleteAccount: protectedProcedure
    .mutation(async ({ ctx }) => {
      const userId = ctx.user.id;
      
      // Delete all entries for the user
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
      oldAuthKey: z.string(),
      newAuthKey: z.string(),
      newSalt: z.string(),
      newEncryptedDek: z.string(),
      newDekNonce: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const existingUser = await db.select().from(users).where(eq(users.id, ctx.user.id));
      if (existingUser.length === 0) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      const incomingOldAuthKeyHash = createHash('sha256').update(input.oldAuthKey).digest('hex');
      if (existingUser[0].authKeyHash !== incomingOldAuthKeyHash) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Incorrect current password' });
      }

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
