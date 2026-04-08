<?php

declare(strict_types=1);

namespace Core;

class Request
{
    private array $params = [];
    private ?array $parsedBody = null;

    public function method(): string
    {
        return strtoupper($_SERVER['REQUEST_METHOD']);
    }

    public function uri(): string
    {
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        $path = parse_url($uri, PHP_URL_PATH);

        // Strip base path (e.g. /grape/backend/public) so routes match /api/...
        $scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
        $basePath = dirname($scriptName);

        // Case-insensitive comparison (Windows: folder GRAPE vs URL /grape)
        if ($basePath !== '/' && $basePath !== '\\' && str_starts_with(strtolower($path), strtolower($basePath))) {
            $path = substr($path, strlen($basePath));
            if ($path === '' || $path === false) {
                $path = '/';
            }
        }

        // Strip trailing slash (except root)
        if ($path !== '/' && str_ends_with($path, '/')) {
            $path = rtrim($path, '/');
        }

        return $path;
    }

    public function input(?string $key = null, mixed $default = null): mixed
    {
        if ($this->parsedBody === null) {
            $raw = file_get_contents('php://input');
            $decoded = json_decode($raw, true);
            $this->parsedBody = is_array($decoded) ? $decoded : [];
        }

        if ($key === null) {
            return $this->parsedBody;
        }

        return $this->parsedBody[$key] ?? $default;
    }

    public function query(?string $key = null, mixed $default = null): mixed
    {
        if ($key === null) {
            return $_GET;
        }

        return $_GET[$key] ?? $default;
    }

    public function param(string $key, mixed $default = null): mixed
    {
        return $this->params[$key] ?? $default;
    }

    public function setParams(array $params): void
    {
        $this->params = $params;
    }

    public function mergeParams(array $params): void
    {
        $this->params = array_merge($this->params, $params);
    }

    public function header(string $name): ?string
    {
        $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
        return $_SERVER[$key] ?? null;
    }

    public function bearerToken(): ?string
    {
        $header = $this->header('Authorization');

        if ($header !== null && str_starts_with($header, 'Bearer ')) {
            return substr($header, 7);
        }

        return null;
    }

    public function cookie(string $name, mixed $default = null): mixed
    {
        return $_COOKIE[$name] ?? $default;
    }

    /**
     * Resolve session token: HttpOnly cookie first, then Bearer header fallback.
     */
    public function sessionToken(): ?string
    {
        $cookieName = \Core\Env::get('SESSION_COOKIE_NAME', 'grape_session');
        return $this->cookie($cookieName) ?? $this->bearerToken();
    }

    public function all(): array
    {
        return array_merge($this->query() ?? [], $this->input() ?? []);
    }
}