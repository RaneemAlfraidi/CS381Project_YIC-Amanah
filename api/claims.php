<?php
// ============================================================
//  YIC Amanah – Claims CRUD
//  File: api/claims.php
//
//  Endpoints:
//    GET  ?action=getAll                 – all claims (admin)
//    GET  ?action=getByStudent&student_id=3
//    GET  ?action=getOne&id=1
//    POST ?action=create                 – student submits a claim
//    POST ?action=review&id=1            – admin approves / rejects
//    POST ?action=delete&id=1            – admin deletes a claim
// ============================================================

require_once '../config/db.php';

header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'getAll':
        getAllClaims();
        break;

    case 'getByStudent':
        $sid = (int)($_GET['student_id'] ?? 0);
        getByStudent($sid);
        break;

    case 'getOne':
        $id = (int)($_GET['id'] ?? 0);
        getOneClaim($id);
        break;

    case 'create':
        createClaim();
        break;

    case 'review':
        $id = (int)($_GET['id'] ?? 0);
        reviewClaim($id);
        break;

    case 'delete':
        $id = (int)($_GET['id'] ?? 0);
        deleteClaim($id);
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action.']);
        break;
}


// ============================================================
// FUNCTIONS
// ============================================================

function getAllClaims(): void {
    $pdo  = getDB();
    $stmt = $pdo->prepare("
        SELECT
            c.*,
            s.full_name  AS student_name,
            f.item_name,
            f.location_found,
            a.full_name  AS reviewed_by_name
        FROM   claims c
        JOIN   users        s ON c.student_id   = s.user_id
        JOIN   found_items  f ON c.item_id       = f.item_id
        LEFT   JOIN users   a ON c.reviewed_by   = a.user_id
        ORDER  BY c.submitted_at DESC
    ");
    $stmt->execute();
    echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
}


function getByStudent(int $student_id): void {
    if ($student_id <= 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid student ID.']);
        return;
    }

    $pdo  = getDB();
    $stmt = $pdo->prepare("
        SELECT
            c.*,
            f.item_name,
            f.location_found,
            f.date_found
        FROM  claims c
        JOIN  found_items f ON c.item_id = f.item_id
        WHERE c.student_id = :sid
        ORDER BY c.submitted_at DESC
    ");
    $stmt->execute([':sid' => $student_id]);
    echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
}


function getOneClaim(int $id): void {
    if ($id <= 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid claim ID.']);
        return;
    }

    $pdo  = getDB();
    $stmt = $pdo->prepare("
        SELECT
            c.*,
            s.full_name  AS student_name,
            f.item_name,
            f.location_found,
            a.full_name  AS reviewed_by_name
        FROM   claims c
        JOIN   users        s ON c.student_id  = s.user_id
        JOIN   found_items  f ON c.item_id     = f.item_id
        LEFT   JOIN users   a ON c.reviewed_by = a.user_id
        WHERE  c.claim_id = :id
    ");
    $stmt->execute([':id' => $id]);
    $claim = $stmt->fetch();

    if ($claim) {
        echo json_encode(['success' => true, 'data' => $claim]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Claim not found.']);
    }
}


function createClaim(): void {
    $student_id    = (int)($_POST['student_id']   ?? 0);
    $item_id       = (int)($_POST['item_id']       ?? 0);
    $proof_details = trim($_POST['proof_details']  ?? '');

    if (!$student_id || !$item_id) {
        echo json_encode(['success' => false, 'message' => 'student_id and item_id are required.']);
        return;
    }

    $pdo = getDB();

    // Check the item actually exists and is still available
    $check = $pdo->prepare("SELECT status FROM found_items WHERE item_id = :id");
    $check->execute([':id' => $item_id]);
    $item = $check->fetch();

    if (!$item) {
        echo json_encode(['success' => false, 'message' => 'Item does not exist.']);
        return;
    }
    if ($item['status'] !== 'available') {
        echo json_encode(['success' => false, 'message' => 'This item is no longer available for claiming.']);
        return;
    }

    // Prevent a student from claiming the same item twice
    $dup = $pdo->prepare("
        SELECT claim_id FROM claims
        WHERE  student_id = :sid AND item_id = :iid AND status = 'pending'
    ");
    $dup->execute([':sid' => $student_id, ':iid' => $item_id]);
    if ($dup->fetch()) {
        echo json_encode(['success' => false, 'message' => 'You already have a pending claim for this item.']);
        return;
    }

    $stmt = $pdo->prepare("
        INSERT INTO claims (student_id, item_id, proof_details)
        VALUES (:student_id, :item_id, :proof_details)
    ");
    $stmt->execute([
        ':student_id'    => $student_id,
        ':item_id'       => $item_id,
        ':proof_details' => $proof_details,
    ]);

    echo json_encode([
        'success'  => true,
        'message'  => 'Claim submitted successfully.',
        'claim_id' => (int)$pdo->lastInsertId(),
    ]);
}


function reviewClaim(int $id): void {
    if ($id <= 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid claim ID.']);
        return;
    }

    $status      = trim($_POST['status']      ?? '');
    $reviewed_by = (int)($_POST['reviewed_by'] ?? 0);
    $allowed     = ['approved', 'rejected'];

    if (!in_array($status, $allowed) || !$reviewed_by) {
        echo json_encode(['success' => false, 'message' => 'Valid status and reviewed_by are required.']);
        return;
    }

    $pdo = getDB();

    // Update the claim
    $stmt = $pdo->prepare("
        UPDATE claims
        SET    status      = :status,
               reviewed_by = :reviewed_by,
               reviewed_at = NOW()
        WHERE  claim_id = :id
    ");
    $stmt->execute([
        ':status'      => $status,
        ':reviewed_by' => $reviewed_by,
        ':id'          => $id,
    ]);

    // If approved, mark the linked found item as 'claimed'
    if ($status === 'approved') {
        $getItem = $pdo->prepare("SELECT item_id FROM claims WHERE claim_id = :id");
        $getItem->execute([':id' => $id]);
        $row = $getItem->fetch();

        if ($row) {
            $updItem = $pdo->prepare("UPDATE found_items SET status = 'claimed' WHERE item_id = :iid");
            $updItem->execute([':iid' => $row['item_id']]);
        }
    }

    echo json_encode(['success' => true, 'message' => 'Claim ' . $status . '.']);
}


function deleteClaim(int $id): void {
    if ($id <= 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid claim ID.']);
        return;
    }

    $pdo  = getDB();
    $stmt = $pdo->prepare("DELETE FROM claims WHERE claim_id = :id");
    $stmt->execute([':id' => $id]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Claim deleted.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Claim not found.']);
    }
}