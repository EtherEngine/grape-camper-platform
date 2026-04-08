<?php

declare(strict_types=1);

namespace Middleware;

use Core\Request;
use Core\Response;
use Core\Auth;
use Services\AuthService;

class AuthMiddleware
{
    public function handle(Request $request, Response $response): void
    {
        $token = $request->sessionToken();

        if ($token === null) {
            $response->unauthorized('Keine Sitzung gefunden.');
        }

        $auth = new AuthService();
        $user = $auth->resolveToken($token);

        if ($user === null) {
            $response->unauthorized('Ungültige oder abgelaufene Sitzung.');
        }

        // Make user available globally and via request params
        Auth::setUser($user);

        $request->mergeParams([
            'auth_user' => $user,
            'auth_user_id' => (int) $user['id'],
            'auth_role' => $user['role_name'],
        ]);
    }
}