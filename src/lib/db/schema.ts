import { pgTable, text, timestamp, uuid, varchar, date } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  authKeyHash: varchar('auth_key_hash', { length: 255 }).notNull(),
  salt: varchar('salt', { length: 255 }).notNull(),
  encryptedDek: varchar('encrypted_dek', { length: 255 }).notNull(),
  dekNonce: varchar('dek_nonce', { length: 255 }).notNull(),
  recoveryKeyHash: varchar('recovery_key_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const entries = pgTable('entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  ciphertext: text('ciphertext').notNull(),
  nonce: varchar('nonce', { length: 255 }).notNull(),
  date: date('date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const testTable = pgTable('test_table', {
  id: uuid('id').defaultRandom().primaryKey(),
  message: text('message').notNull(),
});
