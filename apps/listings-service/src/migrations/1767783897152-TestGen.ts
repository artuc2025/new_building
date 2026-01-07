import { MigrationInterface, QueryRunner } from "typeorm";

export class TestGen1767783897152 implements MigrationInterface {
    name = 'TestGen1767783897152'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "listings"."regions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" jsonb NOT NULL, "parent_region_id" uuid, "region_type" character varying(50) NOT NULL, "boundary" geography(Polygon,4326), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_4fcd12ed6a046276e2deb08801c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "listings"."developers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" jsonb NOT NULL, "description" jsonb, "logo_media_id" uuid, "website_url" character varying(500), "email" character varying(255), "phone" character varying(50), "address" jsonb, "established_year" integer, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_247719240b950bd26dec14bdd21" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "listings"."buildings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" jsonb NOT NULL, "description" jsonb, "address" jsonb NOT NULL, "location" geography(Point,4326) NOT NULL, "address_line_1" character varying(255), "address_line_2" character varying(255), "city" character varying(100) NOT NULL DEFAULT 'Yerevan', "postal_code" character varying(20), "floors" integer NOT NULL, "total_units" integer, "commissioning_date" date, "construction_status" character varying(50), "price_per_m2_min" numeric(12,2), "price_per_m2_max" numeric(12,2), "area_min" numeric(8,2) NOT NULL, "area_max" numeric(8,2) NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'AMD', "developer_id" uuid NOT NULL, "region_id" uuid NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'draft', "is_featured" boolean DEFAULT false, "developer_website_url" character varying(500), "developer_facebook_url" character varying(500), "developer_instagram_url" character varying(500), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "published_at" TIMESTAMP WITH TIME ZONE, "created_by" uuid, "search_vector" tsvector, CONSTRAINT "PK_bc65c1acce268c383e41a69003a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "listings"."pricing_snapshots" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "building_id" uuid NOT NULL, "price_per_m2_min" numeric(12,2) NOT NULL, "price_per_m2_max" numeric(12,2) NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'AMD', "area_min" numeric(8,2), "area_max" numeric(8,2), "snapshot_date" date NOT NULL DEFAULT ('now'::text)::date, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_9c053ee41d36bed1c22d5e8cdd4" UNIQUE ("building_id", "snapshot_date"), CONSTRAINT "PK_6294de838cd05201f5e79a9f3b7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "listings"."building_submissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" jsonb, "address" jsonb, "location" geography(Point,4326), "developer_name" character varying(255), "contact_email" character varying(255), "contact_phone" character varying(50), "notes" text, "status" character varying(20) NOT NULL DEFAULT 'pending', "converted_to_building_id" uuid, "submitted_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "reviewed_at" TIMESTAMP WITH TIME ZONE, "reviewed_by" uuid, CONSTRAINT "PK_70f5206d2894d6387e88dcab25c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "listings"."building_images" ("building_id" uuid NOT NULL, "media_id" uuid NOT NULL, "display_order" integer NOT NULL DEFAULT '0', "is_primary" boolean DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c4cd5729265585790f2089514b0" PRIMARY KEY ("building_id", "media_id"))`);
        await queryRunner.query(`ALTER TABLE "listings"."regions" ADD CONSTRAINT "FK_26fd3475b73815de7715bd07194" FOREIGN KEY ("parent_region_id") REFERENCES "listings"."regions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "listings"."buildings" ADD CONSTRAINT "FK_6a0ef85e0c49cbdd15e8e05f532" FOREIGN KEY ("developer_id") REFERENCES "listings"."developers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "listings"."buildings" ADD CONSTRAINT "FK_9b23ecc33732ca40991027bee06" FOREIGN KEY ("region_id") REFERENCES "listings"."regions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "listings"."pricing_snapshots" ADD CONSTRAINT "FK_3395020b14804b7529641e06fb9" FOREIGN KEY ("building_id") REFERENCES "listings"."buildings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "listings"."building_submissions" ADD CONSTRAINT "FK_0711d85c8f606baf5be5c182a5c" FOREIGN KEY ("converted_to_building_id") REFERENCES "listings"."buildings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "listings"."building_images" ADD CONSTRAINT "FK_8fb619d5d7272b3c5c0d84bdda8" FOREIGN KEY ("building_id") REFERENCES "listings"."buildings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "listings"."building_images" DROP CONSTRAINT "FK_8fb619d5d7272b3c5c0d84bdda8"`);
        await queryRunner.query(`ALTER TABLE "listings"."building_submissions" DROP CONSTRAINT "FK_0711d85c8f606baf5be5c182a5c"`);
        await queryRunner.query(`ALTER TABLE "listings"."pricing_snapshots" DROP CONSTRAINT "FK_3395020b14804b7529641e06fb9"`);
        await queryRunner.query(`ALTER TABLE "listings"."buildings" DROP CONSTRAINT "FK_9b23ecc33732ca40991027bee06"`);
        await queryRunner.query(`ALTER TABLE "listings"."buildings" DROP CONSTRAINT "FK_6a0ef85e0c49cbdd15e8e05f532"`);
        await queryRunner.query(`ALTER TABLE "listings"."regions" DROP CONSTRAINT "FK_26fd3475b73815de7715bd07194"`);
        await queryRunner.query(`DROP TABLE "listings"."building_images"`);
        await queryRunner.query(`DROP TABLE "listings"."building_submissions"`);
        await queryRunner.query(`DROP TABLE "listings"."pricing_snapshots"`);
        await queryRunner.query(`DROP TABLE "listings"."buildings"`);
        await queryRunner.query(`DROP TABLE "listings"."developers"`);
        await queryRunner.query(`DROP TABLE "listings"."regions"`);
    }

}
