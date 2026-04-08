<?php

declare(strict_types=1);

namespace Core;

use Config\DatabaseConfig;
use mysqli;
use mysqli_result;
use RuntimeException;

class Database
{
    private static ?self $instance = null;
    private mysqli $connection;
    private int $transactionDepth = 0;

    private function __construct()
    {
        $config = DatabaseConfig::get();

        mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

        $this->connection = new mysqli(
            $config['host'],
            $config['user'],
            $config['pass'],
            $config['name'],
            $config['port']
        );

        $this->connection->set_charset($config['charset']);
    }

    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }

        return self::$instance;
    }

    public function getConnection(): mysqli
    {
        return $this->connection;
    }

    /**
     * Execute a prepared statement and return the result.
     *
     * @param string $sql    SQL query with ? placeholders
     * @param array  $params Bind parameters
     * @param string $types  Type string (s=string, i=int, d=double, b=blob). Auto-detected if empty.
     */
    public function query(string $sql, array $params = [], string $types = ''): mysqli_result|bool
    {
        $stmt = $this->connection->prepare($sql);

        if ($stmt === false) {
            throw new RuntimeException("Failed to prepare statement: {$this->connection->error}");
        }

        if (!empty($params)) {
            if ($types === '') {
                $types = $this->detectTypes($params);
            }
            $stmt->bind_param($types, ...$params);
        }

        $stmt->execute();
        $result = $stmt->get_result();

        if ($result === false) {
            // Non-SELECT query — return boolean success
            $success = $stmt->affected_rows >= 0;
            $stmt->close();
            return $success;
        }

        $stmt->close();
        return $result;
    }

    /**
     * Fetch all rows as associative arrays.
     */
    public function fetchAll(string $sql, array $params = [], string $types = ''): array
    {
        $result = $this->query($sql, $params, $types);

        if ($result instanceof mysqli_result) {
            return $result->fetch_all(MYSQLI_ASSOC);
        }

        return [];
    }

    /**
     * Fetch a single row as associative array.
     */
    public function fetchOne(string $sql, array $params = [], string $types = ''): ?array
    {
        $result = $this->query($sql, $params, $types);

        if ($result instanceof mysqli_result) {
            $row = $result->fetch_assoc();
            return $row ?: null;
        }

        return null;
    }

    /**
     * Execute an INSERT/UPDATE/DELETE and return affected rows.
     */
    public function execute(string $sql, array $params = [], string $types = ''): int
    {
        $stmt = $this->connection->prepare($sql);

        if ($stmt === false) {
            throw new RuntimeException("Failed to prepare statement: {$this->connection->error}");
        }

        if (!empty($params)) {
            if ($types === '') {
                $types = $this->detectTypes($params);
            }
            $stmt->bind_param($types, ...$params);
        }

        $stmt->execute();
        $affected = $stmt->affected_rows;
        $stmt->close();

        return $affected;
    }

    public function lastInsertId(): int
    {
        return (int) $this->connection->insert_id;
    }

    public function beginTransaction(): void
    {
        if ($this->transactionDepth === 0) {
            $this->connection->begin_transaction();
        } else {
            $this->connection->savepoint("sp_{$this->transactionDepth}");
        }
        $this->transactionDepth++;
    }

    public function commit(): void
    {
        if ($this->transactionDepth <= 0) {
            throw new RuntimeException('No active transaction to commit.');
        }
        $this->transactionDepth--;
        if ($this->transactionDepth === 0) {
            $this->connection->commit();
        } else {
            $this->connection->release_savepoint("sp_{$this->transactionDepth}");
        }
    }

    public function rollback(): void
    {
        if ($this->transactionDepth <= 0) {
            throw new RuntimeException('No active transaction to rollback.');
        }
        $this->transactionDepth--;
        if ($this->transactionDepth === 0) {
            $this->connection->rollback();
        } else {
            $this->execute("ROLLBACK TO SAVEPOINT sp_{$this->transactionDepth}");
        }
    }

    public function inTransaction(): bool
    {
        return $this->transactionDepth > 0;
    }

    private function detectTypes(array $params): string
    {
        $types = '';
        foreach ($params as $param) {
            $types .= match (true) {
                is_int($param) => 'i',
                is_float($param) => 'd',
                default => 's',
            };
        }
        return $types;
    }

    private function __clone()
    {
    }
    public function __wakeup()
    {
        throw new RuntimeException('Cannot unserialize singleton.');
    }
}