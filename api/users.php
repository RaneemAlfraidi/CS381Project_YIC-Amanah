<?php
// ============================================================
//  YIC Amanah – Users CRUD
//  File: api/users.php
//
//  Endpoints:
//    POST ?action=register          – student self-registration
//    POST ?action=login             – student or admin login
//    GET  ?action=getAll            – admin: list all users
//    GET  ?action=getOne&id=3       – get one user profile
//    POST ?action=update&id=3       – update name / email
//    POST ?action=delete&id=3       – admin: delete a user
//    POST ?action=changePassword&id=3
// ============================================================

require_once '../config/db.php';

header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'register':
        registerUser();
        break;

    case 'login':
        loginUser();
        break;

    case 'getAll':
        getAllUsers();
        break;

    case 'getOne':
        $id = (int)($_GET['id'] ?? 0);
        getOneUser($id);
        break;

    case 'update':
        $id = (int)($_GET['id'] ?? 0);
        updateUser($id);
        break;

    case 'delete':
        $id = (int)($_GET['id'] ?? 0);
        deleteUser($id);
        break;

    case 'changePassword':
        $id = (int)($_GET['id'] ?? 0);
        changePassword($id);
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action.']);
        break;
}


// ============================================================
// FUNCTIONS
// ============================================================

function registerUser(): void {
    $full_name = trim($_POST['full_name'] ?? '');
    $email     = strtolower(trim($_POST['email'] ?? ''));
    $password  = $_POST['password'] ?? '';
    $confirm   = $_POST['confirm_password'] ?? '';

    // Validation
    if (!$full_name || !$email || !$password) {
        echo json_encode(['success' => false, 'message' => 'All fields are required.']);
        return;
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Invalid email address.']);
        return;
    }
    if (strlen($password) < 4) {
        echo json_encode(['success' => false, 'message' => 'Password must be at least 4 characters.']);
        return;
    }
    if (!preg_match('/[a-zA-Z]/', $password) || !preg_match('/[0-9]/', $password)) {
        echo json_encode(['success' => false, 'message' => 'Password must contain both letters and numbers.']);
        return;
    }
    if ($password !== $confirm) {
        echo json_encode(['success' => false, 'message' => 'Passwords do not match.']);
        return;
    }

    $pdo = getDB();

    // Check email not already used
    $chk = $pdo->prepare("SELECT user_id FROM users WHERE email = :email");
    $chk->execute([':email' => $email]);
    if ($chk->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Email already registered.']);
        return;
    }

    $hashed = password_hash($password, PASSWORD_BCRYPT);

    $stmt = $pdo->prepare("
        INSERT INTO users (full_name, email, password, role)
        VALUES (:full_name, :email, :password, 'student')
    ");
    $stmt->execute([
        ':full_name' => $full_name,
        ':email'     => $email,
        ':password'  => $hashed,
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Account created successfully.',
        'user_id' => (int)$pdo->lastInsertId(),
    ]);
}


function loginUser(): void {
    $email    = strtolower(trim($_POST['email']    ?? ''));
    $password = $_POST['password'] ?? '';

    if (!$email || !$password) {
        echo json_encode(['success' => false, 'message' => 'Email and password are required.']);
        return;
    }

    $pdo  = getDB();
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = :email");
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch();

    // Use password_verify to compare against hashed passwords
    // For the seeded admin rows (which have placeholder hashes) you would
    // update their passwords via changePassword() before going live.
    if ($user && password_verify($password, $user['password'])) {
        // Don't return the hashed password to the client
        unset($user['password']);
        echo json_encode(['success' => true, 'message' => 'Login successful.', 'user' => $user]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid credentials.']);
    }
}


function getAllUsers(): void {
    $pdo  = getDB();
    $stmt = $pdo->prepare("
        SELECT user_id, full_name, email, role, created_at
        FROM   users
        ORDER  BY created_at DESC
    ");
    $stmt->execute();
    echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
}


function getOneUser(int $id): void {
    if ($id <= 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid user ID.']);
        return;
    }

    $pdo  = getDB();
    $stmt = $pdo->prepare("
        SELECT user_id, full_name, email, role, created_at
        FROM   users
        WHERE  user_id = :id
    ");
    $stmt->execute([':id' => $id]);
    $user = $stmt->fetch();

    if ($user) {
        echo json_encode(['success' => true, 'data' => $user]);
    } else {
        echo json_encode(['success' => false, 'message' => 'User not found.']);
    }
}


function updateUser(int $id): void {
    if ($id <= 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid user ID.']);
        return;
    }

    $full_name = trim($_POST['full_name'] ?? '');
    $email     = strtolower(trim($_POST['email'] ?? ''));

    if (!$full_name || !$email) {
        echo json_encode(['success' => false, 'message' => 'Name and email are required.']);
        return;
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Invalid email address.']);
        return;
    }

    $pdo = getDB();

    // Ensure the new email is not taken by someone else
    $chk = $pdo->prepare("SELECT user_id FROM users WHERE email = :email AND user_id != :id");
    $chk->execute([':email' => $email, ':id' => $id]);
    if ($chk->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Email already used by another account.']);
        return;
    }

    $stmt = $pdo->prepare("
        UPDATE users SET full_name = :full_name, email = :email WHERE user_id = :id
    ");
    $stmt->execute([':full_name' => $full_name, ':email' => $email, ':id' => $id]);

    echo json_encode(['success' => true, 'message' => 'Profile updated.']);
}


function deleteUser(int $id): void {
    if ($id <= 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid user ID.']);
        return;
    }

    $pdo  = getDB();
    $stmt = $pdo->prepare("DELETE FROM users WHERE user_id = :id");
    $stmt->execute([':id' => $id]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'User deleted.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'User not found.']);
    }
}


function changePassword(int $id): void {
    if ($id <= 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid user ID.']);
        return;
    }

    $current  = $_POST['current_password']  ?? '';
    $new_pass = $_POST['new_password']      ?? '';
    $confirm  = $_POST['confirm_password']  ?? '';

    if (!$current || !$new_pass || !$confirm) {
        echo json_encode(['success' => false, 'message' => 'All password fields are required.']);
        return;
    }
    if ($new_pass !== $confirm) {
        echo json_encode(['success' => false, 'message' => 'New passwords do not match.']);
        return;
    }
    if (strlen($new_pass) < 4) {
        echo json_encode(['success' => false, 'message' => 'Password must be at least 4 characters.']);
        return;
    }

    $pdo  = getDB();
    $stmt = $pdo->prepare("SELECT password FROM users WHERE user_id = :id");
    $stmt->execute([':id' => $id]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($current, $user['password'])) {
        echo json_encode(['success' => false, 'message' => 'Current password is incorrect.']);
        return;
    }

    $hashed = password_hash($new_pass, PASSWORD_BCRYPT);
    $upd    = $pdo->prepare("UPDATE users SET password = :pw WHERE user_id = :id");
    $upd->execute([':pw' => $hashed, ':id' => $id]);

    echo json_encode(['success' => true, 'message' => 'Password changed successfully.']);
}