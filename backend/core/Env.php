<?php

declare(strict_types=1);

namespace Core;

use RuntimeException;

class Env
{
    private static array $variables = [];
    private static bool $loaded = false;

    public static function load(string $path): void
    {
        if (self::$loaded) {
            return;
        }

        if (!file_exists($path)) {
            throw new RuntimeException("Environment file not found: {$path}");
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

        if ($lines === false) {
            throw new RuntimeException("Failed to read environment file: {$path}");
        }

        foreach ($lines as $line) {
            $line = trim($line);

            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }

            $pos = strpos($line, '=');
            if ($pos === false) {
                continue;
            }

            $key = trim(substr($line, 0, $pos));
            $value = trim(substr($line, $pos + 1));

            // Remove surrounding quotes
            if (
                (str_starts_with($value, '"') && str_ends_with($value, '"')) ||
                (str_starts_with($value, "'") && str_ends_with($value, "'"))
            ) {
                $value = substr($value, 1, -1);
            }

            self::$variables[$key] = $value;
            $_ENV[$key] = $value;
        }

        self::$loaded = true;
    }

    public static function get(string $key, string $default = ''): string
    {
        return self::$variables[$key] ?? $_ENV[$key] ?? getenv($key) ?: $default;
    }

    public static function require(string $key): string
    {
        $value = self::get($key);

        if ($value === '') {
            throw new RuntimeException("Required environment variable '{$key}' is not set.");
        }

        return $value;
    }
}
