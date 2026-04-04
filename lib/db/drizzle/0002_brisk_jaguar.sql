CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(100),
	"pricing_type" varchar(50) DEFAULT 'fixed' NOT NULL,
	"unit" varchar(50) DEFAULT 'unidad' NOT NULL,
	"base_cost" numeric(14, 2) DEFAULT '0' NOT NULL,
	"suggested_price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"uses_indirect_input" boolean DEFAULT false NOT NULL,
	"report_area" varchar(100),
	"report_concept" varchar(100),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"line_type" varchar(40) NOT NULL,
	"source_type" varchar(40),
	"source_id" integer,
	"title" varchar(255) NOT NULL,
	"description" text,
	"quantity" numeric(14, 2) DEFAULT '1' NOT NULL,
	"unit_cost" numeric(14, 2) DEFAULT '0' NOT NULL,
	"unit_price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_cost" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"gross_margin" numeric(14, 2) DEFAULT '0' NOT NULL,
	"affects_stock" boolean DEFAULT false NOT NULL,
	"affects_finance" boolean DEFAULT true NOT NULL,
	"report_area" varchar(100),
	"report_concept" varchar(100),
	"supplier_id" integer,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"client_id" integer,
	"financial_account_id" integer,
	"payment_method" varchar(50) DEFAULT 'cash' NOT NULL,
	"amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"paid_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "quoted_total" numeric(12, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "subtotal_cost" numeric(12, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "subtotal_price" numeric(12, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "amount_paid" numeric(12, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "financial_status" varchar(30) DEFAULT 'pending' NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivered_at" timestamp;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "source_quote_id" varchar(100);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "stock_applied_at" timestamp;
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "payment_method" varchar(50);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "report_area" varchar(100);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "report_concept" varchar(100);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "order_item_id" integer;
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "order_payment_id" integer;
--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_financial_account_id_financial_accounts_id_fk" FOREIGN KEY ("financial_account_id") REFERENCES "public"."financial_accounts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_order_payment_id_order_payments_id_fk" FOREIGN KEY ("order_payment_id") REFERENCES "public"."order_payments"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_services_user_id_deleted_at" ON "services" USING btree ("user_id", "deleted_at");
--> statement-breakpoint
CREATE INDEX "idx_order_items_order_id_deleted_at" ON "order_items" USING btree ("order_id", "deleted_at");
--> statement-breakpoint
CREATE INDEX "idx_order_items_user_id_deleted_at" ON "order_items" USING btree ("user_id", "deleted_at");
--> statement-breakpoint
CREATE INDEX "idx_order_items_line_type" ON "order_items" USING btree ("line_type");
--> statement-breakpoint
CREATE INDEX "idx_order_payments_order_id_paid_at" ON "order_payments" USING btree ("order_id", "paid_at");
--> statement-breakpoint
CREATE INDEX "idx_order_payments_user_id_deleted_at" ON "order_payments" USING btree ("user_id", "deleted_at");
--> statement-breakpoint
CREATE INDEX "idx_transactions_order_type_date" ON "transactions" USING btree ("order_id", "type", "date");
--> statement-breakpoint
CREATE INDEX "idx_transactions_order_item_id" ON "transactions" USING btree ("order_item_id");
--> statement-breakpoint
CREATE INDEX "idx_transactions_order_payment_id" ON "transactions" USING btree ("order_payment_id");
--> statement-breakpoint
CREATE INDEX "idx_orders_financial_status" ON "orders" USING btree ("financial_status");
--> statement-breakpoint
INSERT INTO "order_items" (
	"order_id",
	"user_id",
	"line_type",
	"source_type",
	"title",
	"quantity",
	"unit_cost",
	"unit_price",
	"total_cost",
	"total_price",
	"gross_margin",
	"affects_stock",
	"affects_finance",
	"created_at",
	"updated_at"
)
SELECT
	oc."order_id",
	o."user_id",
	'legacy_cost',
	'legacy',
	oc."title",
	1,
	0,
	oc."amount",
	0,
	oc."amount",
	oc."amount",
	false,
	true,
	oc."created_at",
	now()
FROM "order_costs" oc
INNER JOIN "orders" o ON o."id" = oc."order_id";
--> statement-breakpoint
INSERT INTO "order_payments" (
	"order_id",
	"user_id",
	"client_id",
	"financial_account_id",
	"payment_method",
	"amount",
	"notes",
	"paid_at",
	"created_at",
	"updated_at"
)
SELECT
	t."order_id",
	t."user_id",
	t."client_id",
	t."financial_account_id",
	COALESCE(t."payment_method", 'legacy'),
	t."amount",
	COALESCE(t."description", 'Pago legacy migrado'),
	t."date",
	t."created_at",
	t."updated_at"
FROM "transactions" t
WHERE t."type" = 'income'
	AND t."order_id" IS NOT NULL
	AND t."deleted_at" IS NULL;
--> statement-breakpoint
UPDATE "transactions"
SET "payment_method" = COALESCE("payment_method", 'cash')
WHERE "type" = 'income';
--> statement-breakpoint
UPDATE "orders" o
SET
	"quoted_total" = COALESCE(NULLIF(o."quoted_total", 0), o."total_price", 0),
	"subtotal_cost" = COALESCE((
		SELECT SUM(oi."total_cost")
		FROM "order_items" oi
		WHERE oi."order_id" = o."id"
			AND oi."deleted_at" IS NULL
	), 0),
	"subtotal_price" = COALESCE((
		SELECT SUM(oi."total_price")
		FROM "order_items" oi
		WHERE oi."order_id" = o."id"
			AND oi."deleted_at" IS NULL
	), o."total_price", 0),
	"total_price" = COALESCE((
		SELECT SUM(oi."total_price")
		FROM "order_items" oi
		WHERE oi."order_id" = o."id"
			AND oi."deleted_at" IS NULL
	), o."total_price", 0),
	"amount_paid" = COALESCE((
		SELECT SUM(op."amount")
		FROM "order_payments" op
		WHERE op."order_id" = o."id"
			AND op."deleted_at" IS NULL
	), 0),
	"financial_status" = CASE
		WHEN COALESCE((
			SELECT SUM(op."amount")
			FROM "order_payments" op
			WHERE op."order_id" = o."id"
				AND op."deleted_at" IS NULL
		), 0) <= 0 THEN 'pending'
		WHEN COALESCE((
			SELECT SUM(op."amount")
			FROM "order_payments" op
			WHERE op."order_id" = o."id"
				AND op."deleted_at" IS NULL
		), 0) >= COALESCE((
			SELECT SUM(oi."total_price")
			FROM "order_items" oi
			WHERE oi."order_id" = o."id"
				AND oi."deleted_at" IS NULL
		), o."total_price", 0)
			AND COALESCE((
				SELECT SUM(oi."total_price")
				FROM "order_items" oi
				WHERE oi."order_id" = o."id"
					AND oi."deleted_at" IS NULL
			), o."total_price", 0) > 0 THEN 'paid'
		ELSE 'partial'
	END,
	"updated_at" = now();