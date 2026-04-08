<?php

declare(strict_types=1);

namespace Core;

use Throwable;

class ErrorHandler
{
    public static function register(): void
    {
        set_error_handler([self::class, 'handleError']);
        set_exception_handler([self::class, 'handleException']);
        register_shutdown_function([self::class, 'handleShutdown']);
    }

    public static function handleError(int $severity, string $message, string $file, int $line): bool
    {
        if (!(error_reporting() & $severity)) {
            return false;
        }

        throw new \ErrorException($message, 0, $severity, $file, $line);
    }

    public static function handleException(Throwable $e): void
    {
        $code = $e->getCode();
        $httpCode = ($code >= 400 && $code < 600) ? $code : 500;

        self::logError($e);

        http_response_code($httpCode);
        header('Content-Type: application/json; charset=utf-8');

        $response = [
            'success' => false,
            'error' => [
                'message' => $httpCode === 500 && !self::isDebug()
                    ? 'Internal Server Error'
                    : $e->getMessage(),
                'code' => $httpCode,
            ],
        ];

        if (self::isDebug()) {
            $response['error']['file'] = $e->getFile();
            $response['error']['line'] = $e->getLine();
            $response['error']['trace'] = array_slice(
                array_map(fn($frame) => [
                    'file' => $frame['file'] ?? 'unknown',
                    'line' => $frame['line'] ?? 0,
                    'function' => ($frame['class'] ?? '') . ($frame['type'] ?? '') . ($frame['function'] ?? ''),
                ], $e->getTrace()),
                0,
                10
            );
        }

        echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        exit(1);
    }

    public static function handleShutdown(): void
    {
        $error = error_get_last();

        if ($error !== null && in_array($error['type'], [E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR, E_PARSE], true)) {
            self::handleException(
                new \ErrorException($error['message'], 0, $error['type'], $error['file'], $error['line'])
            );
        }
    }

    private static function logError(Throwable $e): void
    {
        $logDir = defined('BASE_PATH') ? BASE_PATH . '/storage/logs' : __DIR__ . '/../storage/logs';

        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }

        $logFile = $logDir . '/error-' . date('Y-m-d') . '.log';
        $timestamp = date('Y-m-d H:i:s');

        $entry = sprintf(
            "[%s] %s: %s in %s:%d\nTrace: %s\n\n",
            $timestamp,
            get_class($e),
            $e->getMessage(),
            $e->getFile(),
            $e->getLine(),
            $e->getTraceAsString()
        );

        error_log($entry, 3, $logFile);
    }

    private static function isDebug(): bool
    {
        return Env::get('APP_DEBUG', 'false') === 'true';
    }
}
