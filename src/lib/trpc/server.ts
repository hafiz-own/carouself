import { router } from './trpc';
import { authRouter } from './routers/auth';
import { entryRouter } from './routers/entry';
export const appRouter = router({
  auth: authRouter,
  entry: entryRouter,
});

export type AppRouter = typeof appRouter;
