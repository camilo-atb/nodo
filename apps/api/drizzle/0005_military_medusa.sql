CREATE TABLE "event_subscriptions" (
	"event_id" text NOT NULL,
	"person_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_subscriptions_event_id_person_id_pk" PRIMARY KEY("event_id","person_id")
);
--> statement-breakpoint
ALTER TABLE "event_subscriptions" ADD CONSTRAINT "event_subscriptions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_subscriptions" ADD CONSTRAINT "event_subscriptions_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_subscriptions_person_idx" ON "event_subscriptions" USING btree ("person_id");--> statement-breakpoint
INSERT INTO "event_subscriptions" ("event_id", "person_id")
SELECT 'ev_open', p."id"
FROM "people" p
WHERE EXISTS (SELECT 1 FROM "events" e WHERE e."id" = 'ev_open')
ON CONFLICT DO NOTHING;
