<?php
session_start();
require_once '../config/db.php';
header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'register':        registerUser();               break;
    case 'registerAdmin':   registerAdmin();              break;
    case 'login':           loginUser();                  break;
    case 'logout':          logoutUser();                 break;
    case 'getAll':          getAllUsers();                break;
    case 'getOne':          getOneUser((int)($_GET['id'] ?? 0)); break;
    case 'update':          updateUser((int)($_GET['id'] ?? 0)); break;
    case 'delete':          deleteUser((int)($_GET['id'] ?? 0)); break;
    case 'changePassword':  changePassword((int)($_GET['id'] ?? 0)); break;
    case 'generateInvite':  generateInvite();             break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action.']);
}

function respond($success, $message, $extra = []) {
    echo json_encode(array_merge(['success' => $success, 'message' => $message], $extra));
    exit;
}

function validatePassword($pass, $confirm) {
    if (strlen($pass) < 6) return 'Password must be at least 6 characters.';
    if (!preg_match('/[a-zA-Z]/', $pass) || !preg_match('/[0-9]/', $pass))
        return 'Password must contain both letters and numbers.';
    if ($pass !== $confirm) return 'Passwords do not match.';
    return '';
}

function emailTaken($pdo, $email, $excludeId = 0) {
    $sql = "SELECT user_id FROM users WHERE email = :email";
    if ($excludeId) $sql .= " AND user_id != :id";
    $stmt = $pdo->prepare($sql);
    $params = [':email' => $email];
    if ($excludeId) $params[':id'] = $excludeId;
    $stmt->execute($params);
    return (bool)$stmt->fetch();
}

function insertUser($pdo, $name, $email, $password, $role) {
    $stmt = $pdo->prepare("INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)");
    $stmt->execute([$name, $email, password_hash($password, PASSWORD_BCRYPT), $role]);
    return (int)$pdo->lastInsertId();
}

function ensureInviteTable($pdo) {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS admin_invites (
            token      CHAR(64)  PRIMARY KEY,
            created_by INT       NOT NULL,
            used_by    INT       DEFAULT NULL,
            expires_at DATETIME  NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE,
            FOREIGN KEY (used_by)    REFERENCES users(user_id) ON DELETE SET NULL
        )
    ");
}

function registerUser() {
    $name = trim($_POST['full_name'] ?? '');
    $email = strtolower(trim($_POST['email'] ?? ''));
    $pass = $_POST['password'] ?? '';
    $confirm = $_POST['confirm_password'] ?? '';

    if (!$name || !$email || !$pass) respond(false, 'All fields are required.');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(false, 'Invalid email.');
    if ($err = validatePassword($pass, $confirm)) respond(false, $err);

    $pdo = getDB();
    if (emailTaken($pdo, $email)) respond(false, 'Email already registered.');

    $id = insertUser($pdo, $name, $email, $pass, 'student');
    respond(true, 'Account created successfully.', ['user_id' => $id]);
}

function generateInvite() {
    $admin_id = (int)($_POST['admin_id'] ?? 0);
    if ($admin_id <= 0) {
        respond(false, 'Valid admin ID is required.');
    }

    $pdo = getDB();
    $stmt = $pdo->prepare("SELECT role FROM users WHERE user_id = ?");
    $stmt->execute([$admin_id]);
    $user = $stmt->fetch();
    if (!$user || $user['role'] !== 'admin') {
        respond(false, 'Admin authentication required.');
    }

    ensureInviteTable($pdo);

    $token = bin2hex(random_bytes(32));
    $expires = date('Y-m-d H:i:s', strtotime('+24 hours'));

    $pdo->prepare("INSERT INTO admin_invites (token, created_by, expires_at) VALUES (?, ?, ?)")
        ->execute([$token, $admin_id, $expires]);

    respond(true, 'Invite token generated (valid 24h).', ['token' => $token, 'expires_at' => $expires]);
}

function registerAdmin() {
    $name = trim($_POST['full_name'] ?? '');
    $email = strtolower(trim($_POST['email'] ?? ''));
    $pass = $_POST['password'] ?? '';
    $confirm = $_POST['confirm_password'] ?? '';
    $token = trim($_POST['invite_token'] ?? '');

    if (!$name || !$email || !$pass || !$token) respond(false, 'All fields including token required.');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(false, 'Invalid email.');
    if ($err = validatePassword($pass, $confirm)) respond(false, $err);

    $pdo = getDB();
    ensureInviteTable($pdo);

    $stmt = $pdo->prepare("SELECT * FROM admin_invites WHERE token = ? AND used_by IS NULL AND expires_at > NOW()");
    $stmt->execute([$token]);
    $invite = $stmt->fetch();
    if (!$invite) respond(false, 'Invalid, expired, or already used invite token.');
    if (emailTaken($pdo, $email)) respond(false, 'Email already registered.');

    $newId = insertUser($pdo, $name, $email, $pass, 'admin');
    $pdo->prepare("UPDATE admin_invites SET used_by = ? WHERE token = ?")->execute([$newId, $token]);

    respond(true, 'Admin account created successfully.', ['user_id' => $newId]);
}

function loginUser() {
    $email = strtolower(trim($_POST['email'] ?? ''));
    $pass = $_POST['password'] ?? '';
    $expected_role = trim($_POST['role'] ?? ''); 
    if (!$email || !$pass) respond(false, 'Email and password required.');

    $pdo = getDB();
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user && password_verify($pass, $user['password'])) {
        if ($expected_role !== '' && $user['role'] !== $expected_role) {
            respond(false, 'Access denied: Account not registered for this portal.');
            return;
        }

        $_SESSION['user_id'] = $user['user_id'];
        $_SESSION['role'] = $user['role'];
        unset($user['password']);
        respond(true, 'Login successful.', ['user' => $user]);
    } else {
        respond(false, 'Invalid credentials.');
    }
}

function logoutUser() {
    session_destroy();
    respond(true, 'Logged out successfully.');
}

function getAllUsers() {
    $pdo = getDB();
    $stmt = $pdo->query("SELECT user_id, full_name, email, role, created_at FROM users ORDER BY created_at DESC");
    respond(true, '', ['data' => $stmt->fetchAll()]);
}

function getOneUser($id) {
    if ($id <= 0) respond(false, 'Invalid user ID.');
    $pdo = getDB();
    $stmt = $pdo->prepare("SELECT user_id, full_name, email, role, created_at FROM users WHERE user_id = ?");
    $stmt->execute([$id]);
    $user = $stmt->fetch();
    if ($user) respond(true, '', ['data' => $user]);
    else respond(false, 'User not found.');
}

function updateUser($id) {
    if ($id <= 0) respond(false, 'Invalid user ID.');
    $name = trim($_POST['full_name'] ?? '');
    $email = strtolower(trim($_POST['email'] ?? ''));
    if (!$name || !$email) respond(false, 'Name and email required.');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(false, 'Invalid email.');

    $pdo = getDB();
    if (emailTaken($pdo, $email, $id)) respond(false, 'Email already used by another account.');
    $pdo->prepare("UPDATE users SET full_name = ?, email = ? WHERE user_id = ?")->execute([$name, $email, $id]);
    respond(true, 'Profile updated.');
}

function deleteUser($id) {
    if ($id <= 0) respond(false, 'Invalid user ID.');
    $pdo = getDB();
    $stmt = $pdo->prepare("DELETE FROM users WHERE user_id = ?");
    $stmt->execute([$id]);
    if ($stmt->rowCount()) respond(true, 'User deleted.');
    else respond(false, 'User not found.');
}

function changePassword($id) {
    if ($id <= 0) respond(false, 'Invalid user ID.');
    $current = $_POST['current_password'] ?? '';
    $new = $_POST['new_password'] ?? '';
    $confirm = $_POST['confirm_password'] ?? '';
    if (!$current || !$new || !$confirm) respond(false, 'All password fields required.');
    if ($err = validatePassword($new, $confirm)) respond(false, $err);

    $pdo = getDB();
    $stmt = $pdo->prepare("SELECT password FROM users WHERE user_id = ?");
    $stmt->execute([$id]);
    $user = $stmt->fetch();
    if (!$user || !password_verify($current, $user['password']))
        respond(false, 'Current password is incorrect.');

    $pdo->prepare("UPDATE users SET password = ? WHERE user_id = ?")
        ->execute([password_hash($new, PASSWORD_BCRYPT), $id]);
    respond(true, 'Password changed successfully.');
}
?>
