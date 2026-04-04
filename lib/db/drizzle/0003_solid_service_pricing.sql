ALTER TABLE "products" ADD COLUMN "price_tiers" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "allow_manual_price" boolean DEFAULT true NOT NULL;