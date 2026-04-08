<?php

declare(strict_types=1);

namespace Helpers;

/**
 * Static helper to build consistent API response arrays.
 * Use these to construct payloads — Response.php handles sending them.
 */
class ResponseHelper
{
    /**
     * Standard success payload.
     *
     *  { "success": true, "message": "...", "data": ... }
     */
    public static function success(mixed $data = null, string $message = 'OK'): array
    {
        $payload = ['success' => true, 'message' => $message];

        if ($data !== null) {
            $payload['data'] = $data;
        }

        return $payload;
    }

    /**
     * Standard error payload.
     *
     *  { "success": false, "error": { "message": "...", "code": 400 } }
     */
    public static function error(string $message, int $code = 400, array $details = []): array
    {
        $payload = [
            'success' => false,
            'error' => [
                'message' => $message,
                'code' => $code,
            ],
        ];

        if (!empty($details)) {
            $payload['error']['details'] = $details;
        }

        return $payload;
    }

    /**
     * Validation error payload (422).
     *
     *  { "success": false, "error": { "message": "Validation failed.", "code": 422, "details": { "field": ["..."] } } }
     */
    public static function validation(array $errors): array
    {
        return self::error('Validation failed.', 422, $errors);
    }

    /**
     * Paginated success payload.
     *
     *  { "success": true, "message": "OK", "data": [...], "meta": { "page": 1, "per_page": 20, "total": 100, "total_pages": 5 } }
     */
    public static function paginated(array $items, int $page, int $perPage, int $total, string $message = 'OK'): array
    {
        return [
            'success' => true,
            'message' => $message,
            'data' => $items,
            'meta' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => $perPage > 0 ? (int) ceil($total / $perPage) : 0,
            ],
        ];
    }
}