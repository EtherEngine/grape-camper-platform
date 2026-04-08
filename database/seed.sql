-- ═══════════════════════════════════════════════════════════
-- GRAPE – Seed Data  |  Alle Passwörter: Test1234!
-- ═══════════════════════════════════════════════════════════
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE payment_transactions;
TRUNCATE TABLE payments;
TRUNCATE TABLE booking_status_history;
TRUNCATE TABLE bookings;
TRUNCATE TABLE swap_offer_images;
TRUNCATE TABLE swap_offers;
TRUNCATE TABLE availability_rules;
TRUNCATE TABLE vehicle_images;
TRUNCATE TABLE vehicle_features;
TRUNCATE TABLE vehicles;
TRUNCATE TABLE system_reports;
TRUNCATE TABLE user_sessions;
TRUNCATE TABLE users;
TRUNCATE TABLE roles;

SET FOREIGN_KEY_CHECKS = 1;

-- ── Roles ──────────────────────────────────────────────────
INSERT INTO roles (id, name, description) VALUES
(1, 'user',  'Standardnutzer / Mieter'),
(2, 'owner', 'Privater Vermieter'),
(3, 'admin', 'Administrator');

-- ── Users (10) ─────────────────────────────────────────────
-- Passwort für alle: Test1234!
-- Hash: password_hash('Test1234!', PASSWORD_BCRYPT)
INSERT INTO users (id, role_id, first_name, last_name, email, password_hash, phone, date_of_birth, street, house_number, postal_code, city, country, is_active, email_verified_at) VALUES
(1,  3, 'System',    'Admin',       'admin@grape.local',    '$2y$10$3q3zZOOel1LrH7/olkVhN.2ISNE8OGJ5bH25uv3toDFluaFcRESFy', '+491700000001', '1985-03-15', 'Alexanderplatz',      '1',   '10178', 'Berlin',      'Deutschland', 1, NOW()),
(2,  2, 'Max',       'Vermieter',   'owner@grape.local',    '$2y$10$3q3zZOOel1LrH7/olkVhN.2ISNE8OGJ5bH25uv3toDFluaFcRESFy', '+491700000002', '1990-07-22', 'Reeperbahn',          '42',  '20359', 'Hamburg',     'Deutschland', 1, NOW()),
(3,  2, 'Sarah',     'Bergmann',    'sarah@grape.local',    '$2y$10$3q3zZOOel1LrH7/olkVhN.2ISNE8OGJ5bH25uv3toDFluaFcRESFy', '+491700000003', '1988-11-05', 'Marienplatz',         '8',   '80331', 'München',     'Deutschland', 1, NOW()),
(4,  2, 'Jonas',     'Waldstein',   'jonas@grape.local',    '$2y$10$3q3zZOOel1LrH7/olkVhN.2ISNE8OGJ5bH25uv3toDFluaFcRESFy', '+491700000007', '1983-04-12', 'Unter den Linden',    '17',  '10117', 'Berlin',      'Deutschland', 1, NOW()),
(5,  1, 'Lisa',      'Mieterin',    'user@grape.local',     '$2y$10$3q3zZOOel1LrH7/olkVhN.2ISNE8OGJ5bH25uv3toDFluaFcRESFy', '+491700000004', '1995-01-10', 'Hohenzollernring',    '23',  '50672', 'Köln',        'Deutschland', 1, NOW()),
(6,  1, 'Tom',       'Reisemann',   'tom@grape.local',      '$2y$10$3q3zZOOel1LrH7/olkVhN.2ISNE8OGJ5bH25uv3toDFluaFcRESFy', '+491700000005', '1992-06-30', 'Schlossstraße',       '5',   '01067', 'Dresden',     'Deutschland', 1, NOW()),
(7,  1, 'Anna',      'Wanderlust',  'anna@grape.local',     '$2y$10$3q3zZOOel1LrH7/olkVhN.2ISNE8OGJ5bH25uv3toDFluaFcRESFy', '+491700000006', '1998-09-18', 'Königstraße',         '70',  '70173', 'Stuttgart',   'Deutschland', 1, NOW()),
(8,  1, 'Felix',     'Bergsteiger', 'felix@grape.local',    '$2y$10$3q3zZOOel1LrH7/olkVhN.2ISNE8OGJ5bH25uv3toDFluaFcRESFy', '+491700000008', '1997-02-28', 'Bergstraße',          '12',  '69115', 'Heidelberg',  'Deutschland', 1, NOW()),
(9,  1, 'Marie',     'Sonnenschein','marie@grape.local',    '$2y$10$3q3zZOOel1LrH7/olkVhN.2ISNE8OGJ5bH25uv3toDFluaFcRESFy', '+491700000009', '1994-08-03', 'Sonnenallee',         '33',  '12045', 'Berlin',      'Deutschland', 1, NOW()),
(10, 1, 'Lukas',     'Fernweh',     'lukas@grape.local',    '$2y$10$3q3zZOOel1LrH7/olkVhN.2ISNE8OGJ5bH25uv3toDFluaFcRESFy', '+491700000010', '1991-12-24', 'Hafenstraße',         '7',   '28195', 'Bremen',      'Deutschland', 1, NOW());

-- ── Vehicles (10) ──────────────────────────────────────────
-- owner_id: 2=Max, 3=Sarah, 4=Jonas
INSERT INTO vehicles (id, owner_id, title, slug, description, vehicle_type, brand, model, year_of_manufacture, license_plate, location_city, location_country, latitude, longitude, seats, sleeping_places, transmission, fuel_type, pets_allowed, smoking_allowed, minimum_rental_days, maximum_rental_days, daily_price, weekly_price, monthly_price, deposit_amount, cleaning_fee, service_fee, currency, instant_booking_enabled, status, is_featured) VALUES
(1,  2, 'VW California Ocean',         'vw-california-ocean',         'Komfortabler Camper mit Aufstelldach, Miniküche und 4 Schlafplätzen. Perfekt für Paare und kleine Familien.',                                  'campervan',  'Volkswagen', 'California Ocean',   2021, 'HH-VW 1021',  'Hamburg',     'Deutschland', 53.5511000, 9.9937000,  4, 4, 'automatic', 'diesel',   0, 0, 2, 21,  95.00,  620.00, 2200.00, 500.00, 40.00, 25.00, 'EUR', 1, 'active',   1),
(2,  2, 'Mercedes Marco Polo',         'mercedes-marco-polo',         'Premium-Campervan mit Standheizung, Markise und elektrischem Aufstelldach. Luxuriöses Reisen auf kleinem Raum.',                                'campervan',  'Mercedes',   'Marco Polo',         2022, 'HH-MB 2022',  'Hamburg',     'Deutschland', 53.5511000, 9.9937000,  4, 3, 'automatic', 'diesel',   0, 0, 3, 28, 120.00,  780.00, 2800.00, 800.00, 50.00, 30.00, 'EUR', 0, 'active',   1),
(3,  2, 'Fiat Ducato Wohnmobil',       'fiat-ducato-wohnmobil',       'Geräumiges Wohnmobil mit Dusche, WC und großer Küche. Ideal für längere Reisen mit der Familie.',                                              'motorhome',  'Fiat',       'Ducato Maxi',        2020, 'B-FD 3020',   'Berlin',      'Deutschland', 52.5200000, 13.4050000, 6, 5, 'manual',    'diesel',   1, 0, 2, 30,  85.00,  550.00, 1900.00, 600.00, 60.00, 20.00, 'EUR', 1, 'active',   0),
(4,  3, 'Toyota HiAce Offroad',        'toyota-hiace-offroad',        'Kompakter Geländecamper mit Allrad, Solaranlage und Dachzelt. Für echte Abenteurer abseits befestigter Straßen.',                               'offroad',    'Toyota',     'HiAce 4x4',          2019, 'M-TH 4019',   'München',     'Deutschland', 48.1351000, 11.5820000, 3, 2, 'manual',    'diesel',   1, 0, 3, NULL, 75.00,  490.00, 1700.00, 400.00, 35.00, 20.00, 'EUR', 0, 'active',   1),
(5,  3, 'Hymer Exsis-i 580',           'hymer-exsis-i-580',           'Kompaktes teilintegriertes Wohnmobil unter 3,5t. Hubbett, große Heckgarage und überraschend viel Platz.',                                       'motorhome',  'Hymer',      'Exsis-i 580',        2023, 'M-HY 5023',   'München',     'Deutschland', 48.1351000, 11.5820000, 4, 4, 'automatic', 'diesel',   0, 0, 3, 21, 135.00,  880.00, 3100.00, 900.00, 65.00, 35.00, 'EUR', 1, 'active',   0),
(6,  3, 'Dethleffs Nomad 490 BLF',     'dethleffs-nomad-490-blf',     'Geräumiger Wohnwagen mit Stockbetten – perfekt für Familien mit Kindern. Vorzelt und Fahrradträger inklusive.',                                 'caravan',    'Dethleffs',  'Nomad 490 BLF',      2021, 'A-DN 6021',   'Augsburg',    'Deutschland', 48.3706000, 10.8978000, 0, 5, 'other',     'other',    0, 0, 3, NULL, 55.00,  350.00, 1200.00, 300.00, 45.00, 15.00, 'EUR', 1, 'active',   0),
(7,  2, 'VW T5 Bulli Retro',           'vw-t5-bulli-retro',           'Liebevoll ausgebauter Retro-Bulli mit Holzinterieur und Charme. Minimalistisches Vanlife-Erlebnis.',                                            'campervan',  'Volkswagen', 'T5 Transporter',     2015, 'FL-VW 7015',  'Flensburg',   'Deutschland', 54.7937000, 9.4469000,  2, 2, 'manual',    'diesel',   1, 0, 2, 14,  65.00,  420.00, 1500.00, 350.00, 30.00, 15.00, 'EUR', 0, 'active',   0),
(8,  2, 'Ford Nugget Plus',            'ford-nugget-plus',            'Ford Transit-basierter Campervan mit Hochdach, Nasszelle und ausziehbaren Betten. Kompakt und komplett.',                                       'campervan',  'Ford',       'Nugget Plus',        2023, 'H-FN 8023',   'Hannover',    'Deutschland', 52.3759000, 9.7320000,  4, 4, 'automatic', 'diesel',   0, 0, 2, 28, 110.00,  720.00, 2600.00, 700.00, 45.00, 25.00, 'EUR', 1, 'active',   1),
(9,  4, 'Pössl Summit 600 Plus',       'poessl-summit-600-plus',      'Schlankes Kastenwagen-Wohnmobil mit Längsbett, Küche und optionalem Fahrradträger. Wendig wie ein PKW.',                                       'motorhome',  'Pössl',      'Summit 600 Plus',    2022, 'B-PS 9022',   'Berlin',      'Deutschland', 52.5200000, 13.4050000, 4, 2, 'manual',    'diesel',   0, 0, 2, 21,  89.00,  580.00, 2050.00, 500.00, 40.00, 20.00, 'EUR', 0, 'active',   0),
(10, 4, 'Adria Twin Supreme 640 SGX',  'adria-twin-supreme-640-sgx',  'Luxus-Kastenwagen mit Queensbett, Regendusche und 160-l-Kühlschrank. Vollausstattung für anspruchsvolle Reisende.',                            'motorhome',  'Adria',      'Twin Supreme 640',   2024, 'B-AT 1024',   'Berlin',      'Deutschland', 52.5200000, 13.4050000, 4, 2, 'automatic', 'diesel',   0, 0, 3, 28, 145.00,  950.00, 3400.00,1000.00, 70.00, 35.00, 'EUR', 1, 'active',   1);

-- ── Vehicle Images ─────────────────────────────────────────
INSERT INTO vehicle_images (vehicle_id, file_path, alt_text, sort_order, is_cover) VALUES
-- VW California (1)
(1, 'uploads/vehicles/vw-california-front.jpg',       'VW California Frontansicht',      0, 1),
(1, 'uploads/vehicles/vw-california-interior.jpg',    'VW California Innenraum',         1, 0),
(1, 'uploads/vehicles/vw-california-kitchen.jpg',     'VW California Küchenzeile',       2, 0),
-- Mercedes Marco Polo (2)
(2, 'uploads/vehicles/marco-polo-front.jpg',          'Marco Polo Frontansicht',         0, 1),
(2, 'uploads/vehicles/marco-polo-roof.jpg',           'Marco Polo Aufstelldach',         1, 0),
(2, 'uploads/vehicles/marco-polo-interior.jpg',       'Marco Polo Innenraum',            2, 0),
-- Fiat Ducato (3)
(3, 'uploads/vehicles/ducato-side.jpg',               'Fiat Ducato Seitenansicht',       0, 1),
(3, 'uploads/vehicles/ducato-bathroom.jpg',           'Fiat Ducato Nasszelle',           1, 0),
(3, 'uploads/vehicles/ducato-bed.jpg',                'Fiat Ducato Schlafbereich',       2, 0),
-- Toyota HiAce (4)
(4, 'uploads/vehicles/hiace-offroad.jpg',             'Toyota HiAce im Gelände',         0, 1),
(4, 'uploads/vehicles/hiace-rooftent.jpg',            'HiAce Dachzelt',                  1, 0),
-- Hymer Exsis (5)
(5, 'uploads/vehicles/hymer-exsis-front.jpg',         'Hymer Exsis Frontansicht',        0, 1),
(5, 'uploads/vehicles/hymer-exsis-living.jpg',        'Hymer Exsis Wohnbereich',         1, 0),
(5, 'uploads/vehicles/hymer-exsis-bed.jpg',           'Hymer Exsis Hubbett',             2, 0),
-- Dethleffs Nomad (6)
(6, 'uploads/vehicles/nomad-exterior.jpg',            'Dethleffs Nomad außen',           0, 1),
(6, 'uploads/vehicles/nomad-bunks.jpg',               'Nomad Stockbetten',               1, 0),
-- VW T5 Retro (7)
(7, 'uploads/vehicles/t5-retro-front.jpg',            'VW T5 Bulli Retro Front',         0, 1),
(7, 'uploads/vehicles/t5-retro-wood.jpg',             'T5 Holzausbau innen',             1, 0),
-- Ford Nugget (8)
(8, 'uploads/vehicles/nugget-side.jpg',               'Ford Nugget Seitenansicht',       0, 1),
(8, 'uploads/vehicles/nugget-highroof.jpg',           'Nugget Hochdach innen',           1, 0),
(8, 'uploads/vehicles/nugget-bath.jpg',               'Nugget Nasszelle',                2, 0),
-- Pössl Summit (9)
(9, 'uploads/vehicles/poessl-front.jpg',              'Pössl Summit Frontansicht',       0, 1),
(9, 'uploads/vehicles/poessl-kitchen.jpg',            'Pössl Summit Küche',              1, 0),
-- Adria Twin Supreme (10)
(10,'uploads/vehicles/adria-twin-front.jpg',          'Adria Twin Supreme Frontansicht', 0, 1),
(10,'uploads/vehicles/adria-twin-bed.jpg',            'Adria Twin Queensbett',           1, 0),
(10,'uploads/vehicles/adria-twin-shower.jpg',         'Adria Twin Regendusche',          2, 0);

-- ── Vehicle Features ───────────────────────────────────────
INSERT INTO vehicle_features (vehicle_id, feature_key, feature_value) VALUES
-- VW California (1)
(1, 'kitchen', '1'), (1, 'solar', '1'), (1, 'wifi', '1'), (1, 'air_conditioning', '1'), (1, 'heating', '1'), (1, 'awning', '1'),
-- Mercedes Marco Polo (2)
(2, 'kitchen', '1'), (2, 'heating', '1'), (2, 'air_conditioning', '1'), (2, 'awning', '1'), (2, 'wifi', '1'), (2, 'bluetooth', '1'),
-- Fiat Ducato (3)
(3, 'kitchen', '1'), (3, 'toilet', '1'), (3, 'shower', '1'), (3, 'heating', '1'), (3, 'solar', '1'), (3, 'bike_rack', '1'), (3, 'tv', '1'),
-- Toyota Offroad (4)
(4, 'solar', '1'), (4, 'roof_tent', '1'), (4, 'four_wheel_drive', '1'), (4, 'outdoor_shower', '1'), (4, 'snorkel', '1'),
-- Hymer Exsis (5)
(5, 'kitchen', '1'), (5, 'toilet', '1'), (5, 'shower', '1'), (5, 'heating', '1'), (5, 'air_conditioning', '1'), (5, 'tv', '1'), (5, 'solar', '1'), (5, 'wifi', '1'),
-- Dethleffs Nomad (6)
(6, 'kitchen', '1'), (6, 'toilet', '1'), (6, 'shower', '1'), (6, 'heating', '1'), (6, 'awning', '1'), (6, 'bike_rack', '1'),
-- VW T5 Retro (7)
(7, 'kitchen', '1'), (7, 'heating', '1'), (7, 'bluetooth', '1'),
-- Ford Nugget (8)
(8, 'kitchen', '1'), (8, 'toilet', '1'), (8, 'shower', '1'), (8, 'heating', '1'), (8, 'air_conditioning', '1'), (8, 'solar', '1'), (8, 'awning', '1'),
-- Pössl Summit (9)
(9, 'kitchen', '1'), (9, 'heating', '1'), (9, 'solar', '1'), (9, 'bike_rack', '1'), (9, 'wifi', '1'),
-- Adria Twin Supreme (10)
(10,'kitchen', '1'), (10,'toilet', '1'), (10,'shower', '1'), (10,'heating', '1'), (10,'air_conditioning', '1'), (10,'solar', '1'), (10,'tv', '1'), (10,'wifi', '1'), (10,'awning', '1');

-- ── Availability Rules ─────────────────────────────────────
INSERT INTO availability_rules (vehicle_id, start_date, end_date, rule_type, reason, created_by) VALUES
(1,  '2026-05-10', '2026-05-12', 'blocked',        'TÜV Termin',          2),
(2,  '2026-06-20', '2026-06-25', 'owner_reserved', 'Eigennutzung',        2),
(3,  '2026-05-01', '2026-05-03', 'maintenance',    'Ölwechsel & Service', 2),
(5,  '2026-07-01', '2026-07-05', 'owner_reserved', 'Familienurlaub',      3),
(7,  '2026-08-15', '2026-08-20', 'maintenance',    'Bremsen & Reifen',    2),
(9,  '2026-06-10', '2026-06-12', 'blocked',        'Gasprüfung',          4),
(10, '2026-09-01', '2026-09-07', 'owner_reserved', 'Privatreise Ostsee',  4);

-- ── Bookings (12) ──────────────────────────────────────────
-- user_id: 5=Lisa, 6=Tom, 7=Anna, 8=Felix, 9=Marie, 10=Lukas
INSERT INTO bookings (id, vehicle_id, user_id, start_date, end_date, days_count, base_price, cleaning_fee, service_fee, deposit_amount, swap_discount_value, total_price, currency, payment_method, status, payment_status, customer_notes, owner_notes, confirmed_at, completed_at, cancelled_at) VALUES
-- confirmed bookings
(1,  1,  5,  '2026-06-01', '2026-06-07', 6,  570.00, 40.00, 25.00, 500.00, 0.00,  635.00, 'EUR', 'paypal',          'confirmed',           'paid',    'Bitte mit Campingtisch.',            NULL, NOW(), NULL, NULL),
(2,  5,  7,  '2026-07-15', '2026-07-22', 7,  880.00, 65.00, 35.00, 900.00, 0.00,  980.00, 'EUR', 'paypal',          'confirmed',           'paid',    'Haben einen kleinen Hund dabei.',    NULL, NOW(), NULL, NULL),
(3,  8,  6,  '2026-07-01', '2026-07-10', 9,  990.00, 45.00, 25.00, 700.00, 0.00, 1060.00, 'EUR', 'stripe',          'confirmed',           'paid',    'Brauchen Fahrradträger.',            'Fahrradträger liegt im Heck.', NOW(), NULL, NULL),
(4, 10,  9,  '2026-08-10', '2026-08-17', 7,  950.00, 70.00, 35.00,1000.00, 0.00, 1055.00, 'EUR', 'bank_transfer',   'confirmed',           'paid',    NULL,                                 NULL, NOW(), NULL, NULL),
-- pending_owner_review
(5,  2,  8,  '2026-08-01', '2026-08-08', 7,  780.00, 50.00, 30.00, 800.00, 0.00,  860.00, 'EUR', 'none',            'pending_owner_review','unpaid',  'Erstmaliger Camperurlaub!',          NULL, NULL, NULL, NULL),
(6,  4, 10,  '2026-09-10', '2026-09-17', 7,  490.00, 35.00, 20.00, 400.00, 0.00,  545.00, 'EUR', 'none',            'pending_owner_review','unpaid',  'Möchten in die Alpen fahren.',       NULL, NULL, NULL, NULL),
-- pending_payment
(7,  3,  7,  '2026-08-05', '2026-08-12', 7,  550.00, 60.00, 20.00, 600.00, 0.00,  630.00, 'EUR', 'stripe',          'pending_payment',     'initiated','Familienreise an die Nordsee.',     NULL, NULL, NULL, NULL),
(8,  9,  5,  '2026-07-20', '2026-07-27', 7,  580.00, 40.00, 20.00, 500.00, 0.00,  640.00, 'EUR', 'paypal',          'pending_payment',     'unpaid',  NULL,                                 NULL, NULL, NULL, NULL),
-- completed
(9,  1,  6,  '2026-04-10', '2026-04-17', 7,  620.00, 40.00, 25.00, 500.00, 0.00,  685.00, 'EUR', 'online_banking',  'completed',           'paid',    'Super Camper, gerne wieder!',        'Ordentlich zurückgegeben.', NOW(), NOW(), NULL),
(10, 3,  9,  '2026-03-20', '2026-03-27', 7,  550.00, 60.00, 20.00, 600.00, 0.00,  630.00, 'EUR', 'paypal',          'completed',           'paid',    'Alles bestens, danke!',              NULL, NOW(), NOW(), NULL),
-- cancelled
(11, 7, 10,  '2026-06-15', '2026-06-20', 5,  325.00, 30.00, 15.00, 350.00, 0.00,  370.00, 'EUR', 'none',            'cancelled',           'unpaid',  'Muss leider stornieren.',            NULL, NULL, NULL, NOW()),
-- rejected
(12, 6,  8,  '2026-07-05', '2026-07-12', 7,  350.00, 45.00, 15.00, 300.00, 0.00,  410.00, 'EUR', 'none',            'rejected',            'unpaid',  'Urlaub mit Kindern.',                NULL, NULL, NULL, NULL);

-- ── Booking Status History ─────────────────────────────────
INSERT INTO booking_status_history (booking_id, old_status, new_status, changed_by, comment) VALUES
-- Booking 1 (confirmed) — Lisa bucht Fahrzeug 1 bei Max
(1,  NULL,                    'pending_owner_review',  5,  'Buchung erstellt.'),
(1,  'pending_owner_review',  'pending_payment',       2,  'Vom Vermieter freigegeben.'),
(1,  'pending_payment',       'confirmed',             5,  'PayPal-Zahlung eingegangen.'),
-- Booking 2 (confirmed) — Anna bucht Fahrzeug 5 bei Sarah
(2,  NULL,                    'pending_owner_review',  7,  'Buchung erstellt.'),
(2,  'pending_owner_review',  'pending_payment',       3,  'Bestätigt durch Sarah.'),
(2,  'pending_payment',       'confirmed',             7,  'PayPal-Zahlung eingegangen.'),
-- Booking 3 (confirmed) — Tom bucht Fahrzeug 8 bei Max
(3,  NULL,                    'pending_owner_review',  6,  'Buchung erstellt.'),
(3,  'pending_owner_review',  'pending_payment',       2,  'Bestätigt durch Max.'),
(3,  'pending_payment',       'confirmed',             6,  'Stripe-Zahlung eingegangen.'),
-- Booking 4 (confirmed) — Marie bucht Fahrzeug 10 bei Jonas
(4,  NULL,                    'pending_owner_review',  9,  'Buchung erstellt.'),
(4,  'pending_owner_review',  'pending_payment',       4,  'Bestätigt durch Jonas.'),
(4,  'pending_payment',       'confirmed',             9,  'Überweisung eingegangen.'),
-- Booking 5 (pending_owner_review) — Felix bucht Fahrzeug 2 bei Max
(5,  NULL,                    'pending_owner_review',  8,  'Buchung erstellt.'),
-- Booking 6 (pending_owner_review) — Lukas bucht Fahrzeug 4 bei Sarah
(6,  NULL,                    'pending_owner_review', 10,  'Buchung erstellt.'),
-- Booking 7 (pending_payment) — Anna bucht Fahrzeug 3 bei Max
(7,  NULL,                    'pending_owner_review',  7,  'Buchung erstellt.'),
(7,  'pending_owner_review',  'pending_payment',       2,  'Bestätigt durch Max.'),
-- Booking 8 (pending_payment) — Lisa bucht Fahrzeug 9 bei Jonas
(8,  NULL,                    'pending_owner_review',  5,  'Buchung erstellt.'),
(8,  'pending_owner_review',  'pending_payment',       4,  'Bestätigt durch Jonas.'),
-- Booking 9 (completed) — Tom bucht Fahrzeug 1 bei Max
(9,  NULL,                    'pending_owner_review',  6,  'Buchung erstellt.'),
(9,  'pending_owner_review',  'pending_payment',       2,  'Bestätigt.'),
(9,  'pending_payment',       'confirmed',             6,  'Online-Zahlung eingegangen.'),
(9,  'confirmed',             'completed',             2,  'Fahrzeug ordentlich zurückgegeben.'),
-- Booking 10 (completed) — Marie bucht Fahrzeug 3 bei Max
(10, NULL,                    'pending_owner_review',  9,  'Buchung erstellt.'),
(10, 'pending_owner_review',  'pending_payment',       2,  'Bestätigt.'),
(10, 'pending_payment',       'confirmed',             9,  'PayPal-Zahlung eingegangen.'),
(10, 'confirmed',             'completed',             2,  'Alles in Ordnung.'),
-- Booking 11 (cancelled) — Lukas bucht Fahrzeug 7 bei Max
(11, NULL,                    'pending_owner_review', 10,  'Buchung erstellt.'),
(11, 'pending_owner_review',  'cancelled',            10,  'Vom Mieter storniert.'),
-- Booking 12 (rejected) — Felix bucht Fahrzeug 6 bei Sarah
(12, NULL,                    'pending_owner_review',  8,  'Buchung erstellt.'),
(12, 'pending_owner_review',  'rejected',              3,  'Zeitraum leider nicht möglich.');

-- ── Payments (6) ───────────────────────────────────────────
INSERT INTO payments (id, booking_id, provider, provider_reference, amount, currency, status, paid_at) VALUES
(1, 1,  'paypal',          'PAY-GRAPE-001',  635.00, 'EUR', 'paid', NOW()),
(2, 2,  'paypal',          'PAY-GRAPE-002',  980.00, 'EUR', 'paid', NOW()),
(3, 3,  'stripe',          'STR-GRAPE-003', 1060.00, 'EUR', 'paid', NOW()),
(4, 4,  'bank_transfer',   'BT-GRAPE-004',  1055.00, 'EUR', 'paid', NOW()),
(5, 9,  'online_banking',  'OB-GRAPE-005',   685.00, 'EUR', 'paid', NOW()),
(6, 10, 'paypal',          'PAY-GRAPE-006',  630.00, 'EUR', 'paid', NOW());

-- ── Payment Transactions ───────────────────────────────────
INSERT INTO payment_transactions (payment_id, transaction_type, external_transaction_id, status, amount, raw_payload) VALUES
(1, 'capture',  'TXN-PP-001',   'completed',  635.00, '{"id":"TXN-PP-001","status":"COMPLETED"}'),
(2, 'capture',  'TXN-PP-002',   'completed',  980.00, '{"id":"TXN-PP-002","status":"COMPLETED"}'),
(3, 'capture',  'TXN-STR-003',  'completed', 1060.00, '{"id":"ch_grape003","status":"succeeded"}'),
(4, 'capture',  'TXN-BT-004',   'completed', 1055.00, '{"ref":"BT-004","status":"credited"}'),
(5, 'capture',  'TXN-OB-005',   'completed',  685.00, '{"ref":"OB-005","status":"credited"}'),
(6, 'capture',  'TXN-PP-006',   'completed',  630.00, '{"id":"TXN-PP-006","status":"COMPLETED"}');

-- ── Swap Offers (5) ────────────────────────────────────────
INSERT INTO swap_offers (id, user_id, booking_id, type, title, description, estimated_value, available_from, available_to, status) VALUES
(1, 6,  9,  'other',    'Mountainbike Scott Spark',   'Scott Spark 960, Modelljahr 2024, top gepflegt. Perfekt für Trails im Schwarzwald.',           2500.00, '2026-04-10', '2026-04-13', 'accepted'),
(2, 8,  NULL,'other',    'Sony Alpha 7 IV Kamera-Set', 'Vollformat-Kamera mit 24-70mm f/2.8 Objektiv, Stativ und Tasche. Ideal für Reisefotografie.', 3200.00, '2026-07-15', '2026-07-20', 'pending'),
(3, 9,  10,  'other',    'SUP Board Fanatic',          'Stand-Up Paddle Board 10 Fuß 6 Zoll, aufblasbar inkl. Paddel und Pumpe.',                     800.00,  '2026-03-20', '2026-03-22', 'under_review'),
(4, 5,  NULL,'other',    'Weber Gasgrill Traveler',    'Kompakter Reisegrill, kaum benutzt. Passt in jeden Camper.',                                   350.00,  '2026-07-20', '2026-07-22', 'rejected'),
(5, 7,  NULL,'vehicle',  'E-Bike Cube Reaction',       'Cube Reaction Hybrid, 625Wh Akku, Rahmengröße M, wenig Kilometer.',                           2800.00, '2026-08-10', '2026-08-14', 'pending');

-- ── Swap Offer Images ──────────────────────────────────────
INSERT INTO swap_offer_images (swap_offer_id, file_path, sort_order) VALUES
(1, 'uploads/swaps/mountainbike_scott_1.jpg',  0),
(1, 'uploads/swaps/mountainbike_scott_2.jpg',  1),
(2, 'uploads/swaps/sony_alpha_set_1.jpg',      0),
(2, 'uploads/swaps/sony_alpha_set_2.jpg',      1),
(3, 'uploads/swaps/sup_fanatic_1.jpg',         0),
(4, 'uploads/swaps/weber_grill_1.jpg',         0),
(5, 'uploads/swaps/ebike_cube_1.jpg',          0),
(5, 'uploads/swaps/ebike_cube_2.jpg',          1);

-- ── System Reports ─────────────────────────────────────────
INSERT INTO system_reports (user_id, booking_id, vehicle_id, report_type, title, description, severity, status, admin_comment) VALUES
(6,  NULL, 3,    'technical', 'Heizung defekt im VW Crafter',          'Die Standheizung hat beim letzten Trip nicht funktioniert. Bitte prüfen.',            'medium', 'resolved', 'Wurde vom Vermieter repariert.'),
(8,  12,   NULL, 'content',   'Buchung zu Unrecht abgelehnt',          'Meine Buchung wurde abgelehnt obwohl der Zeitraum als verfügbar angezeigt wurde.',    'high',   'open',     NULL),
(9,  10,   NULL, 'payment',   'Kaution noch nicht zurückerstattet',    'Buchung seit 2 Wochen abgeschlossen aber Kaution steht noch aus.',                    'medium', 'in_progress', 'Wird geprüft – Rückerstattung eingeleitet.');