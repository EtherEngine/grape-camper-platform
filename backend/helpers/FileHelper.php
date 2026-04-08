<?php

declare(strict_types=1);

namespace Helpers;

use RuntimeException;

/**
 * Secure file-upload helper.
 *
 * – Validates real MIME type via finfo (not the user-supplied Content-Type)
 * – Enforces file-size limit
 * – Generates random, non-guessable filenames
 * – Blocks executable extensions & double-extensions
 */
class FileHelper
{
    /** Allowed MIME → canonical extension mapping. */
    private const ALLOWED_MIMES = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];

    /** Default max file size: 5 MB. */
    private const DEFAULT_MAX_SIZE = 5 * 1024 * 1024;

    /** Extensions that must never be stored on disk. */
    private const BLOCKED_EXTENSIONS = [
        'php',
        'phtml',
        'php3',
        'php4',
        'php5',
        'php7',
        'phps',
        'phar',
        'exe',
        'bat',
        'cmd',
        'sh',
        'cgi',
        'pl',
        'py',
        'rb',
        'js',
        'jsp',
        'asp',
        'aspx',
        'htaccess',
        'htpasswd',
        'svg',
        'shtml',
    ];

    /**
     * Validate an uploaded file from $_FILES.
     *
     * @param  array  $file     Single entry from $_FILES (tmp_name, size, error …)
     * @param  int    $maxSize  Maximum allowed bytes
     * @return string           Validated canonical extension (jpg|png|webp)
     *
     * @throws RuntimeException with HTTP status codes (422 / 500)
     */
    public static function validateImage(array $file, int $maxSize = self::DEFAULT_MAX_SIZE): string
    {
        // 1. Upload-Fehler prüfen
        if (!isset($file['tmp_name']) || $file['error'] !== UPLOAD_ERR_OK) {
            $msg = self::uploadErrorMessage($file['error'] ?? UPLOAD_ERR_NO_FILE);
            throw new RuntimeException($msg, 422);
        }

        // 2. Sicherstellen, dass es ein echtes Upload ist (gegen LFI)
        if (!is_uploaded_file($file['tmp_name'])) {
            throw new RuntimeException('Ungültige Upload-Datei.', 422);
        }

        // 3. Dateigröße prüfen
        if ($file['size'] > $maxSize) {
            $mbLimit = round($maxSize / 1024 / 1024, 1);
            throw new RuntimeException("Datei darf maximal {$mbLimit} MB groß sein.", 422);
        }

        // 4. Echten MIME-Type per finfo ermitteln (nicht den vom Client gesendeten)
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $realMime = $finfo->file($file['tmp_name']);

        if (!isset(self::ALLOWED_MIMES[$realMime])) {
            throw new RuntimeException('Nur JPEG, PNG und WebP Bilder erlaubt.', 422);
        }

        // 5. Originalnamen auf gefährliche Erweiterungen prüfen (double-ext)
        if (!empty($file['name'])) {
            self::assertNoBlockedExtension($file['name']);
        }

        return self::ALLOWED_MIMES[$realMime];
    }

    /**
     * Generate a secure, unique filename.
     *
     * Format: {prefix}_{timestamp}_{random}. {ext}
     */
    public static function generateFilename(string $prefix, string $extension): string
    {
        $random = bin2hex(random_bytes(12));
        $ts = time();

        return "{$prefix}_{$ts}_{$random}.{$extension}";
    }

    /**
     * Ensure target directory exists (creates recursively if needed).
     *
     * @throws RuntimeException if directory cannot be created
     */
    public static function ensureDirectory(string $path): void
    {
        if (!is_dir($path)) {
            if (!mkdir($path, 0755, true) && !is_dir($path)) {
                throw new RuntimeException('Upload-Verzeichnis konnte nicht erstellt werden.', 500);
            }
        }
    }

    /**
     * Move the uploaded file to the target path.
     *
     * @throws RuntimeException on failure
     */
    public static function moveUpload(string $tmpName, string $destination): void
    {
        if (!move_uploaded_file($tmpName, $destination)) {
            throw new RuntimeException('Datei konnte nicht gespeichert werden.', 500);
        }

        // Lesbar, aber nicht ausführbar
        chmod($destination, 0644);
    }

    /**
     * Delete a file if it exists. Returns true if deleted, false if not found.
     */
    public static function deleteFile(string $absolutePath): bool
    {
        if (file_exists($absolutePath) && is_file($absolutePath)) {
            return unlink($absolutePath);
        }
        return false;
    }

    // ── Private helpers ────────────────────────────────────

    /**
     * Reject filenames containing blocked extensions anywhere (double-ext attack).
     */
    private static function assertNoBlockedExtension(string $filename): void
    {
        $lower = strtolower($filename);

        // Prüfe jede Teil-Extension (z.B. "photo.php.jpg" → ["php", "jpg"])
        $parts = explode('.', $lower);
        array_shift($parts); // Basisname ignorieren

        foreach ($parts as $ext) {
            if (in_array($ext, self::BLOCKED_EXTENSIONS, true)) {
                throw new RuntimeException(
                    'Dateiname enthält eine unerlaubte Erweiterung.',
                    422
                );
            }
        }
    }

    /**
     * Human-readable upload error message.
     */
    private static function uploadErrorMessage(int $code): string
    {
        return match ($code) {
            UPLOAD_ERR_INI_SIZE,
            UPLOAD_ERR_FORM_SIZE => 'Datei überschreitet die erlaubte Größe.',
            UPLOAD_ERR_PARTIAL => 'Datei wurde nur teilweise hochgeladen.',
            UPLOAD_ERR_NO_FILE => 'Keine Datei wurde hochgeladen.',
            UPLOAD_ERR_NO_TMP_DIR => 'Temporäres Upload-Verzeichnis fehlt.',
            UPLOAD_ERR_CANT_WRITE => 'Datei konnte nicht geschrieben werden.',
            UPLOAD_ERR_EXTENSION => 'Upload durch Extension blockiert.',
            default => 'Unbekannter Upload-Fehler.',
        };
    }
}