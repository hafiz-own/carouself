import { pgTable, text, timestamp, uuid, varchar, date, integer, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  authKeyHash: varchar('auth_key_hash', { length: 255 }).notNull(),
  salt: varchar('salt', { length: 255 }).notNull(),
  encryptedDek: varchar('encrypted_dek', { length: 255 }).notNull(),
  dekNonce: varchar('dek_nonce', { length: 255 }).notNull(),
  recoveryKeyHash: varchar('recovery_key_hash', { length: 255 }).notNull(),
  recoveryEncryptedDek: varchar('recovery_encrypted_dek', { length: 255 }), // Nullable for backwards compatibility during dev
  recoveryDekNonce: varchar('recovery_dek_nonce', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  totalWords: integer('total_words').default(0).notNull(),
});

export const rateLimits = pgTable('rate_limits', {
  ip: varchar('ip', { length: 255 }).primaryKey(),
  attempts: integer('attempts').default(1).notNull(),
  firstAttemptAt: timestamp('first_attempt_at').defaultNow().notNull(),
});

export const entries = pgTable('entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  ciphertext: text('ciphertext').notNull(),
  nonce: varchar('nonce', { length: 255 }).notNull(),
  metadataCiphertext: text('metadata_ciphertext'), // Nullable for legacy entries
  metadataNonce: varchar('metadata_nonce', { length: 255 }), // Nullable for legacy entries
  date: date('date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('entries_user_id_idx').on(table.userId),
  index('entries_user_date_idx').on(table.userId, table.date),
]);

