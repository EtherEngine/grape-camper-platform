<?php

declare(strict_types=1);

namespace Middleware;

use Core\Request;
use Core\Response;

/**
 * CSRF protection via custom request header.
 *
 * Browsers prevent cross-origin requests from setting custom headers
 * unless explicitly allowed by CORS. Combined with SameSite cookies
 * and strict CORS origin checking, this blocks all CSRF vectors.
 */
class CsrfMiddleware
{
    public function handle(Request $request, Response $response): void
    {
        $method = $request->method();

        // Safe methods don't need CSRF protection
        if (in_array($method, ['GET', 'HEAD', 'OPTIONS'], true)) {
            return;
        }

        // Require custom header that can't be set by HTML forms
        $xrw = $request->header('X-Requested-With');
        if ($xrw !== 'XMLHttpRequest') {
            $response->error('CSRF-Validierung fehlgeschlagen.', 403);
        }
    }
}
