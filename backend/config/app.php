<?php

declare(strict_types=1);

// ── Base path ──────────────────────────────────────────────
define('BASE_PATH', dirname(__DIR__));

// ── Autoloader (PSR-4 style without Composer) ──────────────
spl_autoload_register(function (string $class): void {
    // Namespace prefix → directory mapping
    $map = [
        'Core\\' => BASE_PATH . '/core/',
        'Config\\' => BASE_PATH . '/config/',
        'Controllers\\' => BASE_PATH . '/controllers/',
        'Middleware\\' => BASE_PATH . '/middleware/',
        'Services\\' => BASE_PATH . '/services/',
        'Repositories\\' => BASE_PATH . '/repositories/',
        'Helpers\\' => BASE_PATH . '/helpers/',
        'Providers\\' => BASE_PATH . '/providers/',
    ];

    foreach ($map as $prefix => $dir) {
        if (str_starts_with($class, $prefix)) {
            $relativeClass = substr($class, strlen($prefix));
            $file = $dir . str_replace('\\', '/', $relativeClass) . '.php';
            if (file_exists($file)) {
                require_once $file;
                return;
            }
        }
    }
});

// ── Environment ────────────────────────────────────────────
require_once BASE_PATH . '/core/Env.php';
\Core\Env::load(BASE_PATH . '/.env');

// ── Error handling ─────────────────────────────────────────
require_once BASE_PATH . '/core/ErrorHandler.php';
\Core\ErrorHandler::register();

$debug = \Core\Env::get('APP_DEBUG', 'false') === 'true';
error_reporting(E_ALL);
ini_set('display_errors', $debug ? '1' : '0');
ini_set('log_errors', '1');

// ── Timezone ───────────────────────────────────────────────
date_default_timezone_set(\Core\Env::get('APP_TIMEZONE', 'Europe/Berlin'));

// ── Encoding ───────────────────────────────────────────────
mb_internal_encoding('UTF-8');

// ── CORS ───────────────────────────────────────────────────
require_once BASE_PATH . '/config/cors.php';