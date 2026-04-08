<?php

declare(strict_types=1);

$allowedOrigin = \Core\Env::get('CORS_ORIGIN', 'http://localhost:5173');
$allowedMethods = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
$allowedHeaders = 'Content-Type, Authorization, X-Requested-With, Accept';

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if ($origin === $allowedOrigin) {
    header("Access-Control-Allow-Origin: {$allowedOrigin}");
    header('Access-Control-Allow-Credentials: true');
    header("Access-Control-Allow-Headers: {$allowedHeaders}");
    header("Access-Control-Allow-Methods: {$allowedMethods}");
    header('Access-Control-Max-Age: 86400');
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}