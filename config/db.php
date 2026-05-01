<?php
// ============================================================
//  YIC Amanah - Database Configuration
//  File: config/db.php
// ============================================================

define('DB_HOST', 'localhost');
define('DB_NAME', 'yic_amanah');
define('DB_USER', 'root');         // change to your DB username
define('DB_PASS', '');             // change to your DB password
define('DB_CHARSET', 'utf8mb4');

/**
 * Returns a singleton PDO connection.
 * Usage: $pdo = getDB();
 */
function getDB(): PDO {
    static $pdo = null;

    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];

        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            // In production, log this instead of echoing
            http_response_code(500);
            die(json_encode(['success' => false, 'message' => 'Database connection failed.']));
        }
    }

    return $pdo;
}