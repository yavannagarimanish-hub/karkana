CREATE TYPE "public"."order_status" AS ENUM('NEW', 'CONFIRMED', 'PREPARING', 'DISPATCHED', 'DELIVERED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."orientation" AS ENUM('SQUARE', 'WIDE', 'TALL');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('COD');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."product_module" AS ENUM('BASIC', 'CUSTOMIZED', 'PERSONALIZED');--> statement-breakpoint
CREATE TYPE "public"."section_key" AS ENUM('popular', 'featured', 'basic', 'customized', 'personalized');--> statement-breakpoint
CREATE TABLE "customer_addresses" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"customer_id" varchar(40) NOT NULL,
	"label" varchar(40) DEFAULT 'Home' NOT NULL,
	"house_flat" varchar(200) NOT NULL,
	"street_locality" varchar(200) NOT NULL,
	"city" varchar(100) NOT NULL,
	"state" varchar(100) NOT NULL,
	"pincode" varchar(6) NOT NULL,
	"instructions" text DEFAULT '' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"email" varchar(254) NOT NULL,
	"name" varchar(120) NOT NULL,
	"phone" varchar(16) NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"order_id" varchar(20) NOT NULL,
	"product_id" varchar(50) NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"product_image" varchar(500),
	"module" "product_module" NOT NULL,
	"unit_price_paise" integer NOT NULL,
	"quantity" integer NOT NULL,
	"line_total_paise" integer NOT NULL,
	"personalization_fee_paise" integer DEFAULT 0 NOT NULL,
	"personalization_image" varchar(500),
	"customization_notes" text,
	CONSTRAINT "order_items_order_id_product_id_pk" PRIMARY KEY("order_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"customer_id" varchar(40),
	"customer_name" varchar(120) NOT NULL,
	"mobile" varchar(16) NOT NULL,
	"address" jsonb NOT NULL,
	"subtotal_paise" integer NOT NULL,
	"fees_paise" integer DEFAULT 0 NOT NULL,
	"shipping_paise" integer DEFAULT 0 NOT NULL,
	"total_paise" integer NOT NULL,
	"payment_method" "payment_method" DEFAULT 'COD' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"status" "order_status" DEFAULT 'NEW' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"brand" varchar(100) DEFAULT '' NOT NULL,
	"category" varchar(100) DEFAULT '' NOT NULL,
	"subcategory" varchar(100) DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"short_description" text DEFAULT '' NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"original_price" numeric(12, 2),
	"stock_quantity" integer,
	"unit" varchar(50) DEFAULT '' NOT NULL,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"video" varchar(500) DEFAULT '' NOT NULL,
	"module" "product_module" NOT NULL,
	"display_position" integer DEFAULT 0 NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_popular" boolean DEFAULT false NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"in_stock" boolean DEFAULT true NOT NULL,
	"search_keywords" text DEFAULT '' NOT NULL,
	"safety_instructions" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"image_width" integer,
	"image_height" integer,
	"orientation" "orientation",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"key" "section_key" NOT NULL,
	"title" varchar(200) NOT NULL,
	"subtitle" varchar(400) DEFAULT '' NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"display_position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlist_items" (
	"customer_id" varchar(40) NOT NULL,
	"product_id" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wishlist_items_customer_id_product_id_pk" PRIMARY KEY("customer_id","product_id")
);
--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_addresses_customer_idx" ON "customer_addresses" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_email_uidx" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "orders_created_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "products_module_idx" ON "products" USING btree ("module");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category");--> statement-breakpoint
CREATE INDEX "products_position_idx" ON "products" USING btree ("display_position");--> statement-breakpoint
CREATE INDEX "products_visible_idx" ON "products" USING btree ("is_visible");