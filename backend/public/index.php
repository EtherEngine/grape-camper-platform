<?php

declare(strict_types=1);

// ── Bootstrap ──────────────────────────────────────────────
require_once __DIR__ . '/../config/app.php';

use Core\Router;
use Core\Request;
use Core\Response;

// ── Init ───────────────────────────────────────────────────
$request = new Request();
$response = new Response();
$router = new Router($request, $response);

// ── Routes ─────────────────────────────────────────────────
require_once BASE_PATH . '/routes/api.php';

// ── Dispatch ───────────────────────────────────────────────
$router->dispatch();