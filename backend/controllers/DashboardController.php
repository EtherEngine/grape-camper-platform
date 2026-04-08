<?php

declare(strict_types=1);

namespace Controllers;

use Core\Auth;
use Core\Request;
use Core\Response;
use Services\DashboardService;
use Services\RevenueService;

class DashboardController
{
    private DashboardService $dashboard;
    private RevenueService $revenue;

    public function __construct()
    {
        $this->dashboard = new DashboardService();
        $this->revenue = new RevenueService();
    }

    /**
     * GET /api/dashboard — Dashboard stats for the current user (renter).
     */
    public function renter(Request $request, Response $response): never
    {
        $stats = $this->dashboard->getRenterStats(Auth::id());
        $response->success($stats);
    }

    /**
     * GET /api/owner/dashboard — Dashboard stats for the current owner.
     */
    public function owner(Request $request, Response $response): never
    {
        $stats = $this->dashboard->getOwnerStats(Auth::id());
        $response->success($stats);
    }

    /**
     * GET /api/owner/revenue — Detailed revenue breakdown for the current owner.
     */
    public function ownerRevenue(Request $request, Response $response): never
    {
        $data = $this->revenue->getOwnerRevenue(Auth::id());
        $response->success($data);
    }
}
