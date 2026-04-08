<?php

declare(strict_types=1);

namespace Controllers;

use Core\Auth;
use Core\Request;
use Core\Response;
use Core\Validator;
use Services\ContractService;
use RuntimeException;

class ContractController
{
    private ContractService $contractService;

    public function __construct()
    {
        $this->contractService = new ContractService();
    }

    /**
     * GET /api/bookings/{id}/contract — Get contract for a booking.
     */
    public function show(Request $request, Response $response): never
    {
        $bookingId = (int) $request->param('id');

        try {
            $contract = $this->contractService->getForBooking($bookingId, Auth::id());
            $response->success($contract);
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * PUT /api/bookings/{id}/contract — Owner updates contract.
     */
    public function update(Request $request, Response $response): never
    {
        $bookingId = (int) $request->param('id');
        $data = $request->input();

        $validator = new Validator();
        if (
            !$validator->validate($data, [
                'contract_text' => 'required|string',
                'insurance_type' => 'required|string|in:private,commercial',
                'insurance_details' => 'nullable|string',
                'special_conditions' => 'nullable|string',
                'pickup_address' => 'nullable|string|max:500',
                'pickup_lat' => 'nullable|numeric',
                'pickup_lng' => 'nullable|numeric',
                'pickup_notes' => 'nullable|string',
                'key_handover_details' => 'nullable|string',
                'return_address' => 'nullable|string|max:500',
                'return_lat' => 'nullable|numeric',
                'return_lng' => 'nullable|numeric',
                'return_notes' => 'nullable|string',
            ])
        ) {
            $response->validationError($validator->errors());
        }

        try {
            $contract = $this->contractService->ownerUpdate($bookingId, Auth::id(), $data);
            $response->success($contract, 'Vertrag aktualisiert.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * PATCH /api/bookings/{id}/contract/send — Owner sends contract to renter.
     */
    public function send(Request $request, Response $response): never
    {
        $bookingId = (int) $request->param('id');

        try {
            $contract = $this->contractService->sendToRenter($bookingId, Auth::id());
            $response->success($contract, 'Vertrag an Mieter gesendet.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * PUT /api/bookings/{id}/contract/fill — Renter fills personal details.
     */
    public function fill(Request $request, Response $response): never
    {
        $bookingId = (int) $request->param('id');
        $data = $request->input();

        $validator = new Validator();
        if (
            !$validator->validate($data, [
                'renter_full_name' => 'required|string|max:255',
                'renter_address' => 'required|string',
                'renter_phone' => 'required|string|max:50',
                'renter_license_number' => 'required|string|max:100',
                'renter_license_expiry' => 'required|date:Y-m-d',
                'renter_id_number' => 'nullable|string|max:100',
            ])
        ) {
            $response->validationError($validator->errors());
        }

        try {
            $contract = $this->contractService->renterFill($bookingId, Auth::id(), $data);
            $response->success($contract, 'Daten gespeichert.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * PATCH /api/bookings/{id}/contract/sign — Sign contract (both parties).
     */
    public function sign(Request $request, Response $response): never
    {
        $bookingId = (int) $request->param('id');

        try {
            $contract = $this->contractService->sign($bookingId, Auth::id());
            $response->success($contract, 'Vertrag unterschrieben.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * GET /api/bookings/{id}/contract/pdf — Render printable HTML contract.
     */
    public function pdf(Request $request, Response $response): never
    {
        $bookingId = (int) $request->param('id');

        try {
            $contract = $this->contractService->getForBooking($bookingId, Auth::id());

            if ($contract['status'] !== 'signed') {
                $response->error('Der Vertrag muss unterschrieben sein, um ihn als PDF anzuzeigen.', 422);
            }

            $html = $this->renderPdfHtml($contract);

            header('Content-Type: text/html; charset=utf-8');
            header('Content-Disposition: inline; filename="Mietvertrag_Buchung_' . $bookingId . '.html"');
            echo $html;
            exit;
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * Build a print-optimised, self-contained HTML document for the contract.
     */
    private function renderPdfHtml(array $c): string
    {
        $esc = fn(?string $v): string => htmlspecialchars((string) ($v ?? ''), ENT_QUOTES, 'UTF-8');
        $date = function (?string $d) {
            if (!$d)
                return '—';
            $p = explode('-', $d);
            return count($p) === 3 ? ((int) $p[2] . '.' . (int) $p[1] . '.' . $p[0]) : $d;
        };
        $money = fn($v) => number_format((float) ($v ?? 0), 2, ',', '.') . ' ' . $esc($c['currency'] ?? 'EUR');

        $ownerName = $esc(trim(($c['owner_first_name'] ?? '') . ' ' . ($c['owner_last_name'] ?? '')));
        $renterName = $esc(trim(($c['renter_first_name'] ?? '') . ' ' . ($c['renter_last_name'] ?? '')));
        $ownerAddr = $esc(trim(($c['owner_street'] ?? '') . ' ' . ($c['owner_house_number'] ?? '')));
        $ownerCity = $esc(trim(($c['owner_postal_code'] ?? '') . ' ' . ($c['owner_city'] ?? '')));
        $vehicle = $esc($c['vehicle_title'] ?? '');
        $plate = $esc($c['license_plate'] ?? '—');
        $startDate = $date($c['start_date'] ?? null);
        $endDate = $date($c['end_date'] ?? null);
        $days = (int) ($c['days_count'] ?? 0);
        $total = $money($c['total_price'] ?? 0);
        $insurance = ($c['insurance_type'] ?? 'private') === 'commercial' ? 'Gewerblich' : 'Privat';
        $insDetail = $esc($c['insurance_details'] ?? '');
        $special = $esc($c['special_conditions'] ?? '');
        $pickup = $esc($c['pickup_address'] ?? '—');
        $pickNotes = $esc($c['pickup_notes'] ?? '');
        $keyDetails = $esc($c['key_handover_details'] ?? '');
        $returnAddr = $esc($c['return_address'] ?? '—');
        $retNotes = $esc($c['return_notes'] ?? '');

        $renterAddr = $esc($c['renter_address'] ?? '—');
        $renterPhone = $esc($c['renter_phone'] ?? '—');
        $renterLicense = $esc($c['renter_license_number'] ?? '—');
        $renterExpiry = $date($c['renter_license_expiry'] ?? null);
        $renterIdNr = $esc($c['renter_id_number'] ?? '—');

        $ownerSignedAt = $date($c['owner_signed_at'] ?? null);
        $renterSignedAt = $date($c['renter_signed_at'] ?? null);

        $contractText = nl2br($esc($c['contract_text'] ?? ''));
        $bookingId = (int) ($c['booking_id'] ?? 0);

        return <<<HTML
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>Mietvertrag – Buchung #{$bookingId}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #1a1a2e; line-height: 1.55; background: #fff; }
  .page { max-width: 210mm; margin: 0 auto; padding: 24px 32px; }
  @media print { .page { padding: 0; } .no-print { display: none !important; } }

  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #6C3461; padding-bottom: 12px; margin-bottom: 20px; }
  .header h1 { font-size: 18pt; color: #6C3461; font-weight: 700; }
  .header .meta { text-align: right; font-size: 8.5pt; color: #666; }
  .header .meta strong { color: #1a1a2e; }

  h2 { font-size: 11pt; color: #6C3461; margin: 18px 0 8px; border-bottom: 1px solid #e8e0e6; padding-bottom: 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 32px; margin-bottom: 8px; }
  .field { font-size: 9.5pt; }
  .field .label { color: #888; font-size: 8pt; text-transform: uppercase; letter-spacing: .04em; }
  .field .value { font-weight: 500; }

  .contract-text { background: #faf8fa; border: 1px solid #e8e0e6; border-radius: 6px; padding: 14px 16px; font-size: 9pt; white-space: pre-wrap; word-wrap: break-word; line-height: 1.6; margin: 8px 0 16px; }

  .sig-block { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 24px; border-top: 1px solid #e8e0e6; padding-top: 16px; }
  .sig { text-align: center; }
  .sig .sig-line { border-bottom: 1px solid #999; height: 32px; margin-bottom: 4px; }
  .sig .sig-label { font-size: 8pt; color: #888; }
  .sig .sig-date { font-size: 8.5pt; color: #6C3461; font-weight: 600; margin-top: 2px; }

  .footer { margin-top: 24px; text-align: center; font-size: 7.5pt; color: #aaa; border-top: 1px solid #eee; padding-top: 8px; }

  .actions { text-align: center; margin: 24px 0; }
  .actions button { background: #6C3461; color: #fff; border: none; padding: 10px 28px; border-radius: 6px; font-size: 10pt; cursor: pointer; font-weight: 600; }
  .actions button:hover { background: #5A2B51; }

  .info-row { margin-bottom: 3px; }
</style>
</head>
<body>
<div class="page">
  <div class="actions no-print">
    <button onclick="window.print()">📄 Als PDF speichern / Drucken</button>
  </div>

  <div class="header">
    <div>
      <h1>Mietvertrag</h1>
      <div style="font-size:9pt;color:#555;margin-top:2px">{$vehicle}</div>
    </div>
    <div class="meta">
      <strong>Buchung #{$bookingId}</strong><br>
      {$startDate} – {$endDate} ({$days} Tage)<br>
      Gesamtpreis: <strong>{$total}</strong>
    </div>
  </div>

  <h2>§ Vertragsparteien</h2>
  <div class="grid">
    <div>
      <div class="field"><span class="label">Vermieter</span><div class="value">{$ownerName}</div></div>
      <div class="info-row">{$ownerAddr}</div>
      <div class="info-row">{$ownerCity}</div>
    </div>
    <div>
      <div class="field"><span class="label">Mieter</span><div class="value">{$renterName}</div></div>
      <div class="info-row">{$renterAddr}</div>
      <div class="info-row">Tel: {$renterPhone}</div>
    </div>
  </div>

  <h2>§ Mietgegenstand</h2>
  <div class="grid">
    <div class="field"><span class="label">Fahrzeug</span><div class="value">{$vehicle}</div></div>
    <div class="field"><span class="label">Kennzeichen</span><div class="value">{$plate}</div></div>
  </div>

  <h2>§ Mieter – Persönliche Daten</h2>
  <div class="grid">
    <div class="field"><span class="label">Führerschein-Nr.</span><div class="value">{$renterLicense}</div></div>
    <div class="field"><span class="label">Gültig bis</span><div class="value">{$renterExpiry}</div></div>
    <div class="field"><span class="label">Ausweis-Nr.</span><div class="value">{$renterIdNr}</div></div>
  </div>

  <h2>§ Versicherung</h2>
  <div class="grid">
    <div class="field"><span class="label">Versicherungsart</span><div class="value">{$insurance}</div></div>
    <div class="field"><span class="label">Details</span><div class="value">{$insDetail}</div></div>
  </div>

  <h2>§ Abholung & Rückgabe</h2>
  <div class="grid">
    <div>
      <div class="field"><span class="label">Abholung – {$startDate}</span><div class="value">{$pickup}</div></div>
      {$pickNotes}
    </div>
    <div>
      <div class="field"><span class="label">Rückgabe – {$endDate}</span><div class="value">{$returnAddr}</div></div>
      {$retNotes}
    </div>
  </div>
  {$keyDetails}

  {$special}

  <h2>§ Vertragstext</h2>
  <div class="contract-text">{$contractText}</div>

  <div class="sig-block">
    <div class="sig">
      <div class="sig-line"></div>
      <div class="sig-label">Vermieter – {$ownerName}</div>
      <div class="sig-date">Unterschrieben am {$ownerSignedAt}</div>
    </div>
    <div class="sig">
      <div class="sig-line"></div>
      <div class="sig-label">Mieter – {$renterName}</div>
      <div class="sig-date">Unterschrieben am {$renterSignedAt}</div>
    </div>
  </div>

  <div class="footer">
    Erstellt über die GRAPE-Plattform · Elektronisch signiert · Buchung #{$bookingId}
  </div>
</div>
</body>
</html>
HTML;
    }
}
