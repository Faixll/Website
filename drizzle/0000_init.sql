CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"first_name" text NOT NULL,
	"consent_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" uuid,
	"status" text NOT NULL,
	"payment" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"subtotal_fils" integer NOT NULL,
	"discount_fils" integer NOT NULL,
	"delivery_fee_fils" integer NOT NULL,
	"total_fils" integer NOT NULL,
	"vat_fils" integer NOT NULL,
	"points_redeemed" integer DEFAULT 0 NOT NULL,
	"points_earnable" integer DEFAULT 0 NOT NULL,
	"promo_code" text,
	"payment_intent" text,
	"details" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"code_hash" text NOT NULL,
	"ip" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "points_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" uuid NOT NULL,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"order_id" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" uuid NOT NULL,
	"product_id" text NOT NULL,
	"order_id" text NOT NULL,
	"first_name" text NOT NULL,
	"stars" integer NOT NULL,
	"text" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_stars" CHECK ("reviews"."stars" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "login_attempts_ip" ON "login_attempts" USING btree ("ip","created_at");--> statement-breakpoint
CREATE INDEX "orders_customer" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "orders_created" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "otp_phone_created" ON "otp_codes" USING btree ("phone","created_at");--> statement-breakpoint
CREATE INDEX "otp_ip_created" ON "otp_codes" USING btree ("ip","created_at");--> statement-breakpoint
CREATE INDEX "ledger_customer" ON "points_ledger" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_order_reason" ON "points_ledger" USING btree ("order_id","reason") WHERE "points_ledger"."order_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_one_per_product" ON "reviews" USING btree ("customer_id","product_id");--> statement-breakpoint
CREATE INDEX "reviews_product_status" ON "reviews" USING btree ("product_id","status");