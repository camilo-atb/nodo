CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"kind" text NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_kind_check" CHECK ("events"."kind" in ('hackathon','project'))
);
--> statement-breakpoint
-- El evento abierto por defecto (ADR-013) se inserta AQUÍ y no solo en
-- `db:seed`: las dos columnas de abajo son `NOT NULL` y esta migración corre
-- contra bases que ya tienen equipos e ideas. Sin esta fila, el backfill no
-- tendría a dónde apuntar y el ALTER fallaría.
INSERT INTO "events" ("id", "name", "description", "kind")
VALUES ('ev_open', 'Proyectos abiertos', 'Contenedor por defecto para todo lo que no pertenece a un hackathon.', 'project')
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
-- Tres pasos en vez de uno: añadir la columna como nullable, rellenar las
-- filas existentes y solo entonces exigir `NOT NULL`. Un `ADD COLUMN ... NOT
-- NULL` sin defecto aborta en cuanto hay una sola fila en la tabla.
ALTER TABLE "ideas" ADD COLUMN "event_id" text;--> statement-breakpoint
UPDATE "ideas" SET "event_id" = 'ev_open' WHERE "event_id" IS NULL;--> statement-breakpoint
ALTER TABLE "ideas" ALTER COLUMN "event_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "event_id" text;--> statement-breakpoint
UPDATE "teams" SET "event_id" = 'ev_open' WHERE "event_id" IS NULL;--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "event_id" SET NOT NULL;--> statement-breakpoint
-- El meta de los nodos también se rellena: es por donde el cliente filtra el
-- grafo, ya que `Event` no es un `NodeKind`.
UPDATE "nodes" SET "meta" = "meta" || '{"eventId":"ev_open"}'::jsonb
 WHERE "kind" IN ('team', 'idea');--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "teams_event_idx" ON "teams" USING btree ("event_id");
