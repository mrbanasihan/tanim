-- TANIM System Database Initialization Script
-- PostgreSQL Schema for Seed Management System with Kafka Integration
-- This file creates all tables, types, indexes, and initial system configuration

-- ============================================================================
-- DATABASE CREATION
-- ============================================================================

-- Create the main database
CREATE DATABASE tanim_db;

-- Connect to the new database
\c tanim_db

-- ============================================================================
-- CUSTOM TYPES (ENUMS)
-- ============================================================================

-- User roles for role-based access control
CREATE TYPE user_role AS ENUM ('admin', 'researcher', 'staff', 'guest');

-- Crop categories for organizing seeds
CREATE TYPE crop_group AS ENUM ('legumes', 'cereals', 'vegetables');

-- Specific crop types available in the system
CREATE TYPE crop_type AS ENUM (
    'soybean', 'mungbean', 'peanut',
    'yellow corn', 'white corn', 'glutinous',
    'alugbati', 'amaranth', 'ampalaya', 'bush sitao', 'cowpea',
    'cucumber', 'eggplant', 'hot pepper (pangsinigang)', 'hot pepper', 'okra',
    'patola', 'pole sitao', 'saluyot', 'squash', 'tomato', 'cherry tomato',
    'upo', 'winged bean', 'roselle'
);

-- Seed varieties for each crop type
CREATE TYPE variety AS ENUM (
    -- Soybean varieties
    'Tiwala 6', 'Tiwala 8', 'Tiwala 10', 'Tiwala 12', 'Tiwala 14',
    'Tiwala 20', 'Tiwala 22', 'Tiwala 24', 'Tiwala 26',
    'Select Tudela Black', 'Select Manchuria',
    -- Mungbean varieties
    'Pagasa 1', 'Pagasa 3', 'Pagasa 5', 'Pagasa 7', 'Pagasa 9',
    'Pagasa 11', 'Pagasa 15', 'PHL 14295', 'PHL 14296', 'PHL 12636',
    -- Peanut varieties
    'Biyaya 2', 'Biyaya 4', 'Biyaya 6', 'Biyaya 8', 'Biyaya 10',
    'Biyaya 12', 'Biyaya 14', 'Biyaya 16', 'Sibalom',
    -- Cereals varieties
    'IPB Var 9', 'IPB Var 11', 'IPB Var 13',
    'IPB Var 6', 'IPB Var 8', '1910', 'IPB Var DM1', 'LB Lagkitan',
    -- Vegetables varieties
    'Red', 'Green', 'Sta. Rita',
    'UPL BS3', 'BS 6', 'BS 7', 'BS 8', 'BS 9',
    'IT-82', 'CES 18-6',
    'CU-11-Bituin', 'Princesa', 'Urduja',
    'DLP', 'Mistisa', 'No Variety',
    'Smooth Green', 'Dilag', 'Talisay',
    'PS 1', 'PS 2', 'Tikagan', 'Maureen', 'Ilao', 'Generosa',
    'Sagisag 2',
    'Rizalina', 'Luisa', 'Sonrisa', 'Amour',
    'Rosanna', 'Rica', 'Lelen', 'Elpidia', 'Julita',
    'Kaisa1', 'Kaisa3', 'Kaisa5', 'Kaisa7',
    'Belle', 'Cherrys', 'Elmundo', 'Karla', 'Betty',
    'Tambuli', 'Leona', 'Gloria', 'Reina', 'Pasuquin'
);

-- Seed classification levels
CREATE TYPE classification AS ENUM ('nucleus', 'breeder', 'foundation', 'registered', 'certified', 'good seed');

-- Transaction types for seed movements
CREATE TYPE transaction_type AS ENUM ('outgoing', 'disposal');

-- Audit log action types
CREATE TYPE action_type AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT');

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- User accounts with authentication
CREATE TABLE "user" (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'guest',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User-crop group assignments for role-based access
CREATE TABLE user_crop_group (
    user_id UUID REFERENCES "user"(user_id) ON DELETE CASCADE,
    crop_group crop_group NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, crop_group)
);

-- Research projects organizing seed lots
CREATE TABLE project (
    project_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_name VARCHAR(255) NOT NULL,
    project_code VARCHAR(50),
    description TEXT,
    start_date DATE,
    end_date DATE,
    created_by UUID REFERENCES "user"(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project-crop group relationships
CREATE TABLE project_crop_group (
    project_id UUID REFERENCES project(project_id) ON DELETE CASCADE,
    crop_group crop_group NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (project_id, crop_group)
);

-- Seed lot inventory records
CREATE TABLE seed_lot (
    seed_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES project(project_id) ON DELETE SET NULL,
    batch_name VARCHAR(255) NOT NULL,
    crop_type crop_type NOT NULL,
    variety variety NOT NULL,
    classification classification NOT NULL,
    moisture_content DECIMAL(5, 2),
    gross_weight DECIMAL(10, 2) NOT NULL,
    cleaned_quantity DECIMAL(10, 2),
    current_quantity DECIMAL(10, 2) NOT NULL,
    date_received DATE,
    area_planted VARCHAR(255),
    remarks TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES "user"(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed checkout and disposal transactions
CREATE TABLE transaction (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seed_id UUID REFERENCES seed_lot(seed_id) ON DELETE CASCADE,
    user_id UUID REFERENCES "user"(user_id) ON DELETE SET NULL,
    transaction_type transaction_type NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL CHECK (quantity > 0),
    balance_after DECIMAL(10, 2) NOT NULL,
    recipient VARCHAR(255),
    purpose VARCHAR(255),
    affiliation VARCHAR(255),
    contact VARCHAR(100),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Germination test records
CREATE TABLE germination_record (
    germination_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seed_id UUID NOT NULL REFERENCES seed_lot(seed_id) ON DELETE CASCADE,
    germination_rate FLOAT NOT NULL CHECK (germination_rate >= 0 AND germination_rate <= 100),
    next_germination_date DATE,
    created_by UUID REFERENCES "user"(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User notifications
CREATE TABLE notification (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    seed_id UUID REFERENCES seed_lot(seed_id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification event log
CREATE TABLE notification_log (
    notification_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_type VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES "user"(user_id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User session management
CREATE TABLE user_session (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES "user"(user_id) ON DELETE CASCADE,
    token VARCHAR(512) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- AUDIT TRAIL TABLE
-- ============================================================================

-- System audit trail
CREATE TABLE audit_log (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type action_type NOT NULL,
    actor VARCHAR(255) NOT NULL,
    payload JSONB,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- STORAGE MANAGEMENT TABLES
-- ============================================================================

-- Storage room configurations
CREATE TABLE room (
    room_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_name VARCHAR(255) NOT NULL,
    building_location VARCHAR(255),
    optimal_temp DECIMAL(5, 2),
    temp_start DECIMAL(5, 2),
    temp_end DECIMAL(5, 2),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- User lookups
CREATE INDEX idx_user_email ON "user"(email);
CREATE INDEX idx_user_role ON "user"(role);

-- Seed lot searches
CREATE INDEX idx_seed_lot_project ON seed_lot(project_id);
CREATE INDEX idx_seed_lot_crop_type ON seed_lot(crop_type);
CREATE INDEX idx_seed_lot_variety ON seed_lot(variety);
CREATE INDEX idx_seed_lot_created_at ON seed_lot(created_at);

-- Project queries
CREATE INDEX idx_project_crop_group_group ON project_crop_group(crop_group);

-- Transaction queries
CREATE INDEX idx_transaction_seed ON transaction(seed_id);
CREATE INDEX idx_transaction_user ON transaction(user_id);
CREATE INDEX idx_transaction_created ON transaction(created_at);
CREATE INDEX idx_transaction_seed_id ON transaction(seed_id);
CREATE INDEX idx_transaction_created_at ON transaction(created_at);

-- Session management
CREATE INDEX idx_user_session_token ON user_session(token);
CREATE INDEX idx_user_session_user ON user_session(user_id);
CREATE INDEX idx_user_session_expires_at ON user_session(expires_at);

-- Audit trail
CREATE INDEX idx_audit_log_actor ON audit_log(actor);
CREATE INDEX idx_audit_log_logged_at ON audit_log(logged_at);

-- ============================================================================
-- INITIALIZATION COMPLETE
-- ============================================================================

-- Schema is now ready for data population
-- Run seed_dummy_data.sql next to populate test data
