import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { cookies } from 'next/headers';
import { verifyToken } from '../auth/jwt';

import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface Context {
  req?: Request;
  ip?: string;
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const isAuth = t.middleware(async ({ next, ctx }) => {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;

  if (!sessionToken) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }

  try {
    const payload = await verifyToken(sessionToken);
    
    const existingUser = await db.select().from(users).where(eq(users.id, payload.userId));
    if (existingUser.length === 0) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
    }

    return next({
      ctx: {
        ...ctx,
        user: {
          id: payload.userId,
        },
      },
    });
  } catch (_error) {
    if (_error instanceof TRPCError) throw _error;
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid or expired session' });
  }
});

export const protectedProcedure = t.procedure.use(isAuth);
