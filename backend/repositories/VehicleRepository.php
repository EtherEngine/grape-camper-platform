<?php

declare(strict_types=1);

namespace Repositories;

use Core\Database;

class VehicleRepository
{
    private Database $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    // ── List / Search ──────────────────────────────────────

    /**
     * Public listing: only active vehicles, with cover image.
     */
    public function findAllPublic(array $filters = [], int $page = 1, int $perPage = 20): array
    {
        $where = ['v.status = ?'];
        $params = ['active'];
        $this->applyFilters($filters, $where, $params);

        $whereClause = implode(' AND ', $where);

        // Count total
        $countSql = "SELECT COUNT(*) AS total FROM vehicles v WHERE {$whereClause}";
        $total = (int) ($this->db->fetchOne($countSql, $params)['total'] ?? 0);

        // Fetch page
        $offset = ($page - 1) * $perPage;
        $sql = "SELECT v.id, v.title, v.slug, v.vehicle_type, v.brand, v.model,
                       v.location_city, v.location_country, v.seats, v.sleeping_places,
                       v.daily_price, v.weekly_price, v.currency, v.instant_booking_enabled,
                       v.is_featured, v.created_at,
                       COALESCE(vi_cover.file_path, vi_first.file_path) AS cover_image,
                       u.swap_unlocked AS owner_swap_unlocked
                FROM vehicles v
                LEFT JOIN vehicle_images vi_cover ON vi_cover.vehicle_id = v.id AND vi_cover.is_cover = 1
                LEFT JOIN vehicle_images vi_first ON vi_first.vehicle_id = v.id
                     AND vi_first.id = (SELECT vi2.id FROM vehicle_images vi2 WHERE vi2.vehicle_id = v.id ORDER BY vi2.sort_order ASC, vi2.id ASC LIMIT 1)
                JOIN users u ON u.id = v.owner_id
                WHERE {$whereClause}
                ORDER BY v.is_featured DESC, v.created_at DESC
                LIMIT ? OFFSET ?";

        $params[] = $perPage;
        $params[] = $offset;

        $items = $this->db->fetchAll($sql, $params);

        return ['items' => $items, 'total' => $total];
    }

    /**
     * Owner-specific listing: all statuses for owned vehicles.
     */
    public function findAllByOwner(int $ownerId, ?string $status = null, int $page = 1, int $perPage = 20): array
    {
        $where = ['v.owner_id = ?'];
        $params = [$ownerId];

        if ($status !== null) {
            $where[] = 'v.status = ?';
            $params[] = $status;
        }

        $whereClause = implode(' AND ', $where);

        $countSql = "SELECT COUNT(*) AS total FROM vehicles v WHERE {$whereClause}";
        $total = (int) ($this->db->fetchOne($countSql, $params)['total'] ?? 0);

        $offset = ($page - 1) * $perPage;
        $sql = "SELECT v.*, COALESCE(vi_cover.file_path, vi_first.file_path) AS cover_image
                FROM vehicles v
                LEFT JOIN vehicle_images vi_cover ON vi_cover.vehicle_id = v.id AND vi_cover.is_cover = 1
                LEFT JOIN vehicle_images vi_first ON vi_first.vehicle_id = v.id
                     AND vi_first.id = (SELECT vi2.id FROM vehicle_images vi2 WHERE vi2.vehicle_id = v.id ORDER BY vi2.sort_order ASC, vi2.id ASC LIMIT 1)
                WHERE {$whereClause}
                ORDER BY v.created_at DESC
                LIMIT ? OFFSET ?";

        $params[] = $perPage;
        $params[] = $offset;

        $items = $this->db->fetchAll($sql, $params);

        return ['items' => $items, 'total' => $total];
    }

    /**
     * Admin listing: all vehicles, any status.
     */
    public function findAllAdmin(?string $status = null, int $page = 1, int $perPage = 20): array
    {
        $where = ['1 = 1'];
        $params = [];

        if ($status !== null) {
            $where[] = 'v.status = ?';
            $params[] = $status;
        }

        $whereClause = implode(' AND ', $where);

        $countSql = "SELECT COUNT(*) AS total FROM vehicles v WHERE {$whereClause}";
        $total = (int) ($this->db->fetchOne($countSql, $params)['total'] ?? 0);

        $offset = ($page - 1) * $perPage;
        $sql = "SELECT v.*,
                       COALESCE(vi_cover.file_path, vi_first.file_path) AS cover_image,
                       u.first_name AS owner_first_name, u.last_name AS owner_last_name
                FROM vehicles v
                LEFT JOIN vehicle_images vi_cover ON vi_cover.vehicle_id = v.id AND vi_cover.is_cover = 1
                LEFT JOIN vehicle_images vi_first ON vi_first.vehicle_id = v.id
                     AND vi_first.id = (SELECT vi2.id FROM vehicle_images vi2 WHERE vi2.vehicle_id = v.id ORDER BY vi2.sort_order ASC, vi2.id ASC LIMIT 1)
                LEFT JOIN users u ON u.id = v.owner_id
                WHERE {$whereClause}
                ORDER BY v.created_at DESC
                LIMIT ? OFFSET ?";

        $params[] = $perPage;
        $params[] = $offset;

        $items = $this->db->fetchAll($sql, $params);

        return ['items' => $items, 'total' => $total];
    }

    // ── Single ─────────────────────────────────────────────

    public function findById(int $id): ?array
    {
        return $this->db->fetchOne(
            'SELECT v.*, u.first_name AS owner_first_name, u.last_name AS owner_last_name,
                    u.swap_unlocked AS owner_swap_unlocked
             FROM vehicles v
             JOIN users u ON u.id = v.owner_id
             WHERE v.id = ?',
            [$id]
        );
    }

    public function findBySlug(string $slug): ?array
    {
        return $this->db->fetchOne(
            'SELECT v.*, u.first_name AS owner_first_name, u.last_name AS owner_last_name,
                    u.swap_unlocked AS owner_swap_unlocked
             FROM vehicles v
             JOIN users u ON u.id = v.owner_id
             WHERE v.slug = ?',
            [$slug]
        );
    }

    public function slugExists(string $slug, ?int $excludeId = null): bool
    {
        if ($excludeId !== null) {
            $row = $this->db->fetchOne(
                'SELECT 1 FROM vehicles WHERE slug = ? AND id != ?',
                [$slug, $excludeId]
            );
        } else {
            $row = $this->db->fetchOne(
                'SELECT 1 FROM vehicles WHERE slug = ?',
                [$slug]
            );
        }

        return $row !== null;
    }

    // ── Create / Update / Status ───────────────────────────

    public function create(array $data): int
    {
        $this->db->execute(
            'INSERT INTO vehicles (
                owner_id, title, slug, description, vehicle_type, brand, model,
                year_of_manufacture, license_plate, location_city, location_country,
                latitude, longitude, seats, sleeping_places, transmission, fuel_type,
                pets_allowed, smoking_allowed, minimum_rental_days, maximum_rental_days,
                daily_price, weekly_price, monthly_price, deposit_amount, cleaning_fee,
                service_fee, currency, instant_booking_enabled, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $data['owner_id'],
                $data['title'],
                $data['slug'],
                $data['description'],
                $data['vehicle_type'] ?? 'campervan',
                $data['brand'] ?? null,
                $data['model'] ?? null,
                $data['year_of_manufacture'] ?? null,
                $data['license_plate'] ?? null,
                $data['location_city'],
                $data['location_country'],
                $data['latitude'] ?? null,
                $data['longitude'] ?? null,
                $data['seats'] ?? 1,
                $data['sleeping_places'] ?? 1,
                $data['transmission'] ?? 'manual',
                $data['fuel_type'] ?? 'diesel',
                $data['pets_allowed'] ?? 0,
                $data['smoking_allowed'] ?? 0,
                $data['minimum_rental_days'] ?? 1,
                $data['maximum_rental_days'] ?? null,
                $data['daily_price'],
                $data['weekly_price'] ?? null,
                $data['monthly_price'] ?? null,
                $data['deposit_amount'] ?? 0,
                $data['cleaning_fee'] ?? 0,
                $data['service_fee'] ?? 0,
                $data['currency'] ?? 'EUR',
                $data['instant_booking_enabled'] ?? 0,
                $data['status'] ?? 'draft',
            ]
        );

        return $this->db->lastInsertId();
    }

    public function update(int $id, array $data): void
    {
        $fields = [];
        $params = [];

        $allowed = [
            'title',
            'slug',
            'description',
            'vehicle_type',
            'brand',
            'model',
            'year_of_manufacture',
            'license_plate',
            'location_city',
            'location_country',
            'latitude',
            'longitude',
            'seats',
            'sleeping_places',
            'transmission',
            'fuel_type',
            'pets_allowed',
            'smoking_allowed',
            'minimum_rental_days',
            'maximum_rental_days',
            'daily_price',
            'weekly_price',
            'monthly_price',
            'deposit_amount',
            'cleaning_fee',
            'service_fee',
            'currency',
            'instant_booking_enabled',
            'status',
        ];

        foreach ($allowed as $col) {
            if (array_key_exists($col, $data)) {
                $fields[] = "{$col} = ?";
                $params[] = $data[$col];
            }
        }

        if (empty($fields)) {
            return;
        }

        $params[] = $id;
        $this->db->execute(
            'UPDATE vehicles SET ' . implode(', ', $fields) . ' WHERE id = ?',
            $params
        );
    }

    public function updateStatus(int $id, string $status): void
    {
        $this->db->execute(
            'UPDATE vehicles SET status = ? WHERE id = ?',
            [$status, $id]
        );
    }

    // ── Images ─────────────────────────────────────────────

    public function findImagesByVehicle(int $vehicleId): array
    {
        return $this->db->fetchAll(
            'SELECT * FROM vehicle_images WHERE vehicle_id = ? ORDER BY sort_order ASC',
            [$vehicleId]
        );
    }

    public function addImage(int $vehicleId, string $filePath, ?string $altText, int $sortOrder, bool $isCover): int
    {
        // If marking as cover, unset existing cover first
        if ($isCover) {
            $this->db->execute(
                'UPDATE vehicle_images SET is_cover = 0 WHERE vehicle_id = ?',
                [$vehicleId]
            );
        }

        $this->db->execute(
            'INSERT INTO vehicle_images (vehicle_id, file_path, alt_text, sort_order, is_cover)
             VALUES (?, ?, ?, ?, ?)',
            [$vehicleId, $filePath, $altText, $sortOrder, (int) $isCover]
        );

        return $this->db->lastInsertId();
    }

    public function deleteImage(int $imageId): void
    {
        $this->db->execute('DELETE FROM vehicle_images WHERE id = ?', [$imageId]);
    }

    public function setCover(int $vehicleId, int $imageId): void
    {
        $this->db->execute('UPDATE vehicle_images SET is_cover = 0 WHERE vehicle_id = ?', [$vehicleId]);
        $this->db->execute('UPDATE vehicle_images SET is_cover = 1 WHERE id = ? AND vehicle_id = ?', [$imageId, $vehicleId]);
    }

    public function findImageById(int $imageId): ?array
    {
        return $this->db->fetchOne('SELECT * FROM vehicle_images WHERE id = ?', [$imageId]);
    }

    // ── Features ───────────────────────────────────────────

    public function findFeaturesByVehicle(int $vehicleId): array
    {
        return $this->db->fetchAll(
            'SELECT * FROM vehicle_features WHERE vehicle_id = ? ORDER BY feature_key ASC',
            [$vehicleId]
        );
    }

    public function syncFeatures(int $vehicleId, array $features): void
    {
        // Delete existing, then bulk re-insert
        $this->db->execute('DELETE FROM vehicle_features WHERE vehicle_id = ?', [$vehicleId]);

        foreach ($features as $feature) {
            $this->db->execute(
                'INSERT INTO vehicle_features (vehicle_id, feature_key, feature_value) VALUES (?, ?, ?)',
                [$vehicleId, $feature['key'], $feature['value']]
            );
        }
    }

    // ── Private helpers ────────────────────────────────────

    private function applyFilters(array $filters, array &$where, array &$params): void
    {
        if (!empty($filters['vehicle_type'])) {
            $where[] = 'v.vehicle_type = ?';
            $params[] = $filters['vehicle_type'];
        }

        if (!empty($filters['location_city'])) {
            $where[] = 'v.location_city LIKE ?';
            $params[] = '%' . $filters['location_city'] . '%';
        }

        if (!empty($filters['location_country'])) {
            $where[] = 'v.location_country = ?';
            $params[] = $filters['location_country'];
        }

        if (isset($filters['min_price']) && is_numeric($filters['min_price'])) {
            $where[] = 'v.daily_price >= ?';
            $params[] = (float) $filters['min_price'];
        }

        if (isset($filters['max_price']) && is_numeric($filters['max_price'])) {
            $where[] = 'v.daily_price <= ?';
            $params[] = (float) $filters['max_price'];
        }

        if (isset($filters['seats']) && is_numeric($filters['seats'])) {
            $where[] = 'v.seats >= ?';
            $params[] = (int) $filters['seats'];
        }

        if (isset($filters['sleeping_places']) && is_numeric($filters['sleeping_places'])) {
            $where[] = 'v.sleeping_places >= ?';
            $params[] = (int) $filters['sleeping_places'];
        }

        if (isset($filters['pets_allowed'])) {
            $where[] = 'v.pets_allowed = 1';
        }

        if (!empty($filters['transmission'])) {
            $where[] = 'v.transmission = ?';
            $params[] = $filters['transmission'];
        }

        if (!empty($filters['fuel_type'])) {
            $where[] = 'v.fuel_type = ?';
            $params[] = $filters['fuel_type'];
        }

        if (isset($filters['instant_booking'])) {
            $where[] = 'v.instant_booking_enabled = 1';
        }
    }
}
