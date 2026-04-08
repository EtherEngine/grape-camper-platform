<?php

declare(strict_types=1);

namespace Core;

/**
 * Static convenience accessor for the authenticated user.
 * Set by AuthMiddleware, read by controllers/services.
 */
class Auth
{
    private static ?array $user = null;

    public static function setUser(array $user): void
    {
        self::$user = $user;
    }

    public static function user(): ?array
    {
        return self::$user;
    }

    public static function id(): ?int
    {
        return self::$user ? (int) self::$user['id'] : null;
    }

    public static function role(): ?string
    {
        return self::$user['role_name'] ?? null;
    }

    public static function check(): bool
    {
        return self::$user !== null;
    }

    public static function is(string $role): bool
    {
        return self::role() === $role;
    }

    public static function isAny(string ...$roles): bool
    {
        return in_array(self::role(), $roles, true);
    }
}