<?php

declare(strict_types=1);

namespace Repositories;

use Core\Database;

class ReportRepository
{
    private Database $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    // ── Single ─────────────────────────────────────────────

    public function findById(int $id): ?array
    {
        $sql = "SELECT sr.*,
                       u.first_name AS reporter_first_name,
                       u.last_name  AS reporter_last_name,
                       u.email      AS reporter_email
                FROM system_reports sr
                LEFT JOIN users u ON u.id = sr.user_id
                WHERE sr.id = ?";

        return $this->db->fetchOne($sql, [$id]);
    }

    // ── Create ─────────────────────────────────────────────

    public function create(array $data): int
    {
        $sql = "INSERT INTO system_reports
                    (user_id, booking_id, vehicle_id, report_type, title, description, severity, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

        $this->db->execute($sql, [
            $data['user_id'] ?? null,
            $data['booking_id'] ?? null,
            $data['vehicle_id'] ?? null,
            $data['report_type'] ?? 'other',
            $data['title'],
            $data['description'],
            $data['severity'] ?? 'low',
            $data['status'] ?? 'open',
        ]);

        return $this->db->lastInsertId();
    }

    // ── Update ─────────────────────────────────────────────

    public function updateStatus(int $id, string $status): int
    {
        $sql = "UPDATE system_reports SET status = ? WHERE id = ?";
        return $this->db->execute($sql, [$status, $id]);
    }

    public function updateAdminComment(int $id, string $comment): int
    {
        $sql = "UPDATE system_reports SET admin_comment = ? WHERE id = ?";
        return $this->db->execute($sql, [$comment, $id]);
    }

    public function update(int $id, array $data): int
    {
        $fields = [];
        $params = [];

        foreach (['status', 'admin_comment', 'severity'] as $col) {
            if (array_key_exists($col, $data)) {
                $fields[] = "{$col} = ?";
                $params[] = $data[$col];
            }
        }

        if (empty($fields)) {
            return 0;
        }

        $params[] = $id;
        $sql = "UPDATE system_reports SET " . implode(', ', $fields) . " WHERE id = ?";

        return $this->db->execute($sql, $params);
    }

    // ── Listings ───────────────────────────────────────────

    public function findAll(
        ?string $status = null,
        ?string $reportType = null,
        ?string $severity = null,
        int $page = 1,
        int $perPage = 20
    ): array {
        $where = ['1 = 1'];
        $params = [];

        if ($status !== null && $status !== '') {
            $where[] = 'sr.status = ?';
            $params[] = $status;
        }
        if ($reportType !== null && $reportType !== '') {
            $where[] = 'sr.report_type = ?';
            $params[] = $reportType;
        }
        if ($severity !== null && $severity !== '') {
            $where[] = 'sr.severity = ?';
            $params[] = $severity;
        }

        $whereClause = implode(' AND ', $where);

        $countSql = "SELECT COUNT(*) AS total FROM system_reports sr WHERE {$whereClause}";
        $total = (int) ($this->db->fetchOne($countSql, $params)['total'] ?? 0);

        $offset = ($page - 1) * $perPage;
        $sql = "SELECT sr.*,
                       u.first_name AS reporter_first_name,
                       u.last_name  AS reporter_last_name
                FROM system_reports sr
                LEFT JOIN users u ON u.id = sr.user_id
                WHERE {$whereClause}
                ORDER BY
                    FIELD(sr.severity, 'critical', 'high', 'medium', 'low'),
                    sr.created_at DESC
                LIMIT ? OFFSET ?";

        $params[] = $perPage;
        $params[] = $offset;

        return ['items' => $this->db->fetchAll($sql, $params), 'total' => $total];
    }

    // ── Stats ──────────────────────────────────────────────

    public function countByStatus(): array
    {
        $sql = "SELECT status, COUNT(*) AS count FROM system_reports GROUP BY status";
        $rows = $this->db->fetchAll($sql);

        $result = ['open' => 0, 'in_progress' => 0, 'resolved' => 0, 'closed' => 0];
        foreach ($rows as $row) {
            $result[$row['status']] = (int) $row['count'];
        }

        return $result;
    }
}