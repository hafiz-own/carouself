import { router, publicProcedure } from './trpc';
import { authRouter } from './routers/auth';
import { entryRouter } from './routers/entry';
import { db } from '../db';
import { testTable } from '../db/schema';

export const appRouter = router({
  test: publicProcedure.query(async () => {
    // Trivial database round-trip
    const messageStr = `Hello from tRPC at ${new Date().toISOString()}`;
    const [inserted] = await db.insert(testTable).values({ message: messageStr }).returning();
    return inserted;
  }),
  auth: authRouter,
  entry: entryRouter,
});

export type AppRouter = typeof appRouter;
