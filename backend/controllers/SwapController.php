<?php

declare(strict_types=1);

namespace Controllers;

use Core\Auth;
use Core\Request;
use Core\Response;
use Core\Validator;
use Services\SwapService;
use Services\SwapUnlockService;
use Services\UploadService;
use RuntimeException;

class SwapController
{
    private SwapService $swapService;
    private UploadService $uploadService;
    private SwapUnlockService $swapUnlock;

    public function __construct()
    {
        $this->swapService = new SwapService();
        $this->uploadService = new UploadService();
        $this->swapUnlock = new SwapUnlockService();
    }

    // ── CRUD ───────────────────────────────────────────────

    /**
     * POST /api/swaps — Create a swap offer
     */
    public function store(Request $request, Response $response): never
    {
        // Gate: swap must be unlocked for this user
        if (!$this->swapUnlock->isUnlocked(Auth::id())) {
            $response->error('Tauschoption ist noch nicht freigeschaltet.', 403);
        }

        $data = $request->input();

        $validator = new Validator();
        $valid = $validator->validate($data, [
            'type' => 'required|string|in:vehicle,property,other',
            'title' => 'required|string|max:150',
            'description' => 'required|string',
            'estimated_value' => 'required|numeric|min_value:0.01',
            'booking_id' => 'nullable|integer',
            'available_from' => 'nullable|string',
            'available_to' => 'nullable|string',
        ]);

        if (!$valid) {
            $response->validationError($validator->errors());
        }

        try {
            $offer = $this->swapService->createOffer(Auth::id(), $data);
            $response->created($offer, 'Tauschangebot erstellt.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * GET /api/swaps — List own swap offers
     */
    public function index(Request $request, Response $response): never
    {
        $query = $request->query();
        $page = max(1, (int) ($query['page'] ?? 1));
        $perPage = min(50, max(1, (int) ($query['per_page'] ?? 20)));
        $status = $query['status'] ?? null;

        $result = $this->swapService->getUserOffers(Auth::id(), $status, $page, $perPage);

        $response->paginated($result['items'], $result['page'], $result['per_page'], $result['total']);
    }

    /**
     * GET /api/swaps/{id} — Show swap offer detail
     */
    public function show(Request $request, Response $response): never
    {
        $id = (int) $request->param('id');

        try {
            $offer = $this->swapService->getOffer($id);

            // Only creator or vehicle owner can view
            $userId = Auth::id();
            $isCreator = (int) $offer['user_id'] === $userId;
            $isOwner = isset($offer['owner_id']) && (int) $offer['owner_id'] === $userId;
            $isAdmin = Auth::is('admin');

            if (!$isCreator && !$isOwner && !$isAdmin) {
                $response->forbidden('Keine Berechtigung.');
            }

            $response->success($offer);
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 404);
        }
    }

    /**
     * PUT /api/swaps/{id} — Update own swap offer (only while pending)
     */
    public function update(Request $request, Response $response): never
    {
        $id = (int) $request->param('id');
        $data = $request->input();

        try {
            $offer = $this->swapService->updateOffer($id, Auth::id(), $data);
            $response->success($offer, 'Tauschangebot aktualisiert.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * PATCH /api/swaps/{id}/cancel — Cancel own offer
     */
    public function cancel(Request $request, Response $response): never
    {
        $id = (int) $request->param('id');

        try {
            $offer = $this->swapService->cancel($id, Auth::id());
            $response->success($offer, 'Tauschangebot storniert.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // ── Owner actions ──────────────────────────────────────

    /**
     * GET /api/owner/swaps — List swap offers for owner's vehicles
     */
    public function ownerIndex(Request $request, Response $response): never
    {
        $query = $request->query();
        $page = max(1, (int) ($query['page'] ?? 1));
        $perPage = min(50, max(1, (int) ($query['per_page'] ?? 20)));
        $status = $query['status'] ?? null;

        $result = $this->swapService->getOwnerOffers(Auth::id(), $status, $page, $perPage);

        $response->paginated($result['items'], $result['page'], $result['per_page'], $result['total']);
    }

    /**
     * PATCH /api/owner/swaps/{id}/review — Put offer under review
     */
    public function review(Request $request, Response $response): never
    {
        $id = (int) $request->param('id');

        try {
            $offer = $this->swapService->review($id, Auth::id());
            $response->success($offer, 'Tauschangebot wird geprüft.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * PATCH /api/owner/swaps/{id}/accept — Accept offer
     */
    public function accept(Request $request, Response $response): never
    {
        $id = (int) $request->param('id');
        $data = $request->input();

        try {
            $offer = $this->swapService->accept($id, Auth::id(), $data['comment'] ?? null);
            $response->success($offer, 'Tauschangebot angenommen.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * PATCH /api/owner/swaps/{id}/reject — Reject offer
     */
    public function reject(Request $request, Response $response): never
    {
        $id = (int) $request->param('id');
        $data = $request->input();

        try {
            $offer = $this->swapService->reject($id, Auth::id(), $data['comment'] ?? null);
            $response->success($offer, 'Tauschangebot abgelehnt.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // ── Images ─────────────────────────────────────────────

    /**
     * POST /api/swaps/{id}/images — Upload image for swap offer
     */
    public function addImage(Request $request, Response $response): never
    {
        $id = (int) $request->param('id');

        if (empty($_FILES['image'])) {
            $response->error('Kein Bild hochgeladen.', 422);
        }

        try {
            $filePath = $this->uploadService->uploadSwapImage($_FILES['image'], $id);
            $altText = $request->input('alt_text');

            $image = $this->swapService->addImage($id, Auth::id(), $filePath, $altText);
            $response->created($image, 'Bild hochgeladen.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * DELETE /api/swaps/{id}/images/{imageId} — Delete an image
     */
    public function deleteImage(Request $request, Response $response): never
    {
        $id = (int) $request->param('id');
        $imageId = (int) $request->param('imageId');

        try {
            $this->swapService->deleteImage($id, $imageId, Auth::id());
            $response->success(null, 'Bild gelöscht.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // ── Swap Unlock Progress ────────────────────────────────

    /**
     * GET /api/swap-unlock/progress — Get swap unlock progress for current user.
     */
    public function unlockProgress(Request $request, Response $response): never
    {
        $progress = $this->swapUnlock->getProgress(Auth::id());
        $response->success($progress);
    }

    /**
     * POST /api/swap-unlock/redeem — Redeem an unlock code.
     * Body: { "code": "SWAP-XXXXX-XXXXX" }
     */
    public function redeemCode(Request $request, Response $response): never
    {
        $code = trim($request->input()['code'] ?? '');

        if (empty($code)) {
            $response->error('Bitte geben Sie einen Freischalt-Code ein.', 422);
        }

        try {
            $user = (new \Repositories\UserRepository())->findById(Auth::id());
            $this->swapUnlock->redeemCode(Auth::id(), $code, $user['email']);
            $response->success(null, 'Tauschoption erfolgreich freigeschaltet!');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
}