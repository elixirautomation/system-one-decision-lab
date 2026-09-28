CREATE TABLE "decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" text,
	"subject_label" text NOT NULL,
	"subject_keys" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"data_origin" text NOT NULL,
	"decision_type" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"category" text,
	"score" real,
	"noul" real,
	"confidence" real,
	"recommended_action" text,
	"routing_signal" text,
	"routing_value" real,
	"result" jsonb NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "decisions_data_origin_check" CHECK ("decisions"."data_origin" IN ('actual_run', 'synthetic_seed'))
);
--> statement-breakpoint
CREATE INDEX "idx_decisions_subject" ON "decisions" USING btree ("subject_type","subject_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_decisions_origin_created" ON "decisions" USING btree ("data_origin","decision_type","created_at");--> statement-breakpoint
CREATE INDEX "idx_decisions_provider" ON "decisions" USING btree ("provider","decision_type","created_at");