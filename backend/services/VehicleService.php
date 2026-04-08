<?php

declare(strict_types=1);

namespace Services;

use Core\Auth;
use Core\Validator;
use Repositories\VehicleRepository;
use RuntimeException;

class VehicleService
{
    private VehicleRepository $vehicles;

    public function __construct()
    {
        $this->vehicles = new VehicleRepository();
    }

    // ── Public listing ─────────────────────────────────────

    public function listPublic(array $filters, int $page, int $perPage): array
    {
        $perPage = max(1, min($perPage, 100));
        $page = max(1, $page);

        return $this->vehicles->findAllPublic($filters, $page, $perPage);
    }

    // ── Owner listing ──────────────────────────────────────

    public function listByOwner(int $ownerId, ?string $status, int $page, int $perPage): array
    {
        $perPage = max(1, min($perPage, 100));
        $page = max(1, $page);

        return $this->vehicles->findAllByOwner($ownerId, $status, $page, $perPage);
    }

    // ── Admin listing ──────────────────────────────────────

    public function listAdmin(?string $status, int $page, int $perPage): array
    {
        $perPage = max(1, min($perPage, 100));
        $page = max(1, $page);

        return $this->vehicles->findAllAdmin($status, $page, $perPage);
    }

    // ── Detail ─────────────────────────────────────────────

    public function getDetail(int $id): array
    {
        $vehicle = $this->vehicles->findById($id);

        if ($vehicle === null) {
            throw new RuntimeException('Fahrzeug nicht gefunden.', 404);
        }

        // Non-active vehicles only visible to owner or admin
        if ($vehicle['status'] !== 'active') {
            if (!Auth::check()) {
                throw new RuntimeException('Fahrzeug nicht gefunden.', 404);
            }

            $isOwner = Auth::id() === (int) $vehicle['owner_id'];
            $isAdmin = Auth::is('admin');

            if (!$isOwner && !$isAdmin) {
                throw new RuntimeException('Fahrzeug nicht gefunden.', 404);
            }
        }

        $vehicle['images'] = $this->vehicles->findImagesByVehicle($id);
        $vehicle['features'] = $this->vehicles->findFeaturesByVehicle($id);

        return $vehicle;
    }

    // ── Create ─────────────────────────────────────────────

    public function create(array $data, int $ownerId): array
    {
        $this->validateVehicle($data);

        $data['owner_id'] = $ownerId;
        $data['slug'] = $this->generateUniqueSlug($data['title']);

        $vehicleId = $this->vehicles->create($data);

        // Sync features if provided
        if (!empty($data['features']) && is_array($data['features'])) {
            $this->vehicles->syncFeatures($vehicleId, $data['features']);
        }

        return $this->getDetail($vehicleId);
    }

    // ── Update ─────────────────────────────────────────────

    public function update(int $id, array $data): array
    {
        $vehicle = $this->vehicles->findById($id);

        if ($vehicle === null) {
            throw new RuntimeException('Fahrzeug nicht gefunden.', 404);
        }

        $this->authorizeOwnerOrAdmin((int) $vehicle['owner_id']);

        $this->validateVehicle($data, isUpdate: true);

        // Regenerate slug if title changed
        if (isset($data['title']) && $data['title'] !== $vehicle['title']) {
            $data['slug'] = $this->generateUniqueSlug($data['title'], $id);
        }

        $this->vehicles->update($id, $data);

        // Sync features if provided
        if (array_key_exists('features', $data) && is_array($data['features'])) {
            $this->vehicles->syncFeatures($id, $data['features']);
        }

        return $this->getDetail($id);
    }

    // ── Status transitions ─────────────────────────────────

    public function activate(int $id): array
    {
        // Check owner verification before allowing activation
        $vehicle = $this->vehicles->findById($id);
        if ($vehicle === null) {
            throw new RuntimeException('Fahrzeug nicht gefunden.', 404);
        }

        $this->authorizeOwnerOrAdmin((int) $vehicle['owner_id']);

        // Only enforce verification check for owner (not admin)
        if (!Auth::is('admin')) {
            $userRepo = new \Repositories\UserRepository();
            $owner = $userRepo->findById(Auth::id());
            if ($owner && !$owner['owner_verified']) {
                throw new RuntimeException('Dein Vermieter-Konto muss zuerst vom Admin verifiziert werden, bevor du Fahrzeuge veröffentlichen kannst.', 403);
            }
        }

        $this->vehicles->updateStatus($id, 'active');
        return $this->getDetail($id);
    }

    public function deactivate(int $id): array
    {
        return $this->changeStatus($id, 'inactive');
    }

    public function archive(int $id): array
    {
        return $this->changeStatus($id, 'archived');
    }

    // ── Image management ───────────────────────────────────

    public function addImage(int $vehicleId, string $filePath, ?string $altText, int $sortOrder, bool $isCover): array
    {
        $vehicle = $this->vehicles->findById($vehicleId);

        if ($vehicle === null) {
            throw new RuntimeException('Fahrzeug nicht gefunden.', 404);
        }

        $this->authorizeOwnerOrAdmin((int) $vehicle['owner_id']);

        $imageId = $this->vehicles->addImage($vehicleId, $filePath, $altText, $sortOrder, $isCover);

        return $this->vehicles->findImageById($imageId);
    }

    public function deleteImage(int $vehicleId, int $imageId): void
    {
        $vehicle = $this->vehicles->findById($vehicleId);

        if ($vehicle === null) {
            throw new RuntimeException('Fahrzeug nicht gefunden.', 404);
        }

        $this->authorizeOwnerOrAdmin((int) $vehicle['owner_id']);

        $image = $this->vehicles->findImageById($imageId);

        if ($image === null || (int) $image['vehicle_id'] !== $vehicleId) {
            throw new RuntimeException('Bild nicht gefunden.', 404);
        }

        $wasCover = (int) ($image['is_cover'] ?? 0);

        $this->vehicles->deleteImage($imageId);

        // If the deleted image was the cover, promote the first remaining image
        if ($wasCover) {
            $remaining = $this->vehicles->findImagesByVehicle($vehicleId);
            if (!empty($remaining)) {
                $this->vehicles->setCover($vehicleId, (int) $remaining[0]['id']);
            }
        }
    }

    // ── Private helpers ────────────────────────────────────

    private function changeStatus(int $id, string $newStatus): array
    {
        $vehicle = $this->vehicles->findById($id);

        if ($vehicle === null) {
            throw new RuntimeException('Fahrzeug nicht gefunden.', 404);
        }

        $this->authorizeOwnerOrAdmin((int) $vehicle['owner_id']);

        $this->vehicles->updateStatus($id, $newStatus);

        return $this->getDetail($id);
    }

    private function authorizeOwnerOrAdmin(int $ownerId): void
    {
        if (Auth::is('admin')) {
            return;
        }

        if (Auth::id() !== $ownerId) {
            throw new RuntimeException('Zugriff verweigert.', 403);
        }
    }

    /**
     * Assert that user owns the vehicle (public for controller reuse).
     */
    public function assertOwnership(int $vehicleId, int $userId): void
    {
        $vehicle = $this->vehicles->findById($vehicleId);
        if ($vehicle === null) {
            throw new RuntimeException('Fahrzeug nicht gefunden.', 404);
        }
        $this->authorizeOwnerOrAdmin((int) $vehicle['owner_id']);
    }

    private function validateVehicle(array $data, bool $isUpdate = false): void
    {
        $requiredPrefix = $isUpdate ? 'nullable|' : 'required|';

        $rules = [
            'title' => $requiredPrefix . 'string|max:150',
            'description' => $requiredPrefix . 'string',
            'vehicle_type' => 'nullable|in:campervan,motorhome,caravan,offroad,other',
            'brand' => 'nullable|string|max:100',
            'model' => 'nullable|string|max:100',
            'year_of_manufacture' => 'nullable|integer|minValue:1900|maxValue:2100',
            'license_plate' => 'nullable|string|max:30',
            'location_city' => $requiredPrefix . 'string|max:100',
            'location_country' => $requiredPrefix . 'string|max:100',
            'seats' => 'nullable|integer|minValue:1|maxValue:50',
            'sleeping_places' => 'nullable|integer|minValue:1|maxValue:30',
            'transmission' => 'nullable|in:manual,automatic,other',
            'fuel_type' => 'nullable|in:diesel,petrol,electric,hybrid,gas,other',
            'daily_price' => $requiredPrefix . 'numeric|minValue:0',
            'weekly_price' => 'nullable|numeric|minValue:0',
            'monthly_price' => 'nullable|numeric|minValue:0',
            'deposit_amount' => 'nullable|numeric|minValue:0',
            'cleaning_fee' => 'nullable|numeric|minValue:0',
            'service_fee' => 'nullable|numeric|minValue:0',
            'minimum_rental_days' => 'nullable|integer|minValue:1',
            'maximum_rental_days' => 'nullable|integer|minValue:1',
        ];

        // On update, only validate keys that are actually present
        if ($isUpdate) {
            $rules = array_intersect_key($rules, $data);
        }

        $validator = new Validator();

        if (!$validator->validate($data, $rules)) {
            throw new RuntimeException(
                json_encode($validator->errors(), JSON_UNESCAPED_UNICODE),
                422
            );
        }
    }

    private function generateUniqueSlug(string $title, ?int $excludeId = null): string
    {
        $slug = $this->slugify($title);
        $base = $slug;
        $counter = 1;

        while ($this->vehicles->slugExists($slug, $excludeId)) {
            $slug = $base . '-' . $counter;
            $counter++;
        }

        return $slug;
    }

    private function slugify(string $text): string
    {
        $text = mb_strtolower($text, 'UTF-8');

        // German character replacements
        $text = str_replace(
            ['ä', 'ö', 'ü', 'ß'],
            ['ae', 'oe', 'ue', 'ss'],
            $text
        );

        // Replace non-alphanum with hyphens
        $text = (string) preg_replace('/[^a-z0-9]+/', '-', $text);
        $text = trim($text, '-');

        return $text ?: 'fahrzeug';
    }
}
