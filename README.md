# YIC Amanah – Lost & Found System

A web-based lost and found platform for YIC campus where students can report lost items, browse found items, and submit claims. Administrators manage items, claims, and generate invite tokens for new admins.

## Features

- Student portal: report lost items, view available found items, submit claims with proof, track claim status.
- Admin portal: post found items, review/approve/reject claims, manage lost reports, generate one-time admin invite tokens.
- Role-based access control (student / admin).
- Secure authentication (password hashing, session management).

## Tech Stack

- Backend: PHP (PDO), MySQL
- Frontend: HTML, CSS, JavaScript
- Server: Apache

## Setup Instructions

1. Clone the repository.
2. Import `Amanah database.sql` into MySQL (creates database `yic_amanah`).
3. Configure database connection in `config/db.php` (set your DB credentials).
4. Run the project on a local PHP server.

## Default Admin Account (for testing)

- Email: `admin@test.com`
- Password: `password`

## Documentation

- [Phase 2 Submission (UI & frontend)](phase2.pdf)
- [Phase 3 Submission (Backend & APIs)](Phase%203%20Submission.pdf)

## Notes
- Admin invites expire after 24 hours and are one-time use.