-- ============================================================
--  YIC Amanah - Lost & Found System
--  Database Schema + Sample Data
--  Phase 3 - Part 1
-- ============================================================

CREATE DATABASE IF NOT EXISTS yic_amanah;
USE yic_amanah;

-- ============================================================
-- TABLE 1: users
-- Stores both students and admins
-- ============================================================
CREATE TABLE users (
    user_id     INT AUTO_INCREMENT PRIMARY KEY,
    full_name   VARCHAR(100) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,          -- store hashed passwords in production
    role        ENUM('student', 'admin') NOT NULL DEFAULT 'student',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (full_name, email, password, role) VALUES
('Khadijah Mahrous',   'y4f441500093@rcjy.edu.sa', '$2y$10$hashedpw1', 'admin'),
('Raneem Alfraidi',    'y4f441500506@rcjy.edu.sa', '$2y$10$hashedpw2', 'admin'),
('Sarah Al-Otaibi',    'sarah.otaibi@rcjy.edu.sa',  '$2y$10$hashedpw3', 'student'),
('Norah Al-Qahtani',   'norah.qahtani@rcjy.edu.sa', '$2y$10$hashedpw4', 'student'),
('Amal Al-Zahrani',    'amal.zahrani@rcjy.edu.sa',  '$2y$10$hashedpw5', 'student'),
('Hessa Al-Shehri',    'hessa.shehri@rcjy.edu.sa',  '$2y$10$hashedpw6', 'student'),
('Maha Al-Dossari',    'maha.dossari@rcjy.edu.sa',  '$2y$10$hashedpw7', 'student'),
('Lina Al-Harbi',      'lina.harbi@rcjy.edu.sa',    '$2y$10$hashedpw8', 'student'),
('Dalal Al-Mutairi',   'dalal.mutairi@rcjy.edu.sa', '$2y$10$hashedpw9', 'student'),
('Reem Al-Ghamdi',     'reem.ghamdi@rcjy.edu.sa',   '$2y$10$hashedpw10','student'),
('Wafa Al-Sayed',      'wafa.sayed@rcjy.edu.sa',    '$2y$10$hashedpw11','student'),
('Jana Al-Rashidi',    'jana.rashidi@rcjy.edu.sa',  '$2y$10$hashedpw12','student');

-- ============================================================
-- TABLE 2: found_items
-- Items posted by admins as found on campus
-- ============================================================
CREATE TABLE found_items (
    item_id         INT AUTO_INCREMENT PRIMARY KEY,
    item_name       VARCHAR(150) NOT NULL,
    category        ENUM('electronics', 'personal', 'books', 'accessories', 'other') NOT NULL,
    description     TEXT,
    location_found  VARCHAR(200) NOT NULL,
    date_found      DATE NOT NULL,
    status          ENUM('available', 'claimed', 'delivered') NOT NULL DEFAULT 'available',
    posted_by       INT NOT NULL,               -- references users(user_id) admin
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (posted_by) REFERENCES users(user_id)
);

INSERT INTO found_items (item_name, category, description, location_found, date_found, status, posted_by) VALUES
('iPhone 13 Pro',       'electronics', 'Black iPhone 13 Pro with a cracked screen protector, no case',         'Cafeteria',          '2026-04-03', 'available',  1),
('Blue Backpack',       'personal',    'Navy blue backpack, Adidas brand, contains some notebooks',             'Building B',         '2026-04-01', 'claimed',    1),
('iPhone Case',         'accessories', 'Clear silicone case with purple flower design',                         'Room 143',           '2026-02-15', 'delivered',  2),
('Lenovo Laptop',       'electronics', 'Black Lenovo IdeaPad, sticker on the lid, charger included',           'Building B - Lab',   '2026-03-21', 'available',  1),
('Car Keys',            'personal',    'Toyota car keys with a blue keychain and small Quran pendant',          'Parking Lot B',      '2026-02-10', 'delivered',  2),
('Water Bottle',        'personal',    'Pink Stanley tumbler with a YIC sticker on the side',                  'Library Floor 2',    '2026-03-28', 'available',  1),
('Calculus Textbook',   'books',       'Calculus 8th edition by Stewart, name written inside front cover',      'Room 204',           '2026-03-15', 'available',  2),
('Airpods Case',        'electronics', 'White AirPods Pro case, no earbuds inside',                            'Cafeteria',          '2026-04-05', 'available',  1),
('Sunglasses',          'accessories', 'Black Ray-Ban sunglasses with gold frames, no case',                   'Student Lounge',     '2026-03-30', 'available',  2),
('Student ID Card',     'personal',    'Student ID belonging to a YIC student, 3rd year',                      'Main Entrance Gate', '2026-04-07', 'available',  1),
('Makeup Pouch',        'personal',    'Small floral-print fabric pouch containing makeup items',               'Restroom – Bldg A',  '2026-04-02', 'available',  2),
('USB Flash Drive',     'electronics', '32GB SanDisk flash drive, red color, has academic files',               'Computer Lab 1',     '2026-03-25', 'available',  1);

-- ============================================================
-- TABLE 3: lost_reports
-- Reports submitted by students for items they lost
-- ============================================================
CREATE TABLE lost_reports (
    report_id       INT AUTO_INCREMENT PRIMARY KEY,
    student_id      INT NOT NULL,               -- references users(user_id) student
    item_name       VARCHAR(150) NOT NULL,
    category        ENUM('electronics', 'personal', 'books', 'accessories', 'other') NOT NULL,
    description     TEXT,
    location_lost   VARCHAR(200) NOT NULL,
    date_lost       DATE NOT NULL,
    status          ENUM('pending', 'found', 'closed') NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(user_id)
);

INSERT INTO lost_reports (student_id, item_name, category, description, location_lost, date_lost, status) VALUES
(3,  'iPhone 13 Pro',       'electronics', 'Black iPhone 13 Pro, cracked screen protector',         'Cafeteria',         '2026-04-03', 'found'),
(4,  'Blue Backpack',       'personal',    'Navy blue Adidas backpack, has my name tag inside',      'Building B',        '2026-03-31', 'found'),
(5,  'Car Keys',            'personal',    'Toyota keys with blue keychain and Quran pendant',       'Parking Lot B',     '2026-02-09', 'closed'),
(6,  'Graphing Calculator', 'electronics', 'Casio fx-9750GII, has my name engraved on back',        'Math Classroom',    '2026-03-20', 'pending'),
(7,  'Hijab Pin Set',       'accessories', 'Small pouch of gold and silver hijab pins',              'Library',           '2026-04-01', 'pending'),
(8,  'Notebook',            'books',       'A5 spiral notebook with purple cover, Math notes',       'Room 101',          '2026-03-18', 'pending'),
(9,  'Watch',               'accessories', 'Rose gold Casio watch, leather strap',                  'Gym',               '2026-03-25', 'pending'),
(10, 'Earphones',           'electronics', 'White wired earphones, Samsung brand',                  'Student Lounge',    '2026-04-04', 'pending'),
(11, 'Student ID',          'personal',    'YIC student ID, Level 3, red lanyard',                  'Main Gate',         '2026-04-07', 'found'),
(12, 'Wallet',              'personal',    'Brown leather wallet, contains ID and bank card',        'Cafeteria',         '2026-04-06', 'pending'),
(3,  'Airpods Pro',         'electronics', 'White AirPods Pro, case has a small scratch on lid',    'Cafeteria',         '2026-04-05', 'found'),
(5,  'Physics Textbook',    'books',       'University Physics 14th edition, highlighted pages',     'Library',           '2026-02-20', 'closed');

-- ============================================================
-- TABLE 4: claims
-- Students claiming found items
-- ============================================================
CREATE TABLE claims (
    claim_id        INT AUTO_INCREMENT PRIMARY KEY,
    student_id      INT NOT NULL,
    item_id         INT NOT NULL,
    proof_details   TEXT,                       -- student's written proof of ownership
    status          ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    reviewed_by     INT,                        -- admin who reviewed
    reviewed_at     TIMESTAMP NULL,
    submitted_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(user_id),
    FOREIGN KEY (item_id)    REFERENCES found_items(item_id),
    FOREIGN KEY (reviewed_by) REFERENCES users(user_id)
);

INSERT INTO claims (student_id, item_id, proof_details, status, reviewed_by, reviewed_at) VALUES
(3,  1,  'It is my phone. My wallpaper is a photo of my family. Serial number starts with F2VWQ.', 'pending',  NULL, NULL),
(4,  2,  'The bag has my name tag "Norah A." inside the front pocket and a dent on the left strap.', 'approved', 1, '2026-04-03 10:30:00'),
(5,  5,  'Those are my Toyota keys. The keychain has a blue stone and a small Quran charm.',          'rejected', 2, '2026-02-16 09:00:00'),
(6,  4,  'My laptop has a sticker of a purple moon on the lid and my name on tape on the charger.',  'pending',  NULL, NULL),
(11, 10, 'That is my student ID – my photo and ID number 441500345 should be visible.',              'approved', 1, '2026-04-08 11:00:00'),
(7,  6,  'My water bottle has a YIC sticker and my initials "H.S." scratched under the lid.',        'pending',  NULL, NULL),
(8,  7,  'The book has my name "Lina H." written in Arabic inside the front cover.',                 'approved', 2, '2026-03-20 14:00:00'),
(9,  9,  'The sunglasses are mine – I lost them in the student lounge on Tuesday, gold frame.',       'rejected', 1, '2026-04-01 13:00:00'),
(10, 8,  'My AirPods case has a small blue dot sticker on the back.',                                'pending',  NULL, NULL),
(12, 11, 'That is my makeup pouch – it is floral print and contains my eyeliner and lip gloss.',     'pending',  NULL, NULL),
(3,  11, 'I saw it being handed in – can confirm it is not mine.',                                   'rejected', 2, '2026-04-03 16:00:00'),
(7,  12, 'The USB is mine. It contains a folder called "CS201_Project" and my name in the label.',   'approved', 1, '2026-03-26 10:00:00');