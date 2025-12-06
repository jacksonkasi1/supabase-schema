CREATE TABLE "tbl_organizations"(
    "id" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL DEFAULT 'a2z-cars',
    "org_name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    "updated_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL
);
ALTER TABLE
    "tbl_organizations" ADD PRIMARY KEY("id");
ALTER TABLE
    "tbl_organizations" ADD CONSTRAINT "tbl_organizations_slug_unique" UNIQUE("slug");
COMMENT
ON COLUMN
    "tbl_organizations"."org_name" IS 'A2Z';
CREATE TABLE "tbl_customers"(
    "id" UUID NOT NULL DEFAULT 'UUID',
    "full_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" BIGINT NOT NULL,
    "dob" DATE NOT NULL,
    "gender" VARCHAR(255) CHECK
        (
            "gender" IN('Male', 'Female', 'Non-binary')
        ) NOT NULL,
        "email_reminder_on" BOOLEAN NOT NULL DEFAULT '0',
        "app_notification_on" BOOLEAN NOT NULL DEFAULT '1',
        "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
        "updated_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL
);
ALTER TABLE
    "tbl_customers" ADD PRIMARY KEY("id");
ALTER TABLE
    "tbl_customers" ADD CONSTRAINT "tbl_customers_email_unique" UNIQUE("email");
CREATE TABLE "tbl_admins"(
    "id" VARCHAR(255) NOT NULL,
    "org_id" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(255) NOT NULL,
    "last_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    "updated_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL
);
ALTER TABLE
    "tbl_admins" ADD PRIMARY KEY("id");
CREATE TABLE "tbl_car_models"(
    "id" SERIAL NOT NULL,
    "image" VARCHAR(255) NULL,
    "car_type" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    "updated_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL
);
ALTER TABLE
    "tbl_car_models" ADD PRIMARY KEY("id");
COMMENT
ON COLUMN
    "tbl_car_models"."car_type" IS 'Example: ''Sedan'', ''SUV'', etc.';
CREATE TABLE "tbl_customer_vehicles"(
    "id" SERIAL NOT NULL,
    "customer_id" VARCHAR(255) NOT NULL,
    "model_id" INTEGER NOT NULL,
    "brand" VARCHAR(255) NOT NULL,
    "modal" VARCHAR(255) NOT NULL,
    "year" INTEGER NOT NULL,
    "fuel_type" VARCHAR(255) NOT NULL,
    "color" TEXT NOT NULL,
    "number_plate" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    "updated_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL
);
ALTER TABLE
    "tbl_customer_vehicles" ADD PRIMARY KEY("id");
CREATE TABLE "tbl_services"(
    "id" SERIAL NOT NULL,
    "org_id" VARCHAR(255) NOT NULL,
    "image" TEXT NOT NULL,
    "service_name" VARCHAR(255) NOT NULL,
    "service_description" TEXT NULL,
    "price" FLOAT(53) NULL,
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    "updated_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL
);
ALTER TABLE
    "tbl_services" ADD PRIMARY KEY("id");
CREATE TABLE "tbl_org_customers"(
    "id" BIGINT NOT NULL,
    "customer_id" VARCHAR(255) NOT NULL,
    "org_id" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(255) NOT NULL,
    "dob" DATE NOT NULL,
    "gender" VARCHAR(255) CHECK
        (
            "gender" IN('Male', 'Female', 'Non-binary')
        ) NOT NULL,
        "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
        "updated_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL
);
ALTER TABLE
    "tbl_org_customers" ADD PRIMARY KEY("id");
CREATE TABLE "tbl_orders"(
    "id" SERIAL NOT NULL,
    "org_id" VARCHAR(255) NOT NULL,
    "customer_id" VARCHAR(255) NOT NULL,
    "vehicle_id" BIGINT NULL,
    "services_ids" JSON NULL,
    "odometer_reading" INTEGER NOT NULL,
    "service_date_time" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    "status" VARCHAR(255) CHECK
        (
            "status" IN(
                'Requested',
                'Ongoing',
                'Completed',
                'Cancelled'
            )
        ) NOT NULL,
        "internal_order_status" VARCHAR(255)
    CHECK
        (
            "internal_order_status" IN(
                'REQUESTED',
                'ACCEPTED',
                'CAR_RECEIVED_AT_CENTRE',
                'SERVICE_IN_PROGRESS',
                'QUALITY_CHECK',
                'SERVICE_COMPLETED',
                'CAR_READY_FOR_PICKUP',
                'COMPLETED',
                'SEND_NOTIFICATION'
            )
        ) NOT NULL,
        "issue_description" TEXT NOT NULL,
        "images" JSON NOT NULL,
        "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
        "updated_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
        "new_column" BIGINT NOT NULL
);
ALTER TABLE
    "tbl_orders" ADD PRIMARY KEY("id");
COMMENT
ON COLUMN
    "tbl_orders"."services_ids" IS 'It''s Array. Not JSON. Contains tbl_services ids';
COMMENT
ON COLUMN
    "tbl_orders"."images" IS 'Array of String.';
CREATE TABLE "tbl_customer_notifications"(
    "id" SERIAL NOT NULL,
    "customer_id" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "type" VARCHAR(255) CHECK
        ("type" IN('')) NOT NULL,
        "status" VARCHAR(255)
    CHECK
        ("status" IN('Sent', 'Read')) NOT NULL DEFAULT 'Sent',
        "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
        "updated_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL
);
ALTER TABLE
    "tbl_customer_notifications" ADD PRIMARY KEY("id");
COMMENT
ON COLUMN
    "tbl_customer_notifications"."type" IS 'SERVICE_UPDATE,
BOOKING_CONFIRMATION,
PROMOTIONAL_OFFER,
APPOINTMENT_REMINDER,
SERVICE_FEEDBACK_REQUEST,
GENERAL_ANNOUNCEMENT,
PAYMENT_CONFIRMATION,
PAYMENT_REMINDER,
CANCELLATION_NOTICE,
PROFILE_UPDATE,
NEW_MESSAGE,
SYSTEM_ALERT,
ORDER_STATUS,
PICKUP_SCHEDULED,
DOCUMENT_UPDATE';
CREATE TABLE "tbl_customer_order_tracks"(
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "customer_id" VARCHAR(255) NOT NULL,
    "status" VARCHAR(255) CHECK
        (
            "status" IN(
                'ORDER_PLACED',
                'CAR_RECEIVED_AT_CENTRE',
                'SERVICE_IN_PROGRESS',
                'QUALITY_CHECK',
                'SERVICE_COMPLETED',
                'CAR_READY_FOR_PICKUP',
                'COMPLETED',
                ''
            )
        ) NOT NULL,
        "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
        "updated_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL
);
ALTER TABLE
    "tbl_customer_order_tracks" ADD PRIMARY KEY("id");
COMMENT
ON COLUMN
    "tbl_customer_order_tracks"."status" IS 'ORDER_PLACED';
CREATE TABLE "tbl_invoices"(
    "id" SERIAL NOT NULL,
    "org_id" VARCHAR(255) NOT NULL,
    "order_id" INTEGER NOT NULL,
    "customer_id" VARCHAR(255) NOT NULL,
    "currency" VARCHAR(255) NOT NULL DEFAULT 'INR',
    "amount" FLOAT(53) NOT NULL,
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    "updated_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL
);
ALTER TABLE
    "tbl_invoices" ADD PRIMARY KEY("id");
ALTER TABLE
    "tbl_invoices" ADD CONSTRAINT "tbl_invoices_org_id_foreign" FOREIGN KEY("org_id") REFERENCES "tbl_organizations"("id");
ALTER TABLE
    "tbl_admins" ADD CONSTRAINT "tbl_admins_org_id_foreign" FOREIGN KEY("org_id") REFERENCES "tbl_organizations"("id");
ALTER TABLE
    "tbl_customer_vehicles" ADD CONSTRAINT "tbl_customer_vehicles_customer_id_foreign" FOREIGN KEY("customer_id") REFERENCES "tbl_customers"("id");
ALTER TABLE
    "tbl_customer_order_tracks" ADD CONSTRAINT "tbl_customer_order_tracks_customer_id_foreign" FOREIGN KEY("customer_id") REFERENCES "tbl_customers"("id");
ALTER TABLE
    "tbl_orders" ADD CONSTRAINT "tbl_orders_org_id_foreign" FOREIGN KEY("org_id") REFERENCES "tbl_organizations"("id");
ALTER TABLE
    "tbl_orders" ADD CONSTRAINT "tbl_orders_customer_id_foreign" FOREIGN KEY("customer_id") REFERENCES "tbl_customers"("id");
ALTER TABLE
    "tbl_customer_order_tracks" ADD CONSTRAINT "tbl_customer_order_tracks_order_id_foreign" FOREIGN KEY("order_id") REFERENCES "tbl_orders"("id");
ALTER TABLE
    "tbl_services" ADD CONSTRAINT "tbl_services_org_id_foreign" FOREIGN KEY("org_id") REFERENCES "tbl_organizations"("id");
ALTER TABLE
    "tbl_invoices" ADD CONSTRAINT "tbl_invoices_order_id_foreign" FOREIGN KEY("order_id") REFERENCES "tbl_orders"("id");
ALTER TABLE
    "tbl_customer_vehicles" ADD CONSTRAINT "tbl_customer_vehicles_model_id_foreign" FOREIGN KEY("model_id") REFERENCES "tbl_car_models"("id");
ALTER TABLE
    "tbl_org_customers" ADD CONSTRAINT "tbl_org_customers_org_id_foreign" FOREIGN KEY("org_id") REFERENCES "tbl_organizations"("id");
ALTER TABLE
    "tbl_orders" ADD CONSTRAINT "tbl_orders_vehicle_id_foreign" FOREIGN KEY("vehicle_id") REFERENCES "tbl_customer_vehicles"("id");
ALTER TABLE
    "tbl_customer_notifications" ADD CONSTRAINT "tbl_customer_notifications_customer_id_foreign" FOREIGN KEY("customer_id") REFERENCES "tbl_customers"("id");
