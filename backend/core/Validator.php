<?php

declare(strict_types=1);

namespace Core;

class Validator
{
    private array $errors = [];

    public function validate(array $data, array $rules): bool
    {
        $this->errors = [];

        foreach ($rules as $field => $ruleSet) {
            $ruleList = is_string($ruleSet) ? explode('|', $ruleSet) : $ruleSet;
            $value = $data[$field] ?? null;
            $isNullable = in_array('nullable', $ruleList, true);

            // If nullable and value is empty, skip all validation for this field
            if ($isNullable && ($value === null || $value === '')) {
                continue;
            }

            foreach ($ruleList as $rule) {
                $params = [];
                if (str_contains($rule, ':')) {
                    [$rule, $paramStr] = explode(':', $rule, 2);
                    $params = explode(',', $paramStr);
                }

                $method = 'rule' . ucfirst($rule);

                if (method_exists($this, $method)) {
                    $error = $this->$method($field, $value, $params, $data);
                    if ($error !== null) {
                        $this->errors[$field][] = $error;
                        // Stop on first error per field for 'required'
                        if ($rule === 'required') {
                            break;
                        }
                    }
                }
            }
        }

        return empty($this->errors);
    }

    public function errors(): array
    {
        return $this->errors;
    }

    // ── Rules ──────────────────────────────────────────────

    private function ruleRequired(string $field, mixed $value): ?string
    {
        if ($value === null || $value === '' || $value === []) {
            return "{$field} ist erforderlich.";
        }
        return null;
    }

    private function ruleEmail(string $field, mixed $value): ?string
    {
        if ($value !== null && $value !== '' && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
            return "{$field} muss eine gültige E-Mail-Adresse sein.";
        }
        return null;
    }

    private function ruleMin(string $field, mixed $value, array $params): ?string
    {
        $min = (int) ($params[0] ?? 0);
        if (is_string($value) && mb_strlen($value) < $min) {
            return "{$field} muss mindestens {$min} Zeichen lang sein.";
        }
        return null;
    }

    private function ruleMax(string $field, mixed $value, array $params): ?string
    {
        $max = (int) ($params[0] ?? 0);
        if (is_string($value) && mb_strlen($value) > $max) {
            return "{$field} darf maximal {$max} Zeichen lang sein.";
        }
        return null;
    }

    private function ruleConfirmed(string $field, mixed $value, array $params, array $data): ?string
    {
        $confirmField = $params[0] ?? $field . '_confirmation';
        if ($value !== ($data[$confirmField] ?? null)) {
            return "{$field} stimmt nicht überein.";
        }
        return null;
    }

    private function ruleString(string $field, mixed $value): ?string
    {
        if ($value !== null && $value !== '' && !is_string($value)) {
            return "{$field} muss ein Text sein.";
        }
        return null;
    }

    private function ruleNumeric(string $field, mixed $value): ?string
    {
        if ($value !== null && $value !== '' && !is_numeric($value)) {
            return "{$field} muss eine Zahl sein.";
        }
        return null;
    }

    private function ruleInteger(string $field, mixed $value): ?string
    {
        if ($value !== null && $value !== '' && filter_var($value, FILTER_VALIDATE_INT) === false) {
            return "{$field} muss eine ganze Zahl sein.";
        }
        return null;
    }

    private function ruleIn(string $field, mixed $value, array $params): ?string
    {
        if ($value !== null && $value !== '' && !in_array((string) $value, $params, true)) {
            return "{$field} hat einen ungültigen Wert.";
        }
        return null;
    }

    private function ruleMinValue(string $field, mixed $value, array $params): ?string
    {
        $min = (float) ($params[0] ?? 0);
        if ($value !== null && $value !== '' && is_numeric($value) && (float) $value < $min) {
            return "{$field} muss mindestens {$min} sein.";
        }
        return null;
    }

    private function ruleMaxValue(string $field, mixed $value, array $params): ?string
    {
        $max = (float) ($params[0] ?? 0);
        if ($value !== null && $value !== '' && is_numeric($value) && (float) $value > $max) {
            return "{$field} darf maximal {$max} sein.";
        }
        return null;
    }

    private function ruleNullable(string $field, mixed $value): ?string
    {
        // Marker rule — handled implicitly: if value is null/empty, skip subsequent rules.
        return null;
    }

    // ── New rules ──────────────────────────────────────────

    private function ruleDecimal(string $field, mixed $value, array $params): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        $places = (int) ($params[0] ?? 2);
        $pattern = '/^\d+(\.\d{1,' . $places . '})?$/';
        if (!preg_match($pattern, (string) $value)) {
            return "{$field} muss eine Dezimalzahl mit max. {$places} Nachkommastellen sein.";
        }
        return null;
    }

    private function ruleDate(string $field, mixed $value, array $params): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        $format = $params[0] ?? 'Y-m-d';
        $dt = \DateTimeImmutable::createFromFormat($format, (string) $value);
        if (!$dt || $dt->format($format) !== (string) $value) {
            return "{$field} muss ein gültiges Datum im Format {$format} sein.";
        }
        return null;
    }

    private function ruleDateAfter(string $field, mixed $value, array $params, array $data): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        $otherField = $params[0] ?? '';
        $otherValue = $data[$otherField] ?? null;
        if ($otherValue !== null && (string) $value <= (string) $otherValue) {
            return "{$field} muss nach {$otherField} liegen.";
        }
        return null;
    }

    private function ruleDateAfterOrEqual(string $field, mixed $value, array $params, array $data): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        $otherField = $params[0] ?? '';
        $otherValue = $data[$otherField] ?? null;
        if ($otherValue !== null && (string) $value < (string) $otherValue) {
            return "{$field} muss gleich oder nach {$otherField} liegen.";
        }
        return null;
    }

    private function ruleArray(string $field, mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!is_array($value)) {
            return "{$field} muss ein Array sein.";
        }
        return null;
    }

    private function ruleArrayMin(string $field, mixed $value, array $params): ?string
    {
        $min = (int) ($params[0] ?? 0);
        if (is_array($value) && count($value) < $min) {
            return "{$field} muss mindestens {$min} Einträge enthalten.";
        }
        return null;
    }

    private function ruleArrayMax(string $field, mixed $value, array $params): ?string
    {
        $max = (int) ($params[0] ?? 0);
        if (is_array($value) && count($value) > $max) {
            return "{$field} darf maximal {$max} Einträge enthalten.";
        }
        return null;
    }

    private function ruleBool(string $field, mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!in_array($value, [true, false, 0, 1, '0', '1'], true)) {
            return "{$field} muss ein Wahrheitswert sein.";
        }
        return null;
    }

    private function ruleUrl(string $field, mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!filter_var($value, FILTER_VALIDATE_URL)) {
            return "{$field} muss eine gültige URL sein.";
        }
        return null;
    }

    private function ruleRegex(string $field, mixed $value, array $params): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        $pattern = $params[0] ?? '';
        if ($pattern !== '' && !preg_match($pattern, (string) $value)) {
            return "{$field} hat ein ungültiges Format.";
        }
        return null;
    }

    // ── File validation ────────────────────────────────────

    /**
     * Validate a $_FILES entry. Usage:  $validator->validateFile($_FILES['image'], [...rules])
     */
    public function validateFile(array $file, array $rules): bool
    {
        $field = $rules['field'] ?? 'file';

        if (empty($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
            if (!empty($rules['required'])) {
                $this->errors[$field][] = "{$field} ist erforderlich.";
            }
            return empty($this->errors);
        }

        if ($file['error'] !== UPLOAD_ERR_OK) {
            $this->errors[$field][] = "Upload von {$field} fehlgeschlagen (Fehlercode: {$file['error']}).";
            return false;
        }

        // Max size in bytes
        if (!empty($rules['maxSize']) && $file['size'] > $rules['maxSize']) {
            $maxMb = round($rules['maxSize'] / 1048576, 1);
            $this->errors[$field][] = "{$field} darf maximal {$maxMb} MB groß sein.";
        }

        // Allowed MIME types
        if (!empty($rules['mimes']) && is_array($rules['mimes'])) {
            $finfo = new \finfo(FILEINFO_MIME_TYPE);
            $mime = $finfo->file($file['tmp_name']);
            if (!in_array($mime, $rules['mimes'], true)) {
                $allowed = implode(', ', $rules['mimes']);
                $this->errors[$field][] = "{$field} muss vom Typ {$allowed} sein.";
            }
        }

        // Allowed extensions
        if (!empty($rules['extensions']) && is_array($rules['extensions'])) {
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            if (!in_array($ext, $rules['extensions'], true)) {
                $allowed = implode(', ', $rules['extensions']);
                $this->errors[$field][] = "{$field} muss die Endung {$allowed} haben.";
            }
        }

        return empty($this->errors);
    }

    // ── Helper methods ─────────────────────────────────────

    /**
     * Return the first error message per field as flat array.
     */
    public function firstErrors(): array
    {
        $flat = [];
        foreach ($this->errors as $field => $messages) {
            $flat[$field] = $messages[0];
        }
        return $flat;
    }

    /**
     * Return all errors as a single flat list of strings.
     */
    public function flatErrors(): array
    {
        $list = [];
        foreach ($this->errors as $messages) {
            foreach ($messages as $msg) {
                $list[] = $msg;
            }
        }
        return $list;
    }

    /**
     * Check if a specific field has errors.
     */
    public function hasError(string $field): bool
    {
        return !empty($this->errors[$field]);
    }

    /**
     * Add a custom error from outside (e.g. business-logic checks).
     */
    public function addError(string $field, string $message): void
    {
        $this->errors[$field][] = $message;
    }
}