import { z } from 'zod';
import { db } from '../../db';
import { entries, users } from '../../db/schema';
import { eq, and, desc, sql, lt } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../trpc';

export const entryRouter = router({
  saveEntry: protectedProcedure
    .input(z.object({
      id: z.string().uuid().optional(),
      ciphertext: z.string(),
      nonce: z.string(),
      metadataCiphertext: z.string().optional(),
      metadataNonce: z.string().optional(),
      date: z.string(), // Format YYYY-MM-DD
      wordCountDiff: z.number().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      if (input.wordCountDiff !== undefined && input.wordCountDiff !== 0) {
        await db.update(users)
          .set({ totalWords: sql`GREATEST(${users.totalWords} + ${input.wordCountDiff}, 0)` })
          .where(eq(users.id, userId));
      }

      if (input.id) {
        // Update existing entry
        // Make sure it belongs to the user
        const existing = await db.select().from(entries).where(
          and(eq(entries.id, input.id), eq(entries.userId, userId))
        );

        if (existing.length === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Entry not found or unauthorized' });
        }

        const [updated] = await db.update(entries)
          .set({
            ciphertext: input.ciphertext,
            nonce: input.nonce,
            metadataCiphertext: input.metadataCiphertext,
            metadataNonce: input.metadataNonce,
            date: input.date,
            updatedAt: new Date()
          })
          .where(eq(entries.id, input.id))
          .returning();

        return { id: updated.id };
      } else {
        // Insert new entry
        const [inserted] = await db.insert(entries)
          .values({
            userId,
            ciphertext: input.ciphertext,
            nonce: input.nonce,
            metadataCiphertext: input.metadataCiphertext,
            metadataNonce: input.metadataNonce,
            date: input.date
          })
          .returning();

        return { id: inserted.id };
      }
    }),

  getEntriesMetadata: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id;
      // Fetch id, date, and createdAt
      const metadataList = await db.select({
        id: entries.id,
        date: entries.date,
        createdAt: entries.createdAt
      })
      .from(entries)
      .where(eq(entries.userId, userId))
      .orderBy(desc(entries.createdAt));
      
      return metadataList;
    }),

  getEntryById: protectedProcedure
    .input(z.object({
      id: z.string().uuid()
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const result = await db.select().from(entries).where(
        and(eq(entries.id, input.id), eq(entries.userId, userId))
      );

      if (result.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Entry not found' });
      }

      return result[0];
    }),

  getAllEntries: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id;
      return await db.select().from(entries)
        .where(eq(entries.userId, userId))
        .orderBy(desc(entries.date));
    }),

  getEntries: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).nullish(),
      cursor: z.date().nullish(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const limit = input.limit ?? 50;

      const items = await db.select({
        id: entries.id,
        userId: entries.userId,
        date: entries.date,
        createdAt: entries.createdAt,
        updatedAt: entries.updatedAt,
        // Instead of fetching full ciphertext, only fetch metadata if available, 
        // falling back to ciphertext for legacy entries.
        ciphertext: sql<string>`COALESCE(${entries.metadataCiphertext}, ${entries.ciphertext})`.as('ciphertext'),
        nonce: sql<string>`COALESCE(${entries.metadataNonce}, ${entries.nonce})`.as('nonce')
      }).from(entries)
        .where(
          input.cursor 
            ? and(eq(entries.userId, userId), lt(entries.createdAt, input.cursor)) 
            : eq(entries.userId, userId)
        )
        .orderBy(desc(entries.createdAt))
        .limit(limit + 1);

      let nextCursor: Date | undefined = undefined;
      if (items.length > limit) {
        items.pop();
        nextCursor = items[items.length - 1].createdAt;
      }

      return { items, nextCursor };
    }),

  deleteEntry: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      wordCountToSubtract: z.number().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      // Delete the entry, making sure it belongs to the user
      const result = await db.delete(entries).where(
        and(eq(entries.id, input.id), eq(entries.userId, userId))
      ).returning();
      
      if (result.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Entry not found or unauthorized' });
      }

      if (input.wordCountToSubtract) {
        await db.update(users)
          .set({ totalWords: sql`GREATEST(${users.totalWords} - ${input.wordCountToSubtract}, 0)` })
          .where(eq(users.id, userId));
      }
      
      return { success: true };
    }),
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id;
      const result = await db.select({ totalWords: users.totalWords }).from(users).where(eq(users.id, userId));
      return { totalWords: result[0]?.totalWords || 0 };
    })
});
