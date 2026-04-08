<?php

declare(strict_types=1);

namespace Middleware;

use Core\Request;
use Core\Response;

class RoleMiddleware
{
    private array $allowedRoles;

    public function __construct(string ...$roles)
    {
        $this->allowedRoles = $roles;
    }

    public function handle(Request $request, Response $response): void
    {
        $role = $request->param('auth_role');

        if ($role === null) {
            $response->unauthorized('Nicht authentifiziert.');
        }

        if (!in_array($role, $this->allowedRoles, true)) {
            $response->forbidden('Keine Berechtigung für diese Aktion.');
        }
    }
}