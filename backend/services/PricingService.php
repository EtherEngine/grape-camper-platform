<?php

declare(strict_types=1);

namespace Services;

use Repositories\VehicleRepository;
use RuntimeException;
use DateTimeImmutable;

class PricingService
{
    private VehicleRepository $vehicles;

    public function __construct()
    {
        $this->vehicles = new VehicleRepository();
    }

    /**
     * Calculate a full price breakdown for a vehicle booking.
     *
     * Uses the best applicable rate tier:
     *   - monthly_price if days >= 28 and monthly_price is set
     *   - weekly_price  if days >= 7  and weekly_price is set
     *   - daily_price   otherwise
     *
     * @return array{
     *   vehicle_id: int,
     *   start_date: string,
     *   end_date: string,
     *   days_count: int,
     *   rate_type: string,
     *   rate_per_unit: string,
     *   base_price: string,
     *   cleaning_fee: string,
     *   service_fee: string,
     *   deposit_amount: string,
     *   total_price: string,
     *   currency: string,
     *   breakdown: array
     * }
     */
    public function calculate(int $vehicleId, string $startDate, string $endDate): array
    {
        $vehicle = $this->vehicles->findById($vehicleId);
        if ($vehicle === null) {
            throw new RuntimeException('Fahrzeug nicht gefunden.', 404);
        }

        if ($vehicle['status'] !== 'active') {
            throw new RuntimeException('Fahrzeug ist nicht verfügbar.', 400);
        }

        $this->validateDates($startDate, $endDate);

        $start = new DateTimeImmutable($startDate);
        $end = new DateTimeImmutable($endDate);
        $daysCount = (int) $start->diff($end)->days;

        // Validate rental duration constraints
        $minDays = (int) $vehicle['minimum_rental_days'];
        $maxDays = $vehicle['maximum_rental_days'] !== null ? (int) $vehicle['maximum_rental_days'] : null;

        if ($daysCount < $minDays) {
            throw new RuntimeException(
                "Mindestmietdauer ist {$minDays} Tage. Gewählt: {$daysCount} Tage.",
                422
            );
        }

        if ($maxDays !== null && $daysCount > $maxDays) {
            throw new RuntimeException(
                "Maximalmietdauer ist {$maxDays} Tage. Gewählt: {$daysCount} Tage.",
                422
            );
        }

        // Parse vehicle prices
        $dailyPrice = (float) $vehicle['daily_price'];
        $weeklyPrice = $vehicle['weekly_price'] !== null ? (float) $vehicle['weekly_price'] : null;
        $monthlyPrice = $vehicle['monthly_price'] !== null ? (float) $vehicle['monthly_price'] : null;
        $cleaningFee = (float) $vehicle['cleaning_fee'];
        $serviceFee = (float) $vehicle['service_fee'];
        $depositAmount = (float) $vehicle['deposit_amount'];
        $currency = $vehicle['currency'];

        // Determine best rate
        $breakdown = $this->buildBreakdown($daysCount, $dailyPrice, $weeklyPrice, $monthlyPrice);
        $basePrice = $breakdown['base_price'];

        // Total = base + cleaning + service (deposit is separate / refundable)
        $totalPrice = $basePrice + $cleaningFee + $serviceFee;

        return [
            'vehicle_id' => $vehicleId,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'days_count' => $daysCount,
            'rate_type' => $breakdown['rate_type'],
            'rate_per_unit' => $this->money($breakdown['rate_per_unit']),
            'base_price' => $this->money($basePrice),
            'cleaning_fee' => $this->money($cleaningFee),
            'service_fee' => $this->money($serviceFee),
            'subtotal' => $this->money($totalPrice),
            'deposit_amount' => $this->money($depositAmount),
            'total_price' => $this->money($totalPrice),
            'currency' => $currency,
            'breakdown' => $breakdown['lines'],
        ];
    }

    // ── Private helpers ────────────────────────────────────

    /**
     * Build the price breakdown using optimal rate mix.
     *
     * Strategy: greedily apply the cheapest full-period rate.
     *   1. Fill as many full months (28 days) as possible if monthly_price is set
     *   2. Fill as many full weeks (7 days) as possible if weekly_price is set
     *   3. Remaining days at daily_price
     *
     * Falls back to pure daily if no discount rate is cheaper per-day.
     */
    private function buildBreakdown(
        int $totalDays,
        float $dailyPrice,
        ?float $weeklyPrice,
        ?float $monthlyPrice
    ): array {
        $lines = [];
        $remaining = $totalDays;
        $basePrice = 0.0;

        // Effective per-day rates for comparison
        $dailyEff = $dailyPrice;
        $weeklyEff = $weeklyPrice !== null ? $weeklyPrice / 7 : PHP_FLOAT_MAX;
        $monthlyEff = $monthlyPrice !== null ? $monthlyPrice / 28 : PHP_FLOAT_MAX;

        // Determine primary rate type for display
        $primaryRate = 'daily';

        // Monthly blocks
        if ($monthlyPrice !== null && $monthlyEff <= $dailyEff && $remaining >= 28) {
            $months = intdiv($remaining, 28);
            $monthTotal = $months * $monthlyPrice;
            $basePrice += $monthTotal;
            $remaining -= $months * 28;
            $primaryRate = 'monthly';

            $lines[] = [
                'label' => $months === 1
                    ? '1 Monat (28 Tage)'
                    : "{$months} Monate ({$this->mul($months, 28)} Tage)",
                'unit_price' => $this->money($monthlyPrice),
                'quantity' => $months,
                'total' => $this->money($monthTotal),
            ];
        }

        // Weekly blocks
        if ($weeklyPrice !== null && $weeklyEff <= $dailyEff && $remaining >= 7) {
            $weeks = intdiv($remaining, 7);
            $weekTotal = $weeks * $weeklyPrice;
            $basePrice += $weekTotal;
            $remaining -= $weeks * 7;
            if ($primaryRate === 'daily') {
                $primaryRate = 'weekly';
            }

            $lines[] = [
                'label' => $weeks === 1
                    ? '1 Woche (7 Tage)'
                    : "{$weeks} Wochen ({$this->mul($weeks, 7)} Tage)",
                'unit_price' => $this->money($weeklyPrice),
                'quantity' => $weeks,
                'total' => $this->money($weekTotal),
            ];
        }

        // Remaining days
        if ($remaining > 0) {
            $dayTotal = $remaining * $dailyPrice;
            $basePrice += $dayTotal;

            $lines[] = [
                'label' => $remaining === 1
                    ? '1 Tag'
                    : "{$remaining} Tage",
                'unit_price' => $this->money($dailyPrice),
                'quantity' => $remaining,
                'total' => $this->money($dayTotal),
            ];
        }

        // If no discount tiers were applied, ensure we have at least daily
        if (empty($lines)) {
            $basePrice = $totalDays * $dailyPrice;
            $lines[] = [
                'label' => "{$totalDays} Tage",
                'unit_price' => $this->money($dailyPrice),
                'quantity' => $totalDays,
                'total' => $this->money($basePrice),
            ];
        }

        // Rate per unit for the primary tier
        $ratePerUnit = match ($primaryRate) {
            'monthly' => $monthlyPrice,
            'weekly' => $weeklyPrice,
            default => $dailyPrice,
        };

        return [
            'rate_type' => $primaryRate,
            'rate_per_unit' => $ratePerUnit,
            'base_price' => $basePrice,
            'lines' => $lines,
        ];
    }

    private function validateDates(string $startDate, string $endDate): void
    {
        $start = DateTimeImmutable::createFromFormat('Y-m-d', $startDate);
        $end = DateTimeImmutable::createFromFormat('Y-m-d', $endDate);

        if ($start === false || $end === false) {
            throw new RuntimeException('Ungültiges Datumsformat. Erwartet: YYYY-MM-DD.', 422);
        }

        if ($start >= $end) {
            throw new RuntimeException('Startdatum muss vor dem Enddatum liegen.', 422);
        }
    }

    /**
     * Format a float as a 2-decimal string.
     */
    private function money(float $amount): string
    {
        return number_format($amount, 2, '.', '');
    }

    private function mul(int $a, int $b): int
    {
        return $a * $b;
    }
}