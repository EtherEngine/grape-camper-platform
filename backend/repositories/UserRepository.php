<?php

declare(strict_types=1);

namespace Repositories;

use Core\Database;

class UserRepository
{
    private Database $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function findById(int $id): ?array
    {
        return $this->db->fetchOne(
            'SELECT u.*, r.name AS role_name
             FROM users u
             JOIN roles r ON r.id = u.role_id
             WHERE u.id = ?',
            [$id]
        );
    }

    public function findByEmail(string $email): ?array
    {
        return $this->db->fetchOne(
            'SELECT u.*, r.name AS role_name
             FROM users u
             JOIN roles r ON r.id = u.role_id
             WHERE u.email = ?',
            [$email]
        );
    }

    public function emailExists(string $email): bool
    {
        $row = $this->db->fetchOne(
            'SELECT 1 FROM users WHERE email = ?',
            [$email]
        );

        return $row !== null;
    }

    public function create(array $data): int
    {
        $this->db->execute(
            'INSERT INTO users (role_id, first_name, last_name, email, password_hash, phone,
                                date_of_birth, street, house_number, postal_code, city, country)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $data['role_id'],
                $data['first_name'],
                $data['last_name'],
                $data['email'],
                $data['password_hash'],
                $data['phone'] ?? null,
                $data['date_of_birth'] ?? null,
                $data['street'] ?? null,
                $data['house_number'] ?? null,
                $data['postal_code'] ?? null,
                $data['city'] ?? null,
                $data['country'] ?? null,
            ]
        );

        return $this->db->lastInsertId();
    }

    public function updateLastLogin(int $userId): void
    {
        $this->db->execute(
            'UPDATE users SET last_login_at = NOW() WHERE id = ?',
            [$userId]
        );
    }

    public function getRoleIdByName(string $name): ?int
    {
        $row = $this->db->fetchOne(
            'SELECT id FROM roles WHERE name = ?',
            [$name]
        );

        return $row ? (int) $row['id'] : null;
    }

    // ── Session Token Methods ──────────────────────────────

    public function createSession(int $userId, string $token, int $lifetimeHours = 72): void
    {
        $this->db->execute(
            'INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, expires_at)
             VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))',
            [
                $userId,
                $token,
                $_SERVER['REMOTE_ADDR'] ?? null,
                substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500),
                $lifetimeHours,
            ]
        );
    }

    public function findBySessionToken(string $token): ?array
    {
        return $this->db->fetchOne(
            'SELECT u.*, r.name AS role_name, s.id AS session_id, s.expires_at AS session_expires_at
             FROM user_sessions s
             JOIN users u ON u.id = s.user_id
             JOIN roles r ON r.id = u.role_id
             WHERE s.session_token = ?
               AND s.expires_at > NOW()
               AND u.is_active = 1',
            [$token]
        );
    }

    public function touchSession(string $token): void
    {
        $this->db->execute(
            'UPDATE user_sessions SET last_seen_at = NOW() WHERE session_token = ?',
            [$token]
        );
    }

    public function deleteSession(string $token): void
    {
        $this->db->execute(
            'DELETE FROM user_sessions WHERE session_token = ?',
            [$token]
        );
    }

    public function deleteUserSessions(int $userId): void
    {
        $this->db->execute(
            'DELETE FROM user_sessions WHERE user_id = ?',
            [$userId]
        );
    }

    public function deleteExpiredSessions(): int
    {
        return $this->db->execute(
            'DELETE FROM user_sessions WHERE expires_at <= NOW()'
        );
    }

    // ── Admin user management ──────────────────────────────

    /**
     * List all users, paginated, with optional role/active filter.
     */
    public function findAll(?string $role = null, ?bool $isActive = null, int $page = 1, int $perPage = 20): array
    {
        $where = ['1 = 1'];
        $params = [];

        if ($role !== null && $role !== '') {
            $where[] = 'r.name = ?';
            $params[] = $role;
        }
        if ($isActive !== null) {
            $where[] = 'u.is_active = ?';
            $params[] = $isActive ? 1 : 0;
        }

        $whereClause = implode(' AND ', $where);

        $countSql = "SELECT COUNT(*) AS total FROM users u JOIN roles r ON r.id = u.role_id WHERE {$whereClause}";
        $total = (int) ($this->db->fetchOne($countSql, $params)['total'] ?? 0);

        $offset = ($page - 1) * $perPage;
        $sql = "SELECT u.id, u.first_name, u.last_name, u.email, u.phone,
                       u.is_active, u.owner_verified, u.last_login_at, u.created_at,
                       r.name AS role_name
                FROM users u
                JOIN roles r ON r.id = u.role_id
                WHERE {$whereClause}
                ORDER BY u.created_at DESC
                LIMIT ? OFFSET ?";

        $params[] = $perPage;
        $params[] = $offset;

        return ['items' => $this->db->fetchAll($sql, $params), 'total' => $total];
    }

    /**
     * Set a user's is_active flag.
     */
    public function setActive(int $userId, bool $active): int
    {
        return $this->db->execute(
            'UPDATE users SET is_active = ? WHERE id = ?',
            [$active ? 1 : 0, $userId]
        );
    }

    public function setOwnerVerified(int $userId, bool $verified): int
    {
        return $this->db->execute(
            'UPDATE users SET owner_verified = ? WHERE id = ?',
            [$verified ? 1 : 0, $userId]
        );
    }
}