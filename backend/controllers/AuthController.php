<?php

declare(strict_types=1);

namespace Controllers;

use Core\Request;
use Core\Response;
use Core\Validator;
use Services\AuthService;

class AuthController
{
    private AuthService $auth;

    public function __construct()
    {
        $this->auth = new AuthService();
    }

    /**
     * POST /api/auth/register
     */
    public function register(Request $request, Response $response): never
    {
        $data = $request->input();

        $rules = [
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'required|email|max:190',
            'password' => 'required|min:8|max:255|confirmed:password_confirmation',
        ];

        $isOwner = ($data['register_as'] ?? '') === 'owner';
        if ($isOwner) {
            $rules['phone'] = 'required|string|max:50';
            $rules['date_of_birth'] = 'required|string|max:10';
            $rules['street'] = 'required|string|max:150';
            $rules['house_number'] = 'required|string|max:20';
            $rules['postal_code'] = 'required|string|max:20';
            $rules['city'] = 'required|string|max:100';
            $rules['country'] = 'required|string|max:100';
        }

        $validator = new Validator();
        $valid = $validator->validate($data, $rules);

        if (!$valid) {
            $response->validationError($validator->errors());
        }

        try {
            $user = $this->auth->register($data, $isOwner);
            $response->created($user, 'Registrierung erfolgreich.');
        } catch (\RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * POST /api/auth/login
     */
    public function login(Request $request, Response $response): never
    {
        $data = $request->input();

        $validator = new Validator();
        $valid = $validator->validate($data, [
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if (!$valid) {
            $response->validationError($validator->errors());
        }

        try {
            $result = $this->auth->login($data['email'], $data['password']);

            // Set session token as HttpOnly cookie
            $this->setSessionCookie($result['token']);

            // Return user only — token is NOT exposed to JavaScript
            $response->success($result['user'], 'Login erfolgreich.');
        } catch (\RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 401);
        }
    }

    /**
     * POST /api/auth/logout
     */
    public function logout(Request $request, Response $response): never
    {
        $token = $request->sessionToken();

        if ($token) {
            $this->auth->logout($token);
        }

        // Clear the session cookie
        $this->clearSessionCookie();

        $response->success(null, 'Logout erfolgreich.');
    }

    /**
     * GET /api/auth/me
     */
    public function me(Request $request, Response $response): never
    {
        $user = $request->param('auth_user');

        if ($user === null) {
            $response->unauthorized();
        }

        $response->success($user);
    }

    // ── Cookie Helpers ─────────────────────────────────────

    private function setSessionCookie(string $token): void
    {
        $name = \Core\Env::get('SESSION_COOKIE_NAME', 'grape_session');
        $lifetime = (int) \Core\Env::get('SESSION_LIFETIME_HOURS', '72');
        $secure = \Core\Env::get('SESSION_COOKIE_SECURE', 'false') === 'true';
        $samesite = \Core\Env::get('SESSION_COOKIE_SAMESITE', 'Lax');

        setcookie($name, $token, [
            'expires' => time() + ($lifetime * 3600),
            'path' => '/',
            'secure' => $secure,
            'httponly' => true,
            'samesite' => $samesite,
        ]);
    }

    private function clearSessionCookie(): void
    {
        $name = \Core\Env::get('SESSION_COOKIE_NAME', 'grape_session');
        $secure = \Core\Env::get('SESSION_COOKIE_SECURE', 'false') === 'true';

        setcookie($name, '', [
            'expires' => time() - 3600,
            'path' => '/',
            'secure' => $secure,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }
}