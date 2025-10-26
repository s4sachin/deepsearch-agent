CREATE TABLE IF NOT EXISTS "ai-app-template_stream" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"chat_id" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai-app-template_message" DROP CONSTRAINT "ai-app-template_message_chat_id_ai-app-template_chat_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "request_user_time_idx";--> statement-breakpoint
ALTER TABLE "ai-app-template_chat" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ai-app-template_message" ALTER COLUMN "order" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "ai-app-template_message" ALTER COLUMN "parts" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ai-app-template_message" ALTER COLUMN "role" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "ai-app-template_request" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai-app-template_stream" ADD CONSTRAINT "ai-app-template_stream_chat_id_ai-app-template_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."ai-app-template_chat"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stream_chat_id_idx" ON "ai-app-template_stream" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stream_created_at_idx" ON "ai-app-template_stream" USING btree ("created_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai-app-template_message" ADD CONSTRAINT "ai-app-template_message_chat_id_ai-app-template_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."ai-app-template_chat"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_updated_at_idx" ON "ai-app-template_chat" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_order_idx" ON "ai-app-template_message" USING btree ("order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "request_created_at_idx" ON "ai-app-template_request" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "ai-app-template_message" DROP COLUMN IF EXISTS "content";--> statement-breakpoint
ALTER TABLE "ai-app-template_request" DROP COLUMN IF EXISTS "prompt_tokens";--> statement-breakpoint
ALTER TABLE "ai-app-template_request" DROP COLUMN IF EXISTS "completion_tokens";