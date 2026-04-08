<?php

declare(strict_types=1);

namespace Services;

use Repositories\UserRepository;
use RuntimeException;

class AuthService
{
    private UserRepository $users;

    public function __construct()
    {
        $this->users = new UserRepository();
    }

    /**
     * Register a new user. Returns the created user (without password_hash).
     */
    public function register(array $data, bool $asOwner = false): array
    {
        if ($this->users->emailExists($data['email'])) {
            throw new RuntimeException('E-Mail ist bereits registriert.', 409);
        }

        $roleName = $asOwner ? 'owner' : 'user';
        $roleId = $this->users->getRoleIdByName($roleName);
        if ($roleId === null) {
            throw new RuntimeException('Default role not found.', 500);
        }

        $passwordHash = password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => 12]);

        $userData = [
            'role_id' => $roleId,
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'email' => $data['email'],
            'password_hash' => $passwordHash,
            'phone' => $data['phone'] ?? null,
        ];

        if ($asOwner) {
            $userData['date_of_birth'] = $data['date_of_birth'] ?? null;
            $userData['street'] = $data['street'] ?? null;
            $userData['house_number'] = $data['house_number'] ?? null;
            $userData['postal_code'] = $data['postal_code'] ?? null;
            $userData['city'] = $data['city'] ?? null;
            $userData['country'] = $data['country'] ?? null;
        }

        $userId = $this->users->create($userData);

        $user = $this->users->findById($userId);

        return $this->sanitizeUser($user);
    }

    /**
     * Authenticate by e-mail + password. Returns [user, token].
     */
    public function login(string $email, string $password): array
    {
        $user = $this->users->findByEmail($email);

        if ($user === null || !password_verify($password, $user['password_hash'])) {
            throw new RuntimeException('Ungültige Anmeldedaten.', 401);
        }

        if (!(int) $user['is_active']) {
            throw new RuntimeException('Konto ist deaktiviert.', 403);
        }

        // Invalidate all existing sessions for this user (session rotation)
        $this->users->deleteUserSessions((int) $user['id']);

        // Generate cryptographically secure token
        $token = bin2hex(random_bytes(32)); // 64 hex chars → matches CHAR(64)

        $lifetime = (int) \Core\Env::get('SESSION_LIFETIME_HOURS', '72');
        $this->users->createSession((int) $user['id'], $token, $lifetime);
        $this->users->updateLastLogin((int) $user['id']);

        return [
            'user' => $this->sanitizeUser($user),
            'token' => $token,
        ];
    }

    /**
     * Destroy a session by token.
     */
    public function logout(string $token): void
    {
        $this->users->deleteSession($token);
    }

    /**
     * Resolve a session token to a user. Returns null if invalid/expired.
     */
    public function resolveToken(string $token): ?array
    {
        // Validate token format before DB query (must be 64 hex chars)
        if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
            return null;
        }

        $user = $this->users->findBySessionToken($token);

        if ($user === null) {
            return null;
        }

        $this->users->touchSession($token);

        return $this->sanitizeUser($user);
    }

    /**
     * Remove sensitive fields before returning user data.
     */
    private function sanitizeUser(array $user): array
    {
        unset(
            $user['password_hash'],
            $user['session_id'],
            $user['session_expires_at']
        );

        return $user;
    }
}