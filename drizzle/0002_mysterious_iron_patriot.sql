CREATE TABLE IF NOT EXISTS "ai-app-template_lesson" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"outline" text NOT NULL,
	"description" text,
	"status" varchar(50) DEFAULT 'generating' NOT NULL,
	"content" jsonb,
	"research_notes" json,
	"lesson_type" varchar(100),
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai-app-template_lesson" ADD CONSTRAINT "ai-app-template_lesson_user_id_ai-app-template_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."ai-app-template_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lesson_user_id_idx" ON "ai-app-template_lesson" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lesson_status_idx" ON "ai-app-template_lesson" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lesson_created_at_idx" ON "ai-app-template_lesson" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lesson_type_idx" ON "ai-app-template_lesson" USING btree ("lesson_type");