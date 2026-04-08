<?php

declare(strict_types=1);

namespace Controllers;

use Core\Auth;
use Core\Request;
use Core\Response;
use Core\Validator;
use Services\AvailabilityService;
use Services\UploadService;
use Services\VehicleService;
use RuntimeException;

class VehicleController
{
    private VehicleService $vehicleService;
    private UploadService $uploadService;
    private AvailabilityService $availabilityService;

    public function __construct()
    {
        $this->vehicleService = new VehicleService();
        $this->uploadService = new UploadService();
        $this->availabilityService = new AvailabilityService();
    }

    /**
     * GET /api/vehicles — Public listing with filters + pagination.
     */
    public function index(Request $request, Response $response): never
    {
        $filters = [
            'vehicle_type' => $request->query('vehicle_type'),
            'location_city' => $request->query('location_city'),
            'location_country' => $request->query('location_country'),
            'min_price' => $request->query('min_price'),
            'max_price' => $request->query('max_price'),
            'seats' => $request->query('seats'),
            'sleeping_places' => $request->query('sleeping_places'),
            'pets_allowed' => $request->query('pets_allowed'),
            'transmission' => $request->query('transmission'),
            'fuel_type' => $request->query('fuel_type'),
            'instant_booking' => $request->query('instant_booking'),
        ];

        // Remove null filters
        $filters = array_filter($filters, fn($v) => $v !== null);

        $page = max(1, (int) ($request->query('page', 1)));
        $perPage = max(1, min(100, (int) ($request->query('per_page', 20))));

        $result = $this->vehicleService->listPublic($filters, $page, $perPage);

        $response->paginated($result['items'], $page, $perPage, $result['total']);
    }

    /**
     * GET /api/vehicles/{id} — Public detail.
     */
    public function show(Request $request, Response $response): never
    {
        $id = (int) $request->param('id');

        try {
            $vehicle = $this->vehicleService->getDetail($id);
            $response->success($vehicle);
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * GET /api/owner/vehicles — Owner's own vehicles.
     */
    public function ownerIndex(Request $request, Response $response): never
    {
        $status = $request->query('status');
        $page = max(1, (int) ($request->query('page', 1)));
        $perPage = max(1, min(100, (int) ($request->query('per_page', 20))));

        $result = $this->vehicleService->listByOwner(Auth::id(), $status, $page, $perPage);

        $response->paginated($result['items'], $page, $perPage, $result['total']);
    }

    /**
     * POST /api/owner/vehicles — Create a new vehicle.
     */
    public function store(Request $request, Response $response): never
    {
        $data = $request->input();

        try {
            $vehicle = $this->vehicleService->create($data, Auth::id());
            $response->created($vehicle, 'Fahrzeug erfolgreich erstellt.');
        } catch (RuntimeException $e) {
            if ($e->getCode() === 422) {
                $errors = json_decode($e->getMessage(), true);
                $response->validationError($errors);
            }
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * PUT /api/owner/vehicles/{id} — Update a vehicle.
     */
    public function update(Request $request, Response $response): never
    {
        $id = (int) $request->param('id');
        $data = $request->input();

        try {
            $vehicle = $this->vehicleService->update($id, $data);
            $response->success($vehicle, 'Fahrzeug erfolgreich aktualisiert.');
        } catch (RuntimeException $e) {
            if ($e->getCode() === 422) {
                $errors = json_decode($e->getMessage(), true);
                $response->validationError($errors);
            }
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * PATCH /api/owner/vehicles/{id}/activate
     */
    public function activate(Request $request, Response $response): never
    {
        $id = (int) $request->param('id');

        try {
            $vehicle = $this->vehicleService->activate($id);
            $response->success($vehicle, 'Fahrzeug aktiviert.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * PATCH /api/owner/vehicles/{id}/deactivate
     */
    public function deactivate(Request $request, Response $response): never
    {
        $id = (int) $request->param('id');

        try {
            $vehicle = $this->vehicleService->deactivate($id);
            $response->success($vehicle, 'Fahrzeug deaktiviert.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * PATCH /api/owner/vehicles/{id}/archive
     */
    public function archive(Request $request, Response $response): never
    {
        $id = (int) $request->param('id');

        try {
            $vehicle = $this->vehicleService->archive($id);
            $response->success($vehicle, 'Fahrzeug archiviert.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * POST /api/owner/vehicles/{id}/images — Upload & add image.
     */
    public function addImage(Request $request, Response $response): never
    {
        $vehicleId = (int) $request->param('id');

        $validator = new Validator();
        $validator->validateFile($_FILES['image'] ?? [], [
            'field' => 'image',
            'required' => true,
            'maxSize' => 10 * 1048576, // 10 MB
            'mimes' => ['image/jpeg', 'image/png', 'image/webp'],
            'extensions' => ['jpg', 'jpeg', 'png', 'webp'],
        ]);

        if (!empty($validator->errors())) {
            $response->validationError($validator->errors());
        }

        try {
            $filePath = $this->uploadService->uploadVehicleImage($_FILES['image'], $vehicleId);
            $altText = $request->input('alt_text');
            $sortOrder = (int) ($request->input('sort_order') ?? 0);
            $isCover = (bool) ($request->input('is_cover') ?? false);

            $image = $this->vehicleService->addImage($vehicleId, $filePath, $altText, $sortOrder, $isCover);
            $response->created($image, 'Bild hinzugefügt.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * DELETE /api/owner/vehicles/{id}/images/{imageId} — Delete image.
     */
    public function deleteImage(Request $request, Response $response): never
    {
        $vehicleId = (int) $request->param('id');
        $imageId = (int) $request->param('imageId');

        try {
            $this->vehicleService->deleteImage($vehicleId, $imageId);
            $response->noContent();
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * GET /api/admin/vehicles — Admin listing.
     */
    public function adminIndex(Request $request, Response $response): never
    {
        $status = $request->query('status');
        $page = max(1, (int) ($request->query('page', 1)));
        $perPage = max(1, min(100, (int) ($request->query('per_page', 20))));

        $result = $this->vehicleService->listAdmin($status, $page, $perPage);

        $response->paginated($result['items'], $page, $perPage, $result['total']);
    }

    // ── Availability rules (owner) ─────────────────────────

    /**
     * GET /api/owner/vehicles/{id}/availability-rules
     */
    public function availabilityRules(Request $request, Response $response): never
    {
        $vehicleId = (int) $request->param('id');

        try {
            $this->vehicleService->assertOwnership($vehicleId, Auth::id());
            $rules = $this->availabilityService->getRules($vehicleId);
            $response->success($rules);
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * POST /api/owner/vehicles/{id}/availability-rules
     */
    public function createAvailabilityRule(Request $request, Response $response): never
    {
        $vehicleId = (int) $request->param('id');
        $data = $request->input();

        try {
            $this->vehicleService->assertOwnership($vehicleId, Auth::id());
            $rule = $this->availabilityService->createRule($vehicleId, Auth::id(), $data);
            $response->created($rule, 'Verfügbarkeitsregel erstellt.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * PUT /api/owner/vehicles/{id}/availability-rules/{ruleId}
     */
    public function updateAvailabilityRule(Request $request, Response $response): never
    {
        $vehicleId = (int) $request->param('id');
        $ruleId = (int) $request->param('ruleId');
        $data = $request->input();

        try {
            $this->vehicleService->assertOwnership($vehicleId, Auth::id());
            $rule = $this->availabilityService->updateRule($ruleId, $vehicleId, $data);
            $response->success($rule, 'Verfügbarkeitsregel aktualisiert.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * DELETE /api/owner/vehicles/{id}/availability-rules/{ruleId}
     */
    public function deleteAvailabilityRule(Request $request, Response $response): never
    {
        $vehicleId = (int) $request->param('id');
        $ruleId = (int) $request->param('ruleId');

        try {
            $this->vehicleService->assertOwnership($vehicleId, Auth::id());
            $this->availabilityService->deleteRule($ruleId, $vehicleId);
            $response->noContent();
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * PUT /api/owner/vehicles/{id}/availability-rules/bulk
     * Replace all rules at once (bulk save).
     */
    public function bulkSaveAvailabilityRules(Request $request, Response $response): never
    {
        $vehicleId = (int) $request->param('id');
        $data = $request->input();
        $rules = $data['rules'] ?? [];

        if (!is_array($rules)) {
            $response->error('rules muss ein Array sein.', 422);
        }

        try {
            $this->vehicleService->assertOwnership($vehicleId, Auth::id());
            $saved = $this->availabilityService->replaceRules($vehicleId, Auth::id(), $rules);
            $response->success($saved, 'Verfügbarkeitsregeln gespeichert.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
}