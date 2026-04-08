<?php

declare(strict_types=1);

namespace Services;

use Core\Database;
use Repositories\BookingRepository;
use Repositories\VehicleRepository;
use RuntimeException;
use DateTimeImmutable;
use DateInterval;
use DatePeriod;

class AvailabilityService
{
    private Database $db;
    private BookingRepository $bookings;
    private VehicleRepository $vehicles;

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->bookings = new BookingRepository();
        $this->vehicles = new VehicleRepository();
    }

    // ── Main calendar endpoint ─────────────────────────────

    /**
     * Get availability for a vehicle in a date range.
     *
     * Returns a day-by-day map plus summary arrays for the frontend calendar.
     *
     * @return array{
     *   vehicle_id: int,
     *   start_date: string,
     *   end_date: string,
     *   days: array<string, array{date: string, status: string, reason: string|null}>,
     *   summary: array{total_days: int, available: int, blocked: int},
     *   blocked_periods: array
     * }
     */
    public function getCalendar(int $vehicleId, string $startDate, string $endDate): array
    {
        $vehicle = $this->vehicles->findById($vehicleId);
        if ($vehicle === null) {
            throw new RuntimeException('Fahrzeug nicht gefunden.', 404);
        }

        $this->validateDateRange($startDate, $endDate);

        $start = new DateTimeImmutable($startDate);
        $end = new DateTimeImmutable($endDate);

        // 1. Load availability_rules for the range
        $rules = $this->loadRules($vehicleId, $startDate, $endDate);

        // 2. Load blocking bookings for the range
        $bookingPeriods = $this->bookings->findBlockingPeriods($vehicleId, $startDate, $endDate);

        // 3. Build day-by-day map
        $days = [];
        $available = 0;
        $blocked = 0;

        $period = new DatePeriod($start, new DateInterval('P1D'), $end->modify('+1 day'));

        foreach ($period as $day) {
            $dateStr = $day->format('Y-m-d');
            $dayInfo = $this->resolveDayStatus($dateStr, $rules, $bookingPeriods);
            $days[$dateStr] = $dayInfo;

            if ($dayInfo['status'] === 'available') {
                $available++;
            } else {
                $blocked++;
            }
        }

        // 4. Build blocked_periods summary (contiguous blocked ranges)
        $blockedPeriods = $this->buildBlockedPeriods($days);

        return [
            'vehicle_id' => $vehicleId,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'days' => $days,
            'summary' => [
                'total_days' => $available + $blocked,
                'available' => $available,
                'blocked' => $blocked,
            ],
            'blocked_periods' => $blockedPeriods,
        ];
    }

    // ── Conflict check for a new booking ───────────────────

    /**
     * Check if a date range is bookable for a vehicle.
     *
     * @return array{
     *   available: bool,
     *   vehicle_id: int,
     *   start_date: string,
     *   end_date: string,
     *   days_count: int,
     *   conflicts: array,
     *   minimum_rental_days: int,
     *   maximum_rental_days: int|null
     * }
     */
    public function checkAvailability(
        int $vehicleId,
        string $startDate,
        string $endDate,
        ?int $excludeBookingId = null
    ): array {
        $vehicle = $this->vehicles->findById($vehicleId);
        if ($vehicle === null) {
            throw new RuntimeException('Fahrzeug nicht gefunden.', 404);
        }

        if ($vehicle['status'] !== 'active') {
            throw new RuntimeException('Fahrzeug ist nicht verfügbar.', 400);
        }

        $this->validateDateRange($startDate, $endDate);

        $start = new DateTimeImmutable($startDate);
        $end = new DateTimeImmutable($endDate);
        $daysCount = (int) $start->diff($end)->days;

        $conflicts = [];
        $isAvailable = true;

        // 1. Check minimum/maximum rental days
        $minDays = (int) $vehicle['minimum_rental_days'];
        $maxDays = $vehicle['maximum_rental_days'] !== null ? (int) $vehicle['maximum_rental_days'] : null;

        if ($daysCount < $minDays) {
            $isAvailable = false;
            $conflicts[] = [
                'type' => 'minimum_rental',
                'message' => "Mindestmietdauer ist {$minDays} Tage.",
            ];
        }

        if ($maxDays !== null && $daysCount > $maxDays) {
            $isAvailable = false;
            $conflicts[] = [
                'type' => 'maximum_rental',
                'message' => "Maximalmietdauer ist {$maxDays} Tage.",
            ];
        }

        // 2. Check availability_rules (blocked/maintenance/owner_reserved days)
        $ruleConflicts = $this->findRuleConflicts($vehicleId, $startDate, $endDate);
        if (!empty($ruleConflicts)) {
            $isAvailable = false;
            foreach ($ruleConflicts as $rc) {
                $conflicts[] = [
                    'type' => 'rule_' . $rc['rule_type'],
                    'start_date' => $rc['start_date'],
                    'end_date' => $rc['end_date'],
                    'message' => $this->ruleTypeLabel($rc['rule_type']) . ': ' .
                        $rc['start_date'] . ' – ' . $rc['end_date'],
                    'reason' => $rc['reason'],
                ];
            }
        }

        // 3. Check existing bookings
        $bookingConflicts = $this->bookings->findBlockingBookings(
            $vehicleId,
            $startDate,
            $endDate,
            $excludeBookingId
        );
        if (!empty($bookingConflicts)) {
            $isAvailable = false;
            foreach ($bookingConflicts as $bc) {
                $conflicts[] = [
                    'type' => 'booking',
                    'booking_id' => (int) $bc['id'],
                    'start_date' => $bc['start_date'],
                    'end_date' => $bc['end_date'],
                    'status' => $bc['status'],
                    'message' => 'Bestehende Buchung: ' . $bc['start_date'] . ' – ' . $bc['end_date'],
                ];
            }
        }

        return [
            'available' => $isAvailable,
            'vehicle_id' => $vehicleId,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'days_count' => $daysCount,
            'conflicts' => $conflicts,
            'minimum_rental_days' => $minDays,
            'maximum_rental_days' => $maxDays,
        ];
    }

    // ── Private helpers ────────────────────────────────────

    /**
     * Load availability rules overlapping the date range.
     */
    private function loadRules(int $vehicleId, string $startDate, string $endDate): array
    {
        $sql = "SELECT id, start_date, end_date, rule_type, reason
                FROM availability_rules
                WHERE vehicle_id = ?
                  AND start_date <= ?
                  AND end_date >= ?
                ORDER BY start_date ASC";

        return $this->db->fetchAll($sql, [$vehicleId, $endDate, $startDate]);
    }

    /**
     * Find rules that block any day in the requested range.
     * Only returns non-'available' rules.
     */
    private function findRuleConflicts(int $vehicleId, string $startDate, string $endDate): array
    {
        $sql = "SELECT id, start_date, end_date, rule_type, reason
                FROM availability_rules
                WHERE vehicle_id = ?
                  AND start_date <= ?
                  AND end_date >= ?
                  AND rule_type != 'available'
                ORDER BY start_date ASC";

        return $this->db->fetchAll($sql, [$vehicleId, $endDate, $startDate]);
    }

    /**
     * Determine the status of a single day based on rules and bookings.
     *
     * Priority: booking > rule (blocked/maintenance/owner_reserved) > rule (available) > default (available).
     */
    private function resolveDayStatus(string $date, array $rules, array $bookingPeriods): array
    {
        // Check bookings first (highest priority)
        foreach ($bookingPeriods as $bp) {
            if ($date >= $bp['start_date'] && $date < $bp['end_date']) {
                return [
                    'date' => $date,
                    'status' => 'booked',
                    'reason' => 'Gebucht (' . $bp['status'] . ')',
                ];
            }
        }

        // Check rules — blocking rules override available rules
        $matchedRule = null;
        foreach ($rules as $rule) {
            if ($date >= $rule['start_date'] && $date <= $rule['end_date']) {
                if ($rule['rule_type'] !== 'available') {
                    // Blocking rule found — immediately return
                    return [
                        'date' => $date,
                        'status' => $rule['rule_type'],
                        'reason' => $rule['reason'] ?? $this->ruleTypeLabel($rule['rule_type']),
                    ];
                }
                // Track 'available' rule in case we need it
                $matchedRule = $rule;
            }
        }

        // If an explicit 'available' rule exists, or no rule at all → available
        return [
            'date' => $date,
            'status' => 'available',
            'reason' => null,
        ];
    }

    /**
     * Build contiguous blocked periods from the day map.
     */
    private function buildBlockedPeriods(array $days): array
    {
        $periods = [];
        $current = null;

        foreach ($days as $dateStr => $info) {
            if ($info['status'] !== 'available') {
                if ($current === null) {
                    $current = [
                        'start_date' => $dateStr,
                        'end_date' => $dateStr,
                        'status' => $info['status'],
                        'reason' => $info['reason'],
                    ];
                } else {
                    $current['end_date'] = $dateStr;
                    // If status changes, close period and start new one
                    if ($current['status'] !== $info['status']) {
                        $periods[] = $current;
                        $current = [
                            'start_date' => $dateStr,
                            'end_date' => $dateStr,
                            'status' => $info['status'],
                            'reason' => $info['reason'],
                        ];
                    }
                }
            } else {
                if ($current !== null) {
                    $periods[] = $current;
                    $current = null;
                }
            }
        }

        if ($current !== null) {
            $periods[] = $current;
        }

        return $periods;
    }

    /**
     * Validate that startDate < endDate and both are valid date strings.
     * Limits range to max 366 days to prevent abuse.
     */
    private function validateDateRange(string $startDate, string $endDate): void
    {
        $start = DateTimeImmutable::createFromFormat('Y-m-d', $startDate);
        $end = DateTimeImmutable::createFromFormat('Y-m-d', $endDate);

        if ($start === false || $end === false) {
            throw new RuntimeException('Ungültiges Datumsformat. Erwartet: YYYY-MM-DD.', 422);
        }

        if ($start >= $end) {
            throw new RuntimeException('Startdatum muss vor dem Enddatum liegen.', 422);
        }

        $daysDiff = (int) $start->diff($end)->days;
        if ($daysDiff > 366) {
            throw new RuntimeException('Maximal 366 Tage pro Abfrage erlaubt.', 422);
        }
    }

    /**
     * Human-readable label for rule types.
     */
    private function ruleTypeLabel(string $ruleType): string
    {
        return match ($ruleType) {
            'blocked' => 'Blockiert',
            'maintenance' => 'Wartung',
            'owner_reserved' => 'Eigentümer-Reservierung',
            'available' => 'Verfügbar',
            default => $ruleType,
        };
    }

    // ── CRUD for availability rules (owner) ────────────────

    private const VALID_RULE_TYPES = ['available', 'blocked', 'maintenance', 'owner_reserved'];

    /**
     * List all rules for a vehicle.
     */
    public function getRules(int $vehicleId): array
    {
        $sql = "SELECT id, vehicle_id, start_date, end_date, rule_type, reason, created_by, created_at
                FROM availability_rules
                WHERE vehicle_id = ?
                ORDER BY start_date ASC";

        return $this->db->fetchAll($sql, [$vehicleId]);
    }

    /**
     * Create a new availability rule.
     */
    public function createRule(int $vehicleId, int $userId, array $data): array
    {
        $vehicle = $this->vehicles->findById($vehicleId);
        if ($vehicle === null) {
            throw new RuntimeException('Fahrzeug nicht gefunden.', 404);
        }

        $this->validateRuleData($data);

        $sql = "INSERT INTO availability_rules (vehicle_id, start_date, end_date, rule_type, reason, created_by)
                VALUES (?, ?, ?, ?, ?, ?)";

        $this->db->execute($sql, [
            $vehicleId,
            $data['start_date'],
            $data['end_date'],
            $data['rule_type'],
            $data['reason'] ?? null,
            $userId,
        ]);

        $id = $this->db->lastInsertId();

        return $this->db->fetchOne(
            "SELECT id, vehicle_id, start_date, end_date, rule_type, reason, created_by, created_at
             FROM availability_rules WHERE id = ?",
            [$id]
        );
    }

    /**
     * Update an existing rule.
     */
    public function updateRule(int $ruleId, int $vehicleId, array $data): array
    {
        $rule = $this->db->fetchOne(
            "SELECT * FROM availability_rules WHERE id = ? AND vehicle_id = ?",
            [$ruleId, $vehicleId]
        );

        if ($rule === null) {
            throw new RuntimeException('Verfügbarkeitsregel nicht gefunden.', 404);
        }

        $this->validateRuleData($data);

        $sql = "UPDATE availability_rules
                SET start_date = ?, end_date = ?, rule_type = ?, reason = ?
                WHERE id = ? AND vehicle_id = ?";

        $this->db->execute($sql, [
            $data['start_date'],
            $data['end_date'],
            $data['rule_type'],
            $data['reason'] ?? null,
            $ruleId,
            $vehicleId,
        ]);

        return $this->db->fetchOne(
            "SELECT id, vehicle_id, start_date, end_date, rule_type, reason, created_by, created_at
             FROM availability_rules WHERE id = ?",
            [$ruleId]
        );
    }

    /**
     * Delete a rule.
     */
    public function deleteRule(int $ruleId, int $vehicleId): void
    {
        $rule = $this->db->fetchOne(
            "SELECT id FROM availability_rules WHERE id = ? AND vehicle_id = ?",
            [$ruleId, $vehicleId]
        );

        if ($rule === null) {
            throw new RuntimeException('Verfügbarkeitsregel nicht gefunden.', 404);
        }

        $this->db->execute("DELETE FROM availability_rules WHERE id = ?", [$ruleId]);
    }

    /**
     * Bulk replace all rules for a vehicle (save entire calendar).
     */
    public function replaceRules(int $vehicleId, int $userId, array $rules): array
    {
        $vehicle = $this->vehicles->findById($vehicleId);
        if ($vehicle === null) {
            throw new RuntimeException('Fahrzeug nicht gefunden.', 404);
        }

        foreach ($rules as $rule) {
            $this->validateRuleData($rule);
        }

        $this->db->beginTransaction();
        try {
            // Delete all existing rules
            $this->db->execute("DELETE FROM availability_rules WHERE vehicle_id = ?", [$vehicleId]);

            // Insert new rules
            foreach ($rules as $rule) {
                $this->db->execute(
                    "INSERT INTO availability_rules (vehicle_id, start_date, end_date, rule_type, reason, created_by)
                     VALUES (?, ?, ?, ?, ?, ?)",
                    [
                        $vehicleId,
                        $rule['start_date'],
                        $rule['end_date'],
                        $rule['rule_type'],
                        $rule['reason'] ?? null,
                        $userId,
                    ]
                );
            }

            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollback();
            throw new RuntimeException('Regeln konnten nicht gespeichert werden.', 500);
        }

        return $this->getRules($vehicleId);
    }

    private function validateRuleData(array $data): void
    {
        if (empty($data['start_date']) || empty($data['end_date']) || empty($data['rule_type'])) {
            throw new RuntimeException('start_date, end_date und rule_type sind Pflichtfelder.', 422);
        }

        if (!in_array($data['rule_type'], self::VALID_RULE_TYPES, true)) {
            throw new RuntimeException('Ungültiger Regeltyp.', 422);
        }

        $start = \DateTimeImmutable::createFromFormat('Y-m-d', $data['start_date']);
        $end = \DateTimeImmutable::createFromFormat('Y-m-d', $data['end_date']);

        if ($start === false || $end === false) {
            throw new RuntimeException('Ungültiges Datumsformat. Erwartet: YYYY-MM-DD.', 422);
        }

        if ($start > $end) {
            throw new RuntimeException('Startdatum muss vor oder gleich dem Enddatum sein.', 422);
        }
    }
}