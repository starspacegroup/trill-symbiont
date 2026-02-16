import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // Discord user ID
  username: text('username').notNull(),
  globalName: text('global_name'),
  avatar: text('avatar'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(), // hashed token
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

export const sharedSessions = sqliteTable('shared_sessions', {
  id: text('id').primaryKey(), // short unique code
  name: text('name').notNull(),
  creatorId: text('creator_id')
    .notNull()
    .references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true)
});
