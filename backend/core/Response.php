<?php

declare(strict_types=1);

namespace Core;

use Helpers\ResponseHelper;

class Response
{
    public function json(mixed $data, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        exit;
    }

    public function success(mixed $data = null, string $message = 'OK', int $status = 200): never
    {
        $this->json(ResponseHelper::success($data, $message), $status);
    }

    public function error(string $message, int $status = 400, array $errors = []): never
    {
        $this->json(ResponseHelper::error($message, $status, $errors), $status);
    }

    public function notFound(string $message = 'Resource not found.'): never
    {
        $this->error($message, 404);
    }

    public function unauthorized(string $message = 'Unauthorized.'): never
    {
        $this->error($message, 401);
    }

    public function forbidden(string $message = 'Forbidden.'): never
    {
        $this->error($message, 403);
    }

    public function validationError(array $errors): never
    {
        $this->json(ResponseHelper::validation($errors), 422);
    }

    public function created(mixed $data = null, string $message = 'Created.'): never
    {
        $this->success($data, $message, 201);
    }

    public function noContent(): never
    {
        http_response_code(204);
        exit;
    }

    public function paginated(array $items, int $page, int $perPage, int $total, string $message = 'OK'): never
    {
        $this->json(ResponseHelper::paginated($items, $page, $perPage, $total, $message));
    }
}