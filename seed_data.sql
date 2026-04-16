-- Seed data for TANIM database
-- Insert default users and sample data

-- Insert default users (passwords are hashed for 'password123')
INSERT INTO "user" (email, password, first_name, last_name, role) VALUES
('admin@tanim.com', '$2b$10$hfuHe3RNVD7Mga.ZFhKB4.9Zy4TwukLx7V0zXgjhXyosRM6SGkMmi', 'Admin', 'User', 'admin'),
('researcher@tanim.com', '$2b$10$hfuHe3RNVD7Mga.ZFhKB4.9Zy4TwukLx7V0zXgjhXyosRM6SGkMmi', 'Researcher', 'User', 'researcher'),
('staff@tanim.com', '$2b$10$hfuHe3RNVD7Mga.ZFhKB4.9Zy4TwukLx7V0zXgjhXyosRM6SGkMmi', 'Staff', 'User', 'staff'),
('guest@tanim.com', '$2b$10$hfuHe3RNVD7Mga.ZFhKB4.9Zy4TwukLx7V0zXgjhXyosRM6SGkMmi', 'Guest', 'User', 'guest');

INSERT INTO project (
    project_id, 
    project_name, 
    description, 
    start_date, 
    end_date, 
    created_by
) VALUES (
    'c2eeaa77-7e2b-5af0-add9-8dd1ce502c33',
    'Seed Storage Improvement 2026',
    'A project focused on improving management of seed inventory and usage for research and breeding purposes.',
    '2024-01-15',
    '2024-12-31',
    (SELECT user_id FROM "user" WHERE email = 'admin@tanim.com' LIMIT 1)
);

INSERT INTO room (
    room_id,
    room_name,
    building_location,
    optimal_temp,
    temp_start,
    temp_end
) VALUES 
-- Seed Storage Room A
(
    'd3ffbb66-6d3c-6bf1-beea-9ee2df613d44',
    'Seed Storage Room A',
    'Building 1, Ground Floor, Section A',
    15.00,  -- optimal temperature for seed storage (15°C)
    10.00,  -- minimum acceptable (10°C)
    20.00   -- maximum acceptable (20°C)
),
-- Seed Storage Room B
(
    'a6aacc33-3a6d-4e14-eeed-2aa5a1946a77',
    'Seed Storage Room B',
    'Building 3, Ground Floor, Room 101',
    35.00,  -- optimal drying temp (35°C)
    30.00,  -- minimum acceptable (30°C)
    40.00   -- maximum acceptable (40°C)
),
-- Cold Storage Vault
(
    'a22aa777-7a2b-5c00-c0de-8dd0e0502f33',
    'Cold Storage Vault',
    'Building 1, Basement, Vault B',
    4.00,   -- optimal for long-term seed preservation (4°C)
    2.00,   -- minimum acceptable (2°C)
    8.00    -- maximum acceptable (8°C)
);

INSERT INTO temperature_sensor (
    sensor_id,
    sensor_name,
    room_id,
    is_active,
    installed_at
) VALUES 
-- Sensors for Seed Storage Room A
(
    'b77bbd22-2b7c-4f15-f11e-3115af057a88',
    'Sensor-SSRA-01',
    'd3ffbb66-6d3c-6bf1-beea-9ee2df613d44',
    TRUE,
    '2024-01-10 09:30:00'
),
-- Sensors for Cold Storage Vault
(
    'a22aa777-7a2b-5c00-c0de-8dd0e0502f33',
    'Sensor-CSV-01',
    'a22aa777-7a2b-5c00-c0de-8dd0e0502f33',
    TRUE,
    '2024-01-05 11:15:00'
);