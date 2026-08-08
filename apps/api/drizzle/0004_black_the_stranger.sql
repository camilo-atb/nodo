CREATE TABLE "challenge_answers" (
	"id" text PRIMARY KEY NOT NULL,
	"challenge_id" text NOT NULL,
	"person_id" text NOT NULL,
	"question_index" integer NOT NULL,
	"answer_index" integer NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"points" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "challenge_entries" (
	"challenge_id" text NOT NULL,
	"person_id" text NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"answered_count" integer DEFAULT 0 NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone,
	CONSTRAINT "challenge_entries_challenge_id_person_id_pk" PRIMARY KEY("challenge_id","person_id")
);
--> statement-breakpoint
CREATE TABLE "challenge_questions" (
	"id" text PRIMARY KEY NOT NULL,
	"challenge_id" text NOT NULL,
	"position" integer NOT NULL,
	"text" text NOT NULL,
	"options" text[] NOT NULL,
	"correct_index" integer NOT NULL,
	CONSTRAINT "challenge_questions_correct_check" CHECK ("challenge_questions"."correct_index" between 0 and 3)
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"skill_slug" text NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"duration_sec" integer DEFAULT 20 NOT NULL,
	"current_question" integer,
	"question_started_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "challenges_status_check" CHECK ("challenges"."status" in ('draft','waiting','question','reviewing','ended'))
);
--> statement-breakpoint
ALTER TABLE "challenge_answers" ADD CONSTRAINT "challenge_answers_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_answers" ADD CONSTRAINT "challenge_answers_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_entries" ADD CONSTRAINT "challenge_entries_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_entries" ADD CONSTRAINT "challenge_entries_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_questions" ADD CONSTRAINT "challenge_questions_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_skill_slug_skills_slug_fk" FOREIGN KEY ("skill_slug") REFERENCES "public"."skills"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "one_answer_per_person_question" ON "challenge_answers" USING btree ("challenge_id","person_id","question_index");--> statement-breakpoint
CREATE UNIQUE INDEX "challenge_questions_position_idx" ON "challenge_questions" USING btree ("challenge_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "one_live_challenge_per_team_skill" ON "challenges" USING btree ("team_id","skill_slug") WHERE "challenges"."status" in ('waiting','question','reviewing');--> statement-breakpoint
CREATE INDEX "challenges_status_expires_idx" ON "challenges" USING btree ("status","expires_at");