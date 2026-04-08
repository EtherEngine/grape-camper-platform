<?php

declare(strict_types=1);

namespace Services;

use Helpers\FileHelper;
use RuntimeException;

/**
 * Central upload service for all image uploads.
 *
 * Delegates validation to FileHelper and owns the upload directory layout.
 */
class UploadService
{
    /** Max image size (5 MB). */
    private const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

    /** Upload sub-directories per context. */
    private const UPLOAD_DIRS = [
        'vehicles' => '/public/uploads/vehicles',
        'swaps' => '/public/uploads/swaps',
    ];

    /**
     * Upload an image for a vehicle.
     *
     * @param  array  $file       $_FILES['image'] entry
     * @param  int    $vehicleId  Vehicle ID (used in filename prefix)
     * @return string             Relative web path (e.g. /uploads/vehicles/veh_12_abc.jpg)
     */
    public function uploadVehicleImage(array $file, int $vehicleId): string
    {
        return $this->processUpload($file, 'vehicles', "veh_{$vehicleId}");
    }

    /**
     * Upload an image for a swap offer.
     *
     * @param  array  $file    $_FILES['image'] entry
     * @param  int    $swapId  Swap offer ID
     * @return string          Relative web path
     */
    public function uploadSwapImage(array $file, int $swapId): string
    {
        return $this->processUpload($file, 'swaps', "swap_{$swapId}");
    }

    /**
     * Delete a previously uploaded file by its relative web path.
     *
     * @param  string $relativePath  e.g. /uploads/vehicles/veh_12_abc.jpg
     * @return bool
     */
    public function delete(string $relativePath): bool
    {
        // Path-Traversal verhindern
        $clean = self::sanitisePath($relativePath);

        $absolutePath = BASE_PATH . '/public' . $clean;

        return FileHelper::deleteFile($absolutePath);
    }

    // ── Internal ───────────────────────────────────────────

    /**
     * Validate, generate filename, move file.
     *
     * @throws RuntimeException
     */
    private function processUpload(array $file, string $context, string $prefix): string
    {
        if (!isset(self::UPLOAD_DIRS[$context])) {
            throw new RuntimeException("Unbekannter Upload-Kontext: {$context}", 500);
        }

        // 1. Validate (MIME, size, extension)
        $ext = FileHelper::validateImage($file, self::MAX_IMAGE_SIZE);

        // 2. Prepare target directory
        $uploadDir = BASE_PATH . self::UPLOAD_DIRS[$context];
        FileHelper::ensureDirectory($uploadDir);

        // 3. Generate safe filename
        $filename = FileHelper::generateFilename($prefix, $ext);

        // 4. Move
        $destination = $uploadDir . '/' . $filename;
        FileHelper::moveUpload($file['tmp_name'], $destination);

        // Return relative web path (from /public)
        return '/uploads/' . $context . '/' . $filename;
    }

    /**
     * Sanitise a relative path to prevent directory traversal.
     */
    private static function sanitisePath(string $path): string
    {
        // Nur erlaubte Zeichen: Buchstaben, Ziffern, /, -, _, .
        $path = preg_replace('#[^a-zA-Z0-9/_.\-]#', '', $path);

        // ".." entfernen
        $path = str_replace('..', '', $path);

        // Sicherstellen, dass der Pfad mit /uploads/ beginnt
        if (!str_starts_with($path, '/uploads/')) {
            throw new RuntimeException('Ungültiger Dateipfad.', 400);
        }

        return $path;
    }
}