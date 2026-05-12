<?php
require_once '../config/db.php';
header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'getAll':        getAllItems(); break;
    case 'getOne':        getOneItem((int)($_GET['id'] ?? 0)); break;
    case 'search':        searchItems(trim($_GET['q'] ?? '')); break;
    case 'create':        createItem(); break;
    case 'update':        updateItem((int)($_GET['id'] ?? 0)); break;
    case 'delete':        deleteItem((int)($_GET['id'] ?? 0)); break;
    case 'updateStatus':  updateStatus((int)($_GET['id'] ?? 0)); break;
    case 'getRecent':     getRecentItems(); break;   
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action.']);
        break;
}

function getAllItems(): void {
    $pdo  = getDB();
    $stmt = $pdo->prepare("
        SELECT f.*, u.full_name AS posted_by_name
        FROM   found_items f
        JOIN   users u ON f.posted_by = u.user_id
        ORDER  BY f.created_at DESC
    ");
    $stmt->execute();
    echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
}

function getOneItem(int $id): void {
    if ($id <= 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid item ID.']);
        return;
    }
    $pdo  = getDB();
    $stmt = $pdo->prepare("
        SELECT f.*, u.full_name AS posted_by_name
        FROM   found_items f
        JOIN   users u ON f.posted_by = u.user_id
        WHERE  f.item_id = :id
    ");
    $stmt->execute([':id' => $id]);
    $item = $stmt->fetch();
    if ($item) echo json_encode(['success' => true, 'data' => $item]);
    else echo json_encode(['success' => false, 'message' => 'Item not found.']);
}

function searchItems(string $q): void {
    if ($q === '') { getAllItems(); return; }
    $pdo  = getDB();
    $like = '%' . $q . '%';
    $stmt = $pdo->prepare("
        SELECT f.*, u.full_name AS posted_by_name
        FROM   found_items f
        JOIN   users u ON f.posted_by = u.user_id
        WHERE  f.item_name      LIKE :q
            OR f.description    LIKE :q
            OR f.location_found LIKE :q
        ORDER  BY f.created_at DESC
    ");
    $stmt->execute([':q' => $like]);
    echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
}

function createItem(): void {
    $name        = trim($_POST['item_name']      ?? '');
    $category    = trim($_POST['category']       ?? '');
    $description = trim($_POST['description']    ?? '');
    $location    = trim($_POST['location_found'] ?? '');
    $date_found  = trim($_POST['date_found']     ?? '');
    $posted_by   = (int)($_POST['posted_by']     ?? 0);

    if (!$name || !$category || !$location || !$date_found || !$posted_by) {
        echo json_encode(['success' => false, 'message' => 'Required fields are missing.']);
        return;
    }
    $allowed_categories = ['electronics', 'personal', 'books', 'accessories', 'other'];
    if (!in_array($category, $allowed_categories)) {
        echo json_encode(['success' => false, 'message' => 'Invalid category.']);
        return;
    }
    $pdo  = getDB();
    $stmt = $pdo->prepare("
        INSERT INTO found_items (item_name, category, description, location_found, date_found, posted_by)
        VALUES (:item_name, :category, :description, :location_found, :date_found, :posted_by)
    ");
    $stmt->execute([
        ':item_name'      => $name,
        ':category'       => $category,
        ':description'    => $description,
        ':location_found' => $location,
        ':date_found'     => $date_found,
        ':posted_by'      => $posted_by,
    ]);
    echo json_encode(['success' => true, 'message' => 'Item posted successfully.', 'item_id' => (int)$pdo->lastInsertId()]);
}

function updateItem(int $id): void {
    if ($id <= 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid item ID.']);
        return;
    }
    $name        = trim($_POST['item_name']      ?? '');
    $category    = trim($_POST['category']       ?? '');
    $description = trim($_POST['description']    ?? '');
    $location    = trim($_POST['location_found'] ?? '');
    $date_found  = trim($_POST['date_found']     ?? '');

    if (!$name || !$category || !$location || !$date_found) {
        echo json_encode(['success' => false, 'message' => 'Required fields are missing.']);
        return;
    }
    $pdo  = getDB();
    $stmt = $pdo->prepare("
        UPDATE found_items
        SET    item_name      = :item_name,
               category       = :category,
               description    = :description,
               location_found = :location_found,
               date_found     = :date_found
        WHERE  item_id = :id
    ");
    $stmt->execute([
        ':item_name'      => $name,
        ':category'       => $category,
        ':description'    => $description,
        ':location_found' => $location,
        ':date_found'     => $date_found,
        ':id'             => $id,
    ]);
    echo json_encode(['success' => true, 'message' => 'Item updated successfully.']);
}

function deleteItem(int $id): void {
    if ($id <= 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid item ID.']);
        return;
    }
    $pdo  = getDB();
    $stmt = $pdo->prepare("DELETE FROM found_items WHERE item_id = :id");
    $stmt->execute([':id' => $id]);
    if ($stmt->rowCount() > 0) echo json_encode(['success' => true, 'message' => 'Item deleted.']);
    else echo json_encode(['success' => false, 'message' => 'Item not found.']);
}

function updateStatus(int $id): void {
    if ($id <= 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid item ID.']);
        return;
    }
    $status  = trim($_POST['status'] ?? '');
    $allowed = ['available', 'claimed', 'delivered'];
    if (!in_array($status, $allowed)) {
        echo json_encode(['success' => false, 'message' => 'Invalid status value.']);
        return;
    }
    $pdo  = getDB();
    $stmt = $pdo->prepare("UPDATE found_items SET status = :status WHERE item_id = :id");
    $stmt->execute([':status' => $status, ':id' => $id]);
    echo json_encode(['success' => true, 'message' => 'Status updated to "' . $status . '".']);
}

function getRecentItems(): void {
    $pdo = getDB();
    $stmt = $pdo->prepare("
        SELECT item_id, item_name, location_found, date_found 
        FROM found_items 
        WHERE status = 'available' 
        ORDER BY created_at DESC 
        LIMIT 3
    ");
    $stmt->execute();
    echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
}
?>
