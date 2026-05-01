<?php
// ============================================================
//  YIC Amanah – Lost Reports CRUD
//  File: api/lost_reports.php
//
//  Endpoints:
//    GET  ?action=getAll                    – all reports (admin)
//    GET  ?action=getByStudent&student_id=3 – reports for one student
//    GET  ?action=getOne&id=2               – single report
//    POST ?action=create                    – student submits a new report
//    POST ?action=update&id=2               – student edits their report
//    POST ?action=delete&id=2               – student / admin deletes a report
//    POST ?action=updateStatus&id=2         – admin updates report status
// ============================================================

require_once '../config/db.php';

header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'getAll':
        getAllReports();
        break;

    case 'getByStudent':
        $sid = (int)($_GET['student_id'] ?? 0);
        getByStudent($sid);
        break;

    case 'getOne':
        $id = (int)($_GET['id'] ?? 0);
        getOneReport($id);
        break;

    case 'create':
        createReport();
        break;

    case 'update':
        $id = (int)($_GET['id'] ?? 0);
        updateReport($id);
        break;

    case 'delete':
        $id = (int)($_GET['id'] ?? 0);
        deleteReport($id);
        break;

    case 'updateStatus':
        $id = (int)($_GET['id'] ?? 0);
        updateReportStatus($id);
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action.']);
        break;
}


// ============================================================
// FUNCTIONS
// ============================================================

function getAllReports(): void {
    $pdo  = getDB();
    $stmt = $pdo->prepare("
        SELECT r.*, u.full_name AS student_name
        FROM   lost_reports r
        JOIN   users u ON r.student_id = u.user_id
        ORDER  BY r.created_at DESC
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
        SELECT * FROM lost_reports
        WHERE  student_id = :sid
        ORDER  BY created_at DESC
    ");
    $stmt->execute([':sid' => $student_id]);
    echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
}


function getOneReport(int $id): void {
    if ($id <= 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid report ID.']);
        return;
    }

    $pdo  = getDB();
    $stmt = $pdo->prepare("
        SELECT r.*, u.full_name AS student_name
        FROM   lost_reports r
        JOIN   users u ON r.student_id = u.user_id
        WHERE  r.report_id = :id
    ");
    $stmt->execute([':id' => $id]);
    $report = $stmt->fetch();

    if ($report) {
        echo json_encode(['success' => true, 'data' => $report]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Report not found.']);
    }
}


function createReport(): void {
    $student_id   = (int)($_POST['student_id']    ?? 0);
    $item_name    = trim($_POST['item_name']       ?? '');
    $category     = trim($_POST['category']        ?? '');
    $description  = trim($_POST['description']     ?? '');
    $location     = trim($_POST['location_lost']   ?? '');
    $date_lost    = trim($_POST['date_lost']        ?? '');

    if (!$student_id || !$item_name || !$category || !$location || !$date_lost) {
        echo json_encode(['success' => false, 'message' => 'Required fields missing.']);
        return;
    }

    $allowed = ['electronics', 'personal', 'books', 'accessories', 'other'];
    if (!in_array($category, $allowed)) {
        echo json_encode(['success' => false, 'message' => 'Invalid category.']);
        return;
    }

    $pdo  = getDB();
    $stmt = $pdo->prepare("
        INSERT INTO lost_reports (student_id, item_name, category, description, location_lost, date_lost)
        VALUES (:student_id, :item_name, :category, :description, :location_lost, :date_lost)
    ");
    $stmt->execute([
        ':student_id'    => $student_id,
        ':item_name'     => $item_name,
        ':category'      => $category,
        ':description'   => $description,
        ':location_lost' => $location,
        ':date_lost'     => $date_lost,
    ]);

    echo json_encode([
        'success'   => true,
        'message'   => 'Lost report submitted.',
        'report_id' => (int)$pdo->lastInsertId(),
    ]);
}


function updateReport(int $id): void {
    if ($id <= 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid report ID.']);
        return;
    }

    $item_name   = trim($_POST['item_name']     ?? '');
    $category    = trim($_POST['category']      ?? '');
    $description = trim($_POST['description']   ?? '');
    $location    = trim($_POST['location_lost'] ?? '');
    $date_lost   = trim($_POST['date_lost']      ?? '');

    if (!$item_name || !$category || !$location || !$date_lost) {
        echo json_encode(['success' => false, 'message' => 'Required fields missing.']);
        return;
    }

    $pdo  = getDB();
    $stmt = $pdo->prepare("
        UPDATE lost_reports
        SET    item_name    = :item_name,
               category     = :category,
               description  = :description,
               location_lost= :location_lost,
               date_lost    = :date_lost
        WHERE  report_id = :id
    ");
    $stmt->execute([
        ':item_name'     => $item_name,
        ':category'      => $category,
        ':description'   => $description,
        ':location_lost' => $location,
        ':date_lost'     => $date_lost,
        ':id'            => $id,
    ]);

    echo json_encode(['success' => true, 'message' => 'Report updated.']);
}


function deleteReport(int $id): void {
    if ($id <= 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid report ID.']);
        return;
    }

    $pdo  = getDB();
    $stmt = $pdo->prepare("DELETE FROM lost_reports WHERE report_id = :id");
    $stmt->execute([':id' => $id]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Report deleted.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Report not found.']);
    }
}


function updateReportStatus(int $id): void {
    if ($id <= 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid report ID.']);
        return;
    }

    $status  = trim($_POST['status'] ?? '');
    $allowed = ['pending', 'found', 'closed'];

    if (!in_array($status, $allowed)) {
        echo json_encode(['success' => false, 'message' => 'Invalid status.']);
        return;
    }

    $pdo  = getDB();
    $stmt = $pdo->prepare("UPDATE lost_reports SET status = :status WHERE report_id = :id");
    $stmt->execute([':status' => $status, ':id' => $id]);

    echo json_encode(['success' => true, 'message' => 'Report status updated to "' . $status . '".']);
}