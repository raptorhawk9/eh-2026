import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const reports = sqliteTable('reports', {
	id: integer("id").primaryKey({ autoIncrement: true }),
	address: text('address').notNull(),
	hazard: text('hazard').notNull(), 
	platform: text('platform').notNull(),
	details: text('details').notNull(), 
});
