<?php

declare(strict_types=1);

namespace Config;

use Core\Env;

class DatabaseConfig
{
    public static function get(): array
    {
        return [
            'host' => Env::get('DB_HOST', '127.0.0.1'),
            'port' => (int) Env::get('DB_PORT', '3306'),
            'name' => Env::require('DB_NAME'),
            'user' => Env::get('DB_USER', 'root'),
            'pass' => Env::get('DB_PASS', ''),
            'charset' => Env::get('DB_CHARSET', 'utf8mb4'),
        ];
    }
}