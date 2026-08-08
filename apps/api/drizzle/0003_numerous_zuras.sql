CREATE TABLE "board_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"board_id" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"x" real NOT NULL,
	"y" real NOT NULL,
	"color" text DEFAULT 'yellow' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "board_votes" (
	"card_id" text NOT NULL,
	"person_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "board_votes_card_id_person_id_pk" PRIMARY KEY("card_id","person_id")
);
--> statement-breakpoint
CREATE TABLE "boards" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"winner_card_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "boards_team_id_unique" UNIQUE("team_id")
);
--> statement-breakpoint
ALTER TABLE "board_cards" ADD CONSTRAINT "board_cards_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_cards" ADD CONSTRAINT "board_cards_created_by_people_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_votes" ADD CONSTRAINT "board_votes_card_id_board_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."board_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_votes" ADD CONSTRAINT "board_votes_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boards" ADD CONSTRAINT "boards_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "board_cards_board_idx" ON "board_cards" USING btree ("board_id");--> statement-breakpoint
-- Backfill: el tablero nace con el equipo (docs/11), así que los equipos que
-- ya existían necesitan el suyo. Sin esto, `GET /v1/teams/:id/board` daría 404
-- para todo equipo anterior a esta migración.
INSERT INTO "boards" ("id", "team_id")
SELECT 'brd_' || replace(gen_random_uuid()::text, '-', ''), "id"
  FROM "teams"
 WHERE "id" NOT IN (SELECT "team_id" FROM "boards");
