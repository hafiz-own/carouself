ALTER TABLE "test_table" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "test_table" CASCADE;--> statement-breakpoint
CREATE INDEX "entries_user_id_idx" ON "entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "entries_user_date_idx" ON "entries" USING btree ("user_id","date");