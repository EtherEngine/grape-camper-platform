<?php

declare(strict_types=1);

namespace Core;

use RuntimeException;

class Router
{
    private array $routes = [];
    private Request $request;
    private Response $response;
    private array $middleware = [];

    public function __construct(Request $request, Response $response)
    {
        $this->request = $request;
        $this->response = $response;
    }

    public function get(string $path, array|callable $handler, array $middleware = []): self
    {
        return $this->add('GET', $path, $handler, $middleware);
    }

    public function post(string $path, array|callable $handler, array $middleware = []): self
    {
        return $this->add('POST', $path, $handler, $middleware);
    }

    public function put(string $path, array|callable $handler, array $middleware = []): self
    {
        return $this->add('PUT', $path, $handler, $middleware);
    }

    public function patch(string $path, array|callable $handler, array $middleware = []): self
    {
        return $this->add('PATCH', $path, $handler, $middleware);
    }

    public function delete(string $path, array|callable $handler, array $middleware = []): self
    {
        return $this->add('DELETE', $path, $handler, $middleware);
    }

    public function add(string $method, string $path, array|callable $handler, array $middleware = []): self
    {
        $this->routes[] = [
            'method' => strtoupper($method),
            'path' => $path,
            'handler' => $handler,
            'middleware' => $middleware,
        ];

        return $this;
    }

    public function group(array $options, callable $callback): void
    {
        $prefix = $options['prefix'] ?? '';
        $middleware = $options['middleware'] ?? [];

        $previousRoutes = count($this->routes);
        $callback($this);

        // Apply prefix and middleware to newly added routes
        for ($i = $previousRoutes, $count = count($this->routes); $i < $count; $i++) {
            $this->routes[$i]['path'] = $prefix . $this->routes[$i]['path'];
            $this->routes[$i]['middleware'] = array_merge($middleware, $this->routes[$i]['middleware']);
        }
    }

    public function dispatch(): void
    {
        $uri = $this->request->uri();
        $method = $this->request->method();

        foreach ($this->routes as $route) {
            $params = $this->matchRoute($route['path'], $uri);

            if ($params !== false && $route['method'] === $method) {
                $this->request->setParams($params);

                // Execute middleware chain
                foreach ($route['middleware'] as $mw) {
                    if (is_object($mw) && method_exists($mw, 'handle')) {
                        $mw->handle($this->request, $this->response);
                    } elseif (is_string($mw) && class_exists($mw)) {
                        $instance = new $mw();
                        $instance->handle($this->request, $this->response);
                    } elseif (is_callable($mw)) {
                        $mw($this->request, $this->response);
                    }
                }

                // Execute handler
                $handler = $route['handler'];

                if (is_array($handler) && count($handler) === 2) {
                    [$class, $methodName] = $handler;
                    if (is_string($class)) {
                        $class = new $class();
                    }
                    $class->$methodName($this->request, $this->response);
                } elseif (is_callable($handler)) {
                    $handler($this->request, $this->response);
                }

                return;
            }
        }

        $this->response->notFound('Route not found.');
    }

    /**
     * Match a route pattern against a URI.
     * Supports {param} placeholders.
     * Returns associative array of params on match, false otherwise.
     */
    private function matchRoute(string $pattern, string $uri): array|false
    {
        // Exact match (fast path)
        if ($pattern === $uri) {
            return [];
        }

        // Convert pattern to regex: {id} → (?P<id>[^/]+)
        $regex = preg_replace('/\{([a-zA-Z_]+)\}/', '(?P<$1>[^/]+)', $pattern);
        $regex = '#^' . $regex . '$#';

        if (preg_match($regex, $uri, $matches)) {
            return array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
        }

        return false;
    }
}