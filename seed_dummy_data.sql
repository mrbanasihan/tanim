-- ============================================================================
-- TANIM System - Seed Dummy Data Script
-- Core tables only: users, projects, seed lots, transactions, germination, notifications
-- No Kafka, no temperature/sensor tables
-- Idempotent: Can be run multiple times without errors
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. USERS (insert only if they don't exist)
-- ----------------------------------------------------------------------------

INSERT INTO "user" (user_id, email, password, first_name, last_name, role, is_active)
SELECT * FROM (VALUES
    ('11111111-1111-4111-8111-111111111111'::UUID, 'admin@tanim.com'::VARCHAR, '$2b$10$hfuHe3RNVD7Mga.ZFhKB4.9Zy4TwukLx7V0zXgjhXyosRM6SGkMmi'::VARCHAR, 'Admin'::VARCHAR, 'User'::VARCHAR, 'admin'::user_role, true),
    ('22222222-2222-4222-8222-222222222222'::UUID, 'researcher@tanim.com'::VARCHAR, '$2b$10$hfuHe3RNVD7Mga.ZFhKB4.9Zy4TwukLx7V0zXgjhXyosRM6SGkMmi'::VARCHAR, 'Researcher'::VARCHAR, 'User'::VARCHAR, 'researcher'::user_role, true),
    ('33333333-3333-4333-8333-333333333333'::UUID, 'staff@tanim.com'::VARCHAR, '$2b$10$hfuHe3RNVD7Mga.ZFhKB4.9Zy4TwukLx7V0zXgjhXyosRM6SGkMmi'::VARCHAR, 'Staff'::VARCHAR, 'User'::VARCHAR, 'staff'::user_role, true),
    ('44444444-4444-4444-8444-444444444444'::UUID, 'guest@tanim.com'::VARCHAR, '$2b$10$hfuHe3RNVD7Mga.ZFhKB4.9Zy4TwukLx7V0zXgjhXyosRM6SGkMmi'::VARCHAR, 'Guest'::VARCHAR, 'User'::VARCHAR, 'guest'::user_role, true)
) AS v(user_id, email, password, first_name, last_name, role, is_active)
WHERE NOT EXISTS (SELECT 1 FROM "user" WHERE email = v.email);

-- ----------------------------------------------------------------------------
-- 2. USER CROP GROUPS
-- ----------------------------------------------------------------------------

INSERT INTO user_crop_group (user_id, crop_group)
SELECT * FROM (VALUES
    ('22222222-2222-4222-8222-222222222222'::UUID, 'legumes'::crop_group),
    ('22222222-2222-4222-8222-222222222222'::UUID, 'cereals'::crop_group),
    ('22222222-2222-4222-8222-222222222222'::UUID, 'vegetables'::crop_group),
    ('33333333-3333-4333-8333-333333333333'::UUID, 'legumes'::crop_group),
    ('33333333-3333-4333-8333-333333333333'::UUID, 'cereals'::crop_group),
    ('33333333-3333-4333-8333-333333333333'::UUID, 'vegetables'::crop_group),
    ('44444444-4444-4444-8444-444444444444'::UUID, 'legumes'::crop_group),
    ('44444444-4444-4444-8444-444444444444'::UUID, 'cereals'::crop_group),
    ('44444444-4444-4444-8444-444444444444'::UUID, 'vegetables'::crop_group)
) AS v(user_id, crop_group)
WHERE EXISTS (SELECT 1 FROM "user" WHERE user_id = v.user_id)
ON CONFLICT (user_id, crop_group) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. PROJECTS
-- ----------------------------------------------------------------------------

DO $$
DECLARE
    admin_id UUID;
BEGIN
    SELECT user_id INTO admin_id FROM "user" WHERE email = 'admin@tanim.com' LIMIT 1;
    
    IF admin_id IS NOT NULL THEN
        INSERT INTO project (project_id, project_name, project_code, description, start_date, end_date, created_by) VALUES
            ('aaaa0001-0000-4000-8000-000000000001'::UUID, 'Seed Storage Improvement 2026', 'SSI26', 'Improve storage monitoring and stock handling for institute seed lots.', '2026-01-15', '2026-12-31', admin_id),
            ('aaaa0002-0000-4000-8000-000000000002'::UUID, 'Mungbean Breeding Program 2026', 'MBP26', 'Advance mungbean variety development and germination quality tracking.', '2026-02-01', '2026-11-30', admin_id),
            ('aaaa0003-0000-4000-8000-000000000003'::UUID, 'Peanut Seed Quality Initiative', 'PSQI26', 'Evaluate handling, withdrawal, and disposal workflow for peanut stocks.', '2026-03-01', '2026-12-15', admin_id)
        ON CONFLICT (project_id) DO NOTHING;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. PROJECT CROP GROUPS
-- ----------------------------------------------------------------------------

INSERT INTO project_crop_group (project_id, crop_group)
SELECT * FROM (VALUES
    ('aaaa0001-0000-4000-8000-000000000001'::UUID, 'legumes'::crop_group),
    ('aaaa0001-0000-4000-8000-000000000001'::UUID, 'cereals'::crop_group),
    ('aaaa0001-0000-4000-8000-000000000001'::UUID, 'vegetables'::crop_group),
    ('aaaa0002-0000-4000-8000-000000000002'::UUID, 'legumes'::crop_group),
    ('aaaa0003-0000-4000-8000-000000000003'::UUID, 'legumes'::crop_group)
) AS v(project_id, crop_group)
WHERE EXISTS (SELECT 1 FROM project WHERE project_id = v.project_id)
ON CONFLICT (project_id, crop_group) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. ROOMS
-- ----------------------------------------------------------------------------

INSERT INTO room (room_id, room_name, building_location, optimal_temp, temp_start, temp_end) VALUES
    ('90000000-0000-4000-8000-000000000001'::UUID, 'Seed Storage Room A', 'Building 1, Ground Floor', 15.00, 10.00, 20.00),
    ('90000000-0000-4000-8000-000000000002'::UUID, 'Seed Storage Room B', 'Building 1, Second Floor', 16.00, 11.00, 21.00),
    ('90000000-0000-4000-8000-000000000003'::UUID, 'Cold Storage Vault', 'Building 1, Basement', 4.00, 2.00, 8.00),
    ('90000000-0000-4000-8000-000000000004'::UUID, 'Drying Room', 'Building 2, Ground Floor', 35.00, 30.00, 40.00),
    ('90000000-0000-4000-8000-000000000005'::UUID, 'Quarantine Room', 'Building 3, Room 105', 18.00, 15.00, 22.00)
ON CONFLICT (room_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. SEED LOTS (15 lots: 4 soybean, 8 mungbean, 3 peanut)
-- ----------------------------------------------------------------------------

DO $$
DECLARE
    admin_id UUID;
BEGIN
    SELECT user_id INTO admin_id FROM "user" WHERE email = 'admin@tanim.com' LIMIT 1;
    
    IF admin_id IS NOT NULL THEN
        INSERT INTO seed_lot (
            seed_id, project_id, batch_name, crop_type, variety, classification,
            gross_weight, cleaned_quantity, current_quantity, date_received,
            remarks, is_active, created_by
        ) VALUES
            -- Soybean (4)
            ('50000001-0000-4000-8000-000000000001'::UUID, 'aaaa0001-0000-4000-8000-000000000001'::UUID, '2026-04-SSI26-soybean-Tiwala 6', 'soybean'::crop_type, 'Tiwala 6'::variety, 'nucleus'::classification, 10.00, 9.50, 9.50, '2026-04-01', 'Soybean Tiwala 6 - Nucleus seed', true, admin_id),
            ('50000001-0000-4000-8000-000000000002'::UUID, 'aaaa0001-0000-4000-8000-000000000001'::UUID, '2026-04-SSI26-soybean-Tiwala 8', 'soybean'::crop_type, 'Tiwala 8'::variety, 'breeder'::classification, 12.00, 11.00, 11.00, '2026-04-02', 'Soybean Tiwala 8 - Breeder seed', true, admin_id),
            ('50000001-0000-4000-8000-000000000003'::UUID, 'aaaa0001-0000-4000-8000-000000000001'::UUID, '2026-04-SSI26-soybean-Tiwala 10', 'soybean'::crop_type, 'Tiwala 10'::variety, 'foundation'::classification, 8.00, 7.30, 7.30, '2026-04-03', 'Soybean Tiwala 10 - Foundation seed', true, admin_id),
            ('50000001-0000-4000-8000-000000000004'::UUID, 'aaaa0001-0000-4000-8000-000000000001'::UUID, '2026-04-SSI26-soybean-Tiwala 12', 'soybean'::crop_type, 'Tiwala 12'::variety, 'registered'::classification, 15.00, 13.50, 13.50, '2026-04-04', 'Soybean Tiwala 12 - Registered seed', true, admin_id),
            -- Mungbean (8)
            ('50000002-0000-4000-8000-000000000001'::UUID, 'aaaa0002-0000-4000-8000-000000000002'::UUID, '2026-04-MBP26-mungbean-Pagasa 1', 'mungbean'::crop_type, 'Pagasa 1'::variety, 'nucleus'::classification, 9.00, 8.20, 8.20, '2026-04-05', 'Mungbean Pagasa 1 - Nucleus seed', true, admin_id),
            ('50000002-0000-4000-8000-000000000002'::UUID, 'aaaa0002-0000-4000-8000-000000000002'::UUID, '2026-04-MBP26-mungbean-Pagasa 3', 'mungbean'::crop_type, 'Pagasa 3'::variety, 'breeder'::classification, 11.00, 10.10, 10.10, '2026-04-06', 'Mungbean Pagasa 3 - Breeder seed', true, admin_id),
            ('50000002-0000-4000-8000-000000000003'::UUID, 'aaaa0002-0000-4000-8000-000000000002'::UUID, '2026-04-MBP26-mungbean-Pagasa 5', 'mungbean'::crop_type, 'Pagasa 5'::variety, 'foundation'::classification, 10.00, 9.20, 9.20, '2026-04-07', 'Mungbean Pagasa 5 - Foundation seed', true, admin_id),
            ('50000002-0000-4000-8000-000000000004'::UUID, 'aaaa0002-0000-4000-8000-000000000002'::UUID, '2026-04-MBP26-mungbean-Pagasa 7', 'mungbean'::crop_type, 'Pagasa 7'::variety, 'registered'::classification, 8.50, 7.80, 7.80, '2026-04-08', 'Mungbean Pagasa 7 - Registered seed', true, admin_id),
            ('50000002-0000-4000-8000-000000000005'::UUID, 'aaaa0002-0000-4000-8000-000000000002'::UUID, '2026-04-MBP26-mungbean-Pagasa 9', 'mungbean'::crop_type, 'Pagasa 9'::variety, 'certified'::classification, 12.50, 11.40, 11.40, '2026-04-09', 'Mungbean Pagasa 9 - Certified seed', true, admin_id),
            ('50000002-0000-4000-8000-000000000006'::UUID, 'aaaa0002-0000-4000-8000-000000000002'::UUID, '2026-04-MBP26-mungbean-Pagasa 11', 'mungbean'::crop_type, 'Pagasa 11'::variety, 'good seed'::classification, 7.00, 6.50, 6.50, '2026-04-10', 'Mungbean Pagasa 11 - Good seed', true, admin_id),
            ('50000002-0000-4000-8000-000000000007'::UUID, 'aaaa0002-0000-4000-8000-000000000002'::UUID, '2026-04-MBP26-mungbean-Pagasa 15', 'mungbean'::crop_type, 'Pagasa 15'::variety, 'breeder'::classification, 13.00, 12.10, 12.10, '2026-04-11', 'Mungbean Pagasa 15 - Breeder seed', true, admin_id),
            ('50000002-0000-4000-8000-000000000008'::UUID, 'aaaa0002-0000-4000-8000-000000000002'::UUID, '2026-04-MBP26-mungbean-PHL 14295', 'mungbean'::crop_type, 'PHL 14295'::variety, 'foundation'::classification, 9.20, 8.40, 8.40, '2026-04-12', 'Mungbean PHL 14295 - Foundation seed', true, admin_id),
            -- Peanut (3)
            ('50000003-0000-4000-8000-000000000001'::UUID, 'aaaa0003-0000-4000-8000-000000000003'::UUID, '2026-04-PSQI26-peanut-Biyaya 2', 'peanut'::crop_type, 'Biyaya 2'::variety, 'nucleus'::classification, 14.00, 13.00, 13.00, '2026-04-13', 'Peanut Biyaya 2 - Nucleus seed', true, admin_id),
            ('50000003-0000-4000-8000-000000000002'::UUID, 'aaaa0003-0000-4000-8000-000000000003'::UUID, '2026-04-PSQI26-peanut-Biyaya 4', 'peanut'::crop_type, 'Biyaya 4'::variety, 'registered'::classification, 10.50, 9.90, 9.90, '2026-04-14', 'Peanut Biyaya 4 - Registered seed', true, admin_id),
            ('50000003-0000-4000-8000-000000000003'::UUID, 'aaaa0003-0000-4000-8000-000000000003'::UUID, '2026-04-PSQI26-peanut-Sibalom', 'peanut'::crop_type, 'Sibalom'::variety, 'certified'::classification, 11.30, 10.60, 10.60, '2026-04-15', 'Peanut Sibalom - Certified seed', true, admin_id)
        ON CONFLICT (seed_id) DO NOTHING;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7. TRANSACTIONS (2 per seed lot)
-- ----------------------------------------------------------------------------

DO $$
DECLARE
    seed_record RECORD;
    admin_id UUID;
BEGIN
    SELECT user_id INTO admin_id FROM "user" WHERE email = 'admin@tanim.com' LIMIT 1;
    
    IF admin_id IS NOT NULL THEN
        FOR seed_record IN SELECT seed_id, current_quantity FROM seed_lot WHERE is_active = true
        LOOP
            INSERT INTO transaction (
                transaction_id, seed_id, user_id, transaction_type, quantity,
                balance_after, recipient, purpose, affiliation, contact, remarks, created_at
            ) VALUES (
                gen_random_uuid(),
                seed_record.seed_id,
                admin_id,
                'outgoing'::transaction_type,
                0.20,
                seed_record.current_quantity - 0.20,
                'QA Recipient A',
                'Initial checkout #1',
                'Institute QA',
                '09170000001',
                'seed-init-checkout-1',
                NOW()
            ) ON CONFLICT DO NOTHING;

            INSERT INTO transaction (
                transaction_id, seed_id, user_id, transaction_type, quantity,
                balance_after, recipient, purpose, affiliation, contact, remarks, created_at
            ) VALUES (
                gen_random_uuid(),
                seed_record.seed_id,
                admin_id,
                'outgoing'::transaction_type,
                0.30,
                seed_record.current_quantity - 0.50,
                'QA Recipient B',
                'Initial checkout #2',
                'Institute QA',
                '09170000002',
                'seed-init-checkout-2',
                NOW()
            ) ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 8. GERMINATION RECORDS (1 per seed lot)
-- ----------------------------------------------------------------------------

DO $$
DECLARE
    seed_record RECORD;
    researcher_id UUID;
BEGIN
    SELECT user_id INTO researcher_id FROM "user" WHERE email = 'researcher@tanim.com' LIMIT 1;
    
    IF researcher_id IS NULL THEN
        SELECT user_id INTO researcher_id FROM "user" WHERE role = 'admin' LIMIT 1;
    END IF;

    IF researcher_id IS NOT NULL THEN
        FOR seed_record IN SELECT seed_id, crop_type FROM seed_lot WHERE is_active = true
        LOOP
            INSERT INTO germination_record (
                germination_id, seed_id, germination_rate, next_germination_date,
                created_by, created_at
            ) VALUES (
                gen_random_uuid(),
                seed_record.seed_id,
                CASE
                    WHEN seed_record.crop_type = 'soybean'::crop_type THEN 91.5
                    WHEN seed_record.crop_type = 'mungbean'::crop_type THEN 89.0
                    ELSE 87.5
                END,
                CURRENT_DATE + INTERVAL '30 days',
                researcher_id,
                NOW()
            ) ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 9. NOTIFICATIONS
-- ----------------------------------------------------------------------------

DO $$
DECLARE
    admin_id UUID;
    researcher_id UUID;
    staff_id UUID;
BEGIN
    SELECT user_id INTO admin_id FROM "user" WHERE email = 'admin@tanim.com' LIMIT 1;
    SELECT user_id INTO researcher_id FROM "user" WHERE email = 'researcher@tanim.com' LIMIT 1;
    SELECT user_id INTO staff_id FROM "user" WHERE email = 'staff@tanim.com' LIMIT 1;
    
    INSERT INTO notification (notification_id, user_id, notification_type, message, seed_id, is_read, created_at)
    SELECT * FROM (VALUES
        (gen_random_uuid(), admin_id, 'system', 'Initial system setup completed.', '50000001-0000-4000-8000-000000000001'::UUID, false, NOW()),
        (gen_random_uuid(), researcher_id, 'germination', 'Initial germination schedule loaded.', '50000002-0000-4000-8000-000000000001'::UUID, false, NOW()),
        (gen_random_uuid(), staff_id, 'inventory', 'Initial checkout transactions created.', '50000003-0000-4000-8000-000000000001'::UUID, false, NOW())
    ) AS v(notification_id, user_id, notification_type, message, seed_id, is_read, created_at)
    WHERE v.user_id IS NOT NULL
    ON CONFLICT DO NOTHING;
END $$;

-- ----------------------------------------------------------------------------
-- 10. USER SESSION (for testing)
-- ----------------------------------------------------------------------------

INSERT INTO user_session (session_id, user_id, token, expires_at, created_at)
SELECT 
    '96000000-0000-4000-8000-000000000001'::UUID,
    user_id,
    'seeded-demo-session-token-admin',
    NOW() + INTERVAL '7 days',
    NOW()
FROM "user" 
WHERE email = 'admin@tanim.com'
ON CONFLICT (token) DO NOTHING;

-- ----------------------------------------------------------------------------
-- COMPLETION MESSAGE
-- ----------------------------------------------------------------------------

DO $$
BEGIN
    RAISE NOTICE '✅ TANIM dummy data population complete!';
    RAISE NOTICE 'Users: %, Seed lots: %, Transactions: %, Rooms: %',
        (SELECT COUNT(*) FROM "user"),
        (SELECT COUNT(*) FROM seed_lot),
        (SELECT COUNT(*) FROM transaction),
        (SELECT COUNT(*) FROM room);
END $$;