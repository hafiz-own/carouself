import { z } from 'zod';
import { db } from '../../db';
import { entries } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { protectedProcedure, router } from '../trpc';

export const entryRouter = router({
  saveEntry: protectedProcedure
    .input(z.object({
      id: z.string().uuid().optional(),
      ciphertext: z.string(),
      nonce: z.string(),
      date: z.string() // Format YYYY-MM-DD
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      if (input.id) {
        // Update existing entry
        // Make sure it belongs to the user
        const existing = await db.select().from(entries).where(
          and(eq(entries.id, input.id), eq(entries.userId, userId))
        );

        if (existing.length === 0) {
          throw new Error("Entry not found or unauthorized");
        }

        const [updated] = await db.update(entries)
          .set({
            ciphertext: input.ciphertext,
            nonce: input.nonce,
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
      .where(eq(entries.userId, userId));
      
      // Sort in memory by createdAt desc (or date desc if createdAt is somehow same)
      return metadataList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
        throw new Error("Entry not found");
      }

      return result[0];
    }),

  getAllEntries: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id;
      const allEntries = await db.select().from(entries).where(eq(entries.userId, userId));
      
      // Sort in memory by date desc
      return allEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }),

  deleteEntry: protectedProcedure
    .input(z.object({
      id: z.string().uuid()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      // Delete the entry, making sure it belongs to the user
      const result = await db.delete(entries).where(
        and(eq(entries.id, input.id), eq(entries.userId, userId))
      ).returning();
      
      if (result.length === 0) {
        throw new Error("Entry not found or unauthorized");
      }
      
      return { success: true };
    })
});
