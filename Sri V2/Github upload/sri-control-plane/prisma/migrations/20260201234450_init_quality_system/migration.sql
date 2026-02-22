-- CreateTable
CREATE TABLE "signing_keys" (
    "version" INTEGER NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "status" VARCHAR(20) NOT NULL,

    CONSTRAINT "signing_keys_pkey" PRIMARY KEY ("version")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "username" VARCHAR(255),
    "company" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "role" VARCHAR(50) DEFAULT 'user',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_zones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "location" VARCHAR(255) NOT NULL,
    "hectares" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(255) NOT NULL,
    "file_size" BIGINT NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "ocr_status" VARCHAR(20) DEFAULT 'pending',
    "ocr_data" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grain_stocks" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "production_zone_id" UUID NOT NULL,
    "grain_type" VARCHAR(50) NOT NULL,
    "campaign" VARCHAR(20) NOT NULL,
    "initial_stock" DECIMAL(15,2) DEFAULT 0,
    "sold_delivered" DECIMAL(15,2) DEFAULT 0,
    "livestock_consumption" DECIMAL(15,2) DEFAULT 0,
    "seeds" DECIMAL(15,2) DEFAULT 0,
    "extruder_own" DECIMAL(15,2) DEFAULT 0,
    "extruder_exchange" DECIMAL(15,2) DEFAULT 0,
    "exchanges" DECIMAL(15,2) DEFAULT 0,
    "committed_sales" DECIMAL(15,2) DEFAULT 0,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grain_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legal_name" TEXT,
    "tax_id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "province" TEXT,
    "postal_code" TEXT,
    "company_type" TEXT NOT NULL,
    "default_commission_pct" DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlements" (
    "id" TEXT NOT NULL,
    "settlement_number" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "settlement_date" DATE NOT NULL,
    "operation_date" DATE,
    "payment_date" DATE,
    "grain_type" TEXT NOT NULL,
    "campaign" TEXT,
    "base_price_per_ton" DECIMAL(12,2) NOT NULL,
    "exchange_rate" DECIMAL(10,4),
    "total_gross_kg" DECIMAL(12,2) NOT NULL,
    "total_net_kg" DECIMAL(12,2) NOT NULL,
    "total_waste_kg" DECIMAL(12,2) NOT NULL,
    "average_factor" DECIMAL(6,3),
    "gross_amount" DECIMAL(15,2) NOT NULL,
    "commercial_discount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "commission_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "paritarias_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "freight_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(15,2) NOT NULL,
    "original_pdf_path" TEXT,
    "original_pdf_hash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "validated_at" TIMESTAMP(3),
    "validated_by" TEXT,
    "validation_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ctg_entries" (
    "id" TEXT NOT NULL,
    "settlement_id" TEXT NOT NULL,
    "ctg_number" TEXT NOT NULL,
    "cp_number" TEXT,
    "establishment" TEXT,
    "field" TEXT,
    "gross_kg" DECIMAL(12,2) NOT NULL,
    "net_kg" DECIMAL(12,2) NOT NULL,
    "waste_kg" DECIMAL(12,2) NOT NULL,
    "factor" DECIMAL(6,3),
    "base_price_per_ton" DECIMAL(12,2) NOT NULL,
    "adjusted_price_per_ton" DECIMAL(12,2),
    "commercial_discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "freight_per_ton" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "gross_amount" DECIMAL(15,2),
    "net_amount" DECIMAL(15,2),
    "line_number" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ctg_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_analyses" (
    "id" TEXT NOT NULL,
    "ctg_entry_id" TEXT,
    "ctg_number" TEXT NOT NULL,
    "grain_type" TEXT NOT NULL,
    "analysis_date" DATE NOT NULL,
    "laboratory" TEXT,
    "analyst" TEXT,
    "certificate_number" TEXT,
    "humidity" DECIMAL(5,2) NOT NULL,
    "foreign_matter" DECIMAL(5,2) NOT NULL,
    "damaged_grains" DECIMAL(5,2) NOT NULL,
    "hectoliter_weight" DECIMAL(5,2),
    "protein" DECIMAL(5,2),
    "fat_content" DECIMAL(5,2),
    "broken_grains" DECIMAL(5,2),
    "green_grains" DECIMAL(5,2),
    "black_grains" DECIMAL(5,2),
    "panza_blanca" DECIMAL(5,2),
    "acidity" DECIMAL(5,2),
    "burned_grains" DECIMAL(5,2),
    "sprouted_grains" DECIMAL(5,2),
    "pest_damaged" DECIMAL(5,2),
    "live_insects" BOOLEAN NOT NULL DEFAULT false,
    "chamico_seeds_per_kg" INTEGER,
    "observations" TEXT,
    "certificate_pdf_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quality_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_results" (
    "id" TEXT NOT NULL,
    "analysis_id" TEXT NOT NULL,
    "ctg_entry_id" TEXT,
    "base_factor" DECIMAL(6,3) NOT NULL DEFAULT 100.000,
    "final_factor" DECIMAL(6,3) NOT NULL,
    "grade" TEXT,
    "grade_adjustment" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "worst_parameter" TEXT,
    "total_bonus" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "bonus_details" JSONB,
    "total_discount" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "discount_details" JSONB,
    "base_humidity" DECIMAL(5,2),
    "actual_humidity" DECIMAL(5,2),
    "drying_waste_pct" DECIMAL(6,3),
    "handling_waste_pct" DECIMAL(6,3),
    "total_waste_pct" DECIMAL(6,3),
    "waste_kg" DECIMAL(12,2),
    "requires_drying" BOOLEAN,
    "gross_quantity_kg" DECIMAL(12,2),
    "net_quantity_kg" DECIMAL(12,2),
    "base_price_per_ton" DECIMAL(12,2),
    "adjusted_price_per_ton" DECIMAL(12,2),
    "price_adjustment_pct" DECIMAL(6,3),
    "gross_amount" DECIMAL(15,2),
    "net_amount" DECIMAL(15,2),
    "out_of_standard" BOOLEAN NOT NULL DEFAULT false,
    "out_of_tolerance" BOOLEAN NOT NULL DEFAULT false,
    "warnings" JSONB,
    "calculation_version" TEXT,
    "calculation_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculation_steps" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quality_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moisture_waste_tables" (
    "id" TEXT NOT NULL,
    "grain_type" TEXT NOT NULL,
    "humidity" DECIMAL(5,2) NOT NULL,
    "waste_percent" DECIMAL(6,3) NOT NULL,
    "source" TEXT,
    "effective_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moisture_waste_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "user_id" TEXT,
    "user_email" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "notes" TEXT,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "signing_keys_status_idx" ON "signing_keys"("status");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "production_zones_user_id_idx" ON "production_zones"("user_id");

-- CreateIndex
CREATE INDEX "documents_user_id_idx" ON "documents"("user_id");

-- CreateIndex
CREATE INDEX "documents_ocr_status_idx" ON "documents"("ocr_status");

-- CreateIndex
CREATE UNIQUE INDEX "grain_stocks_production_zone_id_grain_type_campaign_key" ON "grain_stocks"("production_zone_id", "grain_type", "campaign");

-- CreateIndex
CREATE UNIQUE INDEX "companies_tax_id_key" ON "companies"("tax_id");

-- CreateIndex
CREATE INDEX "companies_tax_id_idx" ON "companies"("tax_id");

-- CreateIndex
CREATE INDEX "companies_active_idx" ON "companies"("active");

-- CreateIndex
CREATE UNIQUE INDEX "settlements_settlement_number_key" ON "settlements"("settlement_number");

-- CreateIndex
CREATE INDEX "settlements_company_id_idx" ON "settlements"("company_id");

-- CreateIndex
CREATE INDEX "settlements_settlement_number_idx" ON "settlements"("settlement_number");

-- CreateIndex
CREATE INDEX "settlements_settlement_date_idx" ON "settlements"("settlement_date");

-- CreateIndex
CREATE INDEX "settlements_grain_type_idx" ON "settlements"("grain_type");

-- CreateIndex
CREATE INDEX "settlements_status_idx" ON "settlements"("status");

-- CreateIndex
CREATE INDEX "ctg_entries_settlement_id_idx" ON "ctg_entries"("settlement_id");

-- CreateIndex
CREATE INDEX "ctg_entries_ctg_number_idx" ON "ctg_entries"("ctg_number");

-- CreateIndex
CREATE UNIQUE INDEX "ctg_entries_settlement_id_ctg_number_key" ON "ctg_entries"("settlement_id", "ctg_number");

-- CreateIndex
CREATE INDEX "quality_analyses_ctg_entry_id_idx" ON "quality_analyses"("ctg_entry_id");

-- CreateIndex
CREATE INDEX "quality_analyses_ctg_number_idx" ON "quality_analyses"("ctg_number");

-- CreateIndex
CREATE INDEX "quality_analyses_grain_type_idx" ON "quality_analyses"("grain_type");

-- CreateIndex
CREATE INDEX "quality_analyses_analysis_date_idx" ON "quality_analyses"("analysis_date");

-- CreateIndex
CREATE INDEX "quality_results_analysis_id_idx" ON "quality_results"("analysis_id");

-- CreateIndex
CREATE INDEX "quality_results_ctg_entry_id_idx" ON "quality_results"("ctg_entry_id");

-- CreateIndex
CREATE INDEX "quality_results_final_factor_idx" ON "quality_results"("final_factor");

-- CreateIndex
CREATE UNIQUE INDEX "quality_results_analysis_id_ctg_entry_id_key" ON "quality_results"("analysis_id", "ctg_entry_id");

-- CreateIndex
CREATE INDEX "moisture_waste_tables_grain_type_idx" ON "moisture_waste_tables"("grain_type");

-- CreateIndex
CREATE INDEX "moisture_waste_tables_humidity_idx" ON "moisture_waste_tables"("humidity");

-- CreateIndex
CREATE UNIQUE INDEX "moisture_waste_tables_grain_type_humidity_key" ON "moisture_waste_tables"("grain_type", "humidity");

-- CreateIndex
CREATE INDEX "audit_log_entity_type_entity_id_idx" ON "audit_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_log_user_id_idx" ON "audit_log"("user_id");

-- CreateIndex
CREATE INDEX "audit_log_timestamp_idx" ON "audit_log"("timestamp");

-- AddForeignKey
ALTER TABLE "production_zones" ADD CONSTRAINT "production_zones_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grain_stocks" ADD CONSTRAINT "grain_stocks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grain_stocks" ADD CONSTRAINT "grain_stocks_production_zone_id_fkey" FOREIGN KEY ("production_zone_id") REFERENCES "production_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ctg_entries" ADD CONSTRAINT "ctg_entries_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_analyses" ADD CONSTRAINT "quality_analyses_ctg_entry_id_fkey" FOREIGN KEY ("ctg_entry_id") REFERENCES "ctg_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_results" ADD CONSTRAINT "quality_results_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "quality_analyses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_results" ADD CONSTRAINT "quality_results_ctg_entry_id_fkey" FOREIGN KEY ("ctg_entry_id") REFERENCES "ctg_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
