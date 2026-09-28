CREATE TABLE "test_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_run_id" uuid NOT NULL,
	"test_name" text NOT NULL,
	"suite_name" text NOT NULL,
	"status" text NOT NULL,
	"duration_ms" integer,
	"error_message" text,
	"stack_trace" text,
	"source_file" text,
	"source_line" integer,
	"source_column" integer,
	"error_signature" text,
	"failure_category" text,
	"failure_category_source" text,
	"failure_category_confidence" real,
	"failure_analysis" jsonb,
	"project_configuration" text NOT NULL,
	"project_id" text NOT NULL,
	"effective_project_configuration" text NOT NULL,
	"executed_at" timestamp with time zone NOT NULL,
	"annotations" jsonb,
	"tags" text[],
	"retry_count" integer DEFAULT 0 NOT NULL,
	"timeout" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "test_cases_status_check" CHECK ("test_cases"."status" IN ('passed', 'failed', 'skipped'))
);
--> statement-breakpoint
CREATE TABLE "test_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipeline_id" text NOT NULL,
	"job_id" text,
	"branch" text DEFAULT 'unknown' NOT NULL,
	"commit_sha" text,
	"project_id" text NOT NULL,
	"project_configuration" text NOT NULL,
	"report_format" text DEFAULT 'playwright' NOT NULL,
	"app" text,
	"squad_name" text,
	"data_origin" text NOT NULL,
	"triggered_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"total_tests" integer DEFAULT 0 NOT NULL,
	"passed_tests" integer DEFAULT 0 NOT NULL,
	"failed_tests" integer DEFAULT 0 NOT NULL,
	"skipped_tests" integer DEFAULT 0 NOT NULL,
	"pass_rate" real DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "test_runs_data_origin_check" CHECK ("test_runs"."data_origin" IN ('actual_run', 'synthetic_seed'))
);
--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_test_run_id_test_runs_id_fk" FOREIGN KEY ("test_run_id") REFERENCES "public"."test_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_test_case_identity" ON "test_cases" USING btree ("test_run_id","test_name","suite_name");--> statement-breakpoint
CREATE INDEX "idx_cases_run" ON "test_cases" USING btree ("test_run_id");--> statement-breakpoint
CREATE INDEX "idx_cases_status" ON "test_cases" USING btree ("status","executed_at");--> statement-breakpoint
CREATE INDEX "idx_cases_identity_history" ON "test_cases" USING btree ("project_id","suite_name","effective_project_configuration","test_name","executed_at");--> statement-breakpoint
CREATE INDEX "idx_cases_failure_category" ON "test_cases" USING btree ("failure_category");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_pipeline_config" ON "test_runs" USING btree ("pipeline_id","project_configuration");--> statement-breakpoint
CREATE INDEX "idx_runs_origin_triggered" ON "test_runs" USING btree ("data_origin","triggered_at");--> statement-breakpoint
CREATE INDEX "idx_runs_identity_history" ON "test_runs" USING btree ("data_origin","project_id","project_configuration","triggered_at");--> statement-breakpoint
CREATE INDEX "idx_runs_squad_app" ON "test_runs" USING btree ("squad_name","app","triggered_at");