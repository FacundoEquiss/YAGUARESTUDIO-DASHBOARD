CREATE TABLE "dtf_global_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"price_per_meter" integer DEFAULT 10000 NOT NULL,
	"roll_width" real DEFAULT 58 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_dtf_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"price_per_meter" integer DEFAULT 10000 NOT NULL,
	"roll_width" real DEFAULT 58 NOT NULL,
	"base_margin" integer DEFAULT 2000 NOT NULL,
	"wholesale_margin" integer DEFAULT 1200 NOT NULL,
	"press_pass_threshold" integer DEFAULT 2 NOT NULL,
	"press_pass_extra_cost" integer DEFAULT 800 NOT NULL,
	"talle_enabled" boolean DEFAULT false NOT NULL,
	"talle_surcharge" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_dtf_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(50),
	"supabase_auth_id" text,
	"name" varchar(255) NOT NULL,
	"last_name" varchar(255),
	"password_hash" text NOT NULL,
	"role" varchar(20) DEFAULT 'user' NOT NULL,
	"phone" varchar(50),
	"business_name" varchar(255),
	"birth_date" date,
	"profile_photo_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_supabase_auth_id_unique" UNIQUE("supabase_auth_id")
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(50) NOT NULL,
	"limits" jsonb NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "subscription_plans_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"plan_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"current_period_start" timestamp DEFAULT now() NOT NULL,
	"current_period_end" timestamp NOT NULL,
	"mp_subscription_id" varchar(255),
	"mp_last_event_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_subscriptions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "usage_counters" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"counter_type" varchar(50) NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"period_start" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_user_counter" UNIQUE("user_id","counter_type")
);
--> statement-breakpoint
CREATE TABLE "usage_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedbacks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"message" text NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_costs" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"client_id" integer,
	"client_name" varchar(255) NOT NULL,
	"title" varchar(255),
	"description" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" varchar(30) DEFAULT 'nuevo' NOT NULL,
	"due_date" timestamp,
	"notes" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"business_name" varchar(255),
	"notes" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"business_name" varchar(255),
	"category" varchar(100),
	"notes" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(20) NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"description" text,
	"category" varchar(50) NOT NULL,
	"client_id" integer,
	"supplier_id" integer,
	"order_id" integer,
	"financial_account_id" integer,
	"date" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"account_type" varchar(50) DEFAULT 'cash' NOT NULL,
	"currency" varchar(10) DEFAULT 'ARS' NOT NULL,
	"opening_balance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_stock_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"supplier_id" integer,
	"order_id" integer,
	"movement_type" varchar(50) NOT NULL,
	"quantity" numeric(14, 2) NOT NULL,
	"unit_cost" numeric(14, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"supplier_id" integer,
	"name" varchar(255) NOT NULL,
	"sku" varchar(100),
	"category" varchar(100),
	"unit" varchar(50) DEFAULT 'unidad' NOT NULL,
	"sale_price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"cost_price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"current_stock" numeric(14, 2) DEFAULT '0' NOT NULL,
	"min_stock" numeric(14, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_dtf_settings" ADD CONSTRAINT "user_dtf_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_costs" ADD CONSTRAINT "order_costs_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_financial_account_id_financial_accounts_id_fk" FOREIGN KEY ("financial_account_id") REFERENCES "public"."financial_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_stock_movements" ADD CONSTRAINT "product_stock_movements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_stock_movements" ADD CONSTRAINT "product_stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_stock_movements" ADD CONSTRAINT "product_stock_movements_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_stock_movements" ADD CONSTRAINT "product_stock_movements_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;