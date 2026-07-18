import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { cookies } from 'next/headers';
import { verifyToken } from '../auth/jwt';

const t = initTRPC.create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const isAuth = t.middleware(async ({ next }) => {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;

  if (!sessionToken) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }

  try {
    const payload = await verifyToken(sessionToken);
    return next({
      ctx: {
        user: {
          id: payload.userId,
        },
      },
    });
  } catch (error) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid or expired session' });
  }
});

export const protectedProcedure = t.procedure.use(isAuth);
