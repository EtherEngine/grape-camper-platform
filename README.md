# GRAPE – Camper-Vermietung & Tauschplattform

Plattform für die Vermietung und den Tausch von Campervans, Wohnmobilen und Wohnwagen.  
PHP-REST-API + React-SPA mit automatisiertem Mietvertragssystem.

---
<div style="display: flex; gap: 10px; margin-bottom: 10px;">
  <a href="https://github.com/user-attachments/assets/16cbb025-e56f-4b21-ba3c-ebe00b31e13a" target="_blank">
    <img src="https://github.com/user-attachments/assets/16cbb025-e56f-4b21-ba3c-ebe00b31e13a" width="300" />
  </a>
  <a href="https://github.com/user-attachments/assets/9d59faa4-a444-47bf-b409-110c599f6db2" target="_blank">
    <img src="https://github.com/user-attachments/assets/9d59faa4-a444-47bf-b409-110c599f6db2" width="300" />
  </a>
</div>

<div style="display: flex; gap: 10px; margin-bottom: 10px;">
  <a href="https://github.com/user-attachments/assets/88fc7ec4-9649-43a4-a97a-42bdc789c16d" target="_blank">
    <img src="https://github.com/user-attachments/assets/88fc7ec4-9649-43a4-a97a-42bdc789c16d" width="300" />
  </a>
  <a href="https://github.com/user-attachments/assets/511a5af3-ccbd-4cf2-9585-cf652c4026be" target="_blank">
    <img src="https://github.com/user-attachments/assets/511a5af3-ccbd-4cf2-9585-cf652c4026be" width="300" />
  </a>
</div>

<div style="display: flex; gap: 10px; margin-bottom: 10px;">
  <a href="https://github.com/user-attachments/assets/c6ea5b81-4cf1-46c0-8ca3-e57cbd04ec84" target="_blank">
    <img src="https://github.com/user-attachments/assets/c6ea5b81-4cf1-46c0-8ca3-e57cbd04ec84" width="300" />
  </a>
  <a href="https://github.com/user-attachments/assets/3f98a287-dae4-4190-b3ad-0e204f58a015" target="_blank">
    <img src="https://github.com/user-attachments/assets/3f98a287-dae4-4190-b3ad-0e204f58a015" width="300" />
  </a>
</div>

## Features

### Fahrzeuge & Suche

- Öffentliche Fahrzeugliste mit Filtern (Typ, Preis, Standort, Datum) und Pagination
- Fahrzeugdetail mit Bildergalerie, Ausstattungsmerkmalen und Standort
- Verfügbarkeitskalender (tagesgenaue Darstellung)
- Echtzeit-Preisvorschau mit Staffelpreisen (Tag/Woche/Monat)

### Buchungssystem

- 5-Schritt Buchungs-Wizard: Datum → Prüfung → Tausch (optional) → Zahlung → Zusammenfassung
- Mehrstufiger Status-Workflow mit Audit-Trail aller Übergänge
- Pessimistisches Row-Locking gegen Doppelbuchungen
- Druckansicht für Buchungsbestätigungen

### Digitaler Mietvertrag

- Automatische Vertragserstellung beim Statusübergang zu `pending_contract`
- Owner füllt Vertragsdaten aus (Versicherung, Abhol-/Rückgabeort, Schlüsselübergabe)
- Mieter ergänzt persönliche Daten (Führerschein, Ausweis)
- Beidseitige digitale Unterschrift mit Zeitstempel

### Zahlungsabwicklung

- Provider-basierte Architektur (PayPal, Stripe, Überweisung, Online-Banking)
- Mock-Provider für Entwicklung (automat. Erfolg, konfigurierbar)
- Vollständiges Transaktionslog mit Provider-Rohdaten
- Admin-Rückerstattung (voll/teilweise)

### Camper-Tausch

- Tauschangebote mit Bildern als Alternative zur Bezahlung
- Gamifiziertes Unlock-System: €3.000 Umsatz oder 3 Langzeitbuchungen (≥7 Tage)
- Admin-Freischaltcodes als alternativer Unlock-Pfad
- Owner kann Angebote prüfen, annehmen oder ablehnen

### Verfügbarkeitsverwaltung (Owner)

- Kalender mit verfügbar/gesperrt/Wartung/Eigennutzung
- Bulk-Speicherung von Verfügbarkeitsregeln
- Saisonpreise pro Zeitraum konfigurierbar

### Rollenbasierte Dashboards

- **Mieter**: Aktive/abgeschlossene Buchungen, Ausgabenübersicht, offene Aktionen
- **Owner**: Fahrzeugverwaltung, Buchungsanfragen, Umsatz-Dashboard mit Monatsdiagrammen, Tausch-Review
- **Admin**: Nutzerverwaltung (Aktivierung, Owner-Verifizierung), Buchungsübersicht, Reports, Swap-Unlock-Verwaltung

### Sicherheit

- BCRYPT-Passwort-Hashing (Cost 12)
- Token-basierte Sessions (64-Char-Hex, kryptographisch sicher)
- CSRF-Schutz via `X-Requested-With`-Header
- Prepared Statements gegen SQL-Injection
- Upload-Validierung (MIME-Type via `finfo`, Executable-Blockierung, Path-Traversal-Schutz)
- Rollenbasierte Middleware (Auth + Role)

---

## Tech-Stack

| Schicht       | Technologie                                      |
| ------------- | ------------------------------------------------ |
| **Backend**   | PHP 8.1+, mysqli,                                |
| **Frontend**  | React 18, Vite 5, React Router 6, Zustand, Axios |
| **Datenbank** | MySQL 8 / MariaDB 10.6+, utf8mb4                 |
| **Server**    | XAMPP (Apache + MySQL)                           |

---

## Voraussetzungen

- [XAMPP](https://www.apachefriends.org/) (PHP 8.1+, MySQL/MariaDB)
- [Node.js](https://nodejs.org/) 18+ & npm

## Installation

### 1. Repository klonen

```bash
cd C:\xampp\htdocs
git clone <repo-url> GRAPE
```

### 2. Datenbank einrichten

```sql
CREATE DATABASE grape CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Schema, Migrationen und Seed-Daten importieren:

```bash
mysql -u root grape < database/schema.sql
mysql -u root grape < database/migrations/005_create_rental_contracts.sql
mysql -u root grape < database/migrations/006_add_owner_verified.sql
mysql -u root grape < database/migrations/007_swap_unlock.sql
mysql -u root grape < database/seed.sql
```

### 3. Backend konfigurieren

```bash
cd backend
copy .env.example .env
```

Die `.env` enthält bereits sinnvolle Standardwerte für XAMPP:

```
DB_HOST=127.0.0.1
DB_NAME=grape
DB_USER=root
DB_PASS=
CORS_ORIGIN=http://localhost:5173
```

### 4. Frontend installieren & starten

```bash
cd frontend
npm install
npm run dev
```

Das Frontend läuft auf **http://localhost:5173**.  
Die API ist erreichbar unter **http://localhost/grape/backend/public**.

---

## Test-Accounts

Alle Passwörter: **`Test1234!`**

| Rolle | E-Mail            | Name               |
| ----- | ----------------- | ------------------ |
| Admin | admin@grape.local | System Admin       |
| Owner | owner@grape.local | Max Vermieter      |
| Owner | sarah@grape.local | Sarah Bergmann     |
| Owner | jonas@grape.local | Jonas Waldstein    |
| User  | user@grape.local  | Lisa Mieterin      |
| User  | tom@grape.local   | Tom Reisemann      |
| User  | anna@grape.local  | Anna Wanderlust    |
| User  | felix@grape.local | Felix Bergsteiger  |
| User  | marie@grape.local | Marie Sonnenschein |
| User  | lukas@grape.local | Lukas Fernweh      |

---

## Architektur

### Backend (PHP – kein Framework)

Das Backend implementiert eine REST-API ohne externes Framework. Kernkonzepte:

- **PSR-4-artiger Autoloader** ohne Composer (`config/app.php`)
- **Router** mit Gruppen, Prefix, Middleware-Stack und Parametern (`{id}`)
- **Request/Response**-Abstraktionen (JSON-Body-Parsing, Pagination-Helper, standardisierte Error-Formate)
- **Repository-Pattern** für Datenbankzugriff (Prepared Statements, Nested Transactions via Savepoints)
- **Service-Layer** für Business-Logik (Buchungsvalidierung, Preisberechnung, Vertragsautomatisierung)
- **Middleware-Pipeline**: CSRF → Auth → Role-Check

### Frontend (React SPA)

- **Feature-basierte Modulstruktur** — jedes Feature (`bookings/`, `contracts/`, `swaps/`, …) kapselt Komponenten, API-Client und Styles
- **Zustand Store** für globalen UI-State (Toast-System, Loading-Overlay) und Auth-State
- **Custom Hooks**: `useAuth()` (Session-Management), `useAvailability()` (Kalender mit Conflict-Check)
- **UI-Komponentenbibliothek**: Button, Card, Input, Modal, StatusBadge, Toast, Loader, ErrorBoundary
- **Layout**: Navbar, Footer, PageLayout mit responsivem Design

### Datenbank

15 Tabellen mit strikter referentieller Integrität (Foreign Keys, Cascading Deletes):

| Tabelle                  | Beschreibung                                         |
| ------------------------ | ---------------------------------------------------- |
| `roles` / `users`        | Rollensystem (user, owner, admin) mit Verifizierung  |
| `user_sessions`          | Token-basierte Sessions mit IP/User-Agent-Tracking   |
| `vehicles`               | Fahrzeuge mit Typ, Standort, Staffelpreisen, Deposit |
| `vehicle_images`         | Bildergalerie mit Cover-Flag und Sortierung          |
| `vehicle_features`       | Key-Value-Ausstattungsmerkmale                       |
| `availability_rules`     | Verfügbarkeitsregeln (available/blocked/maintenance) |
| `bookings`               | Buchungen mit 8-stufigem Status-Workflow             |
| `booking_status_history` | Immutable Audit-Trail aller Statusübergänge          |
| `payments`               | Zahlungen mit Provider-Referenz und Status-Lifecycle |
| `payment_transactions`   | Transaktionslog mit Provider-Rohdaten (JSON)         |
| `rental_contracts`       | Digitale Mietverträge mit beidseitiger Signatur      |
| `swap_offers`            | Tauschangebote als Alternative zur Bezahlung         |
| `swap_offer_images`      | Bilder zu Tauschangeboten                            |
| `swap_unlock_codes`      | Admin-Freischaltcodes für Tausch-Feature             |
| `system_reports`         | Issue-Tracking (Error, Abuse, Payment, Technical)    |

---

## Buchungsablauf

```
draft → pending_owner_review → pending_payment → pending_contract → confirmed → completed
                  ↓                   ↓                ↓                ↓
               rejected           cancelled         cancelled       cancelled
```

1. **Mieter** erstellt Buchungsanfrage über den 5-Schritt-Wizard
2. **Owner** genehmigt oder lehnt ab → `pending_payment`
3. **Mieter** wählt Zahlungsmethode und bezahlt → `pending_contract`
4. **System** erstellt automatisch den Mietvertrag (deutsches Template)
5. **Owner** füllt Vertragsdaten aus (Versicherung, Abhol-/Rückgabeort, Schlüsselübergabe) und sendet an Mieter
6. **Mieter** ergänzt persönliche Daten (Führerschein, Ausweis)
7. **Beide** unterschreiben digital (Zeitstempel) → `confirmed`
8. **Owner** schließt Buchung nach Rückgabe ab → `completed`

### Vertragsablauf

```
pending_owner → pending_renter → pending_signatures → signed
       ↓               ↓                ↓
    cancelled       cancelled        cancelled
```

---

## Projektstruktur

```
GRAPE/
├── backend/
│   ├── config/            # App-Bootstrap (Autoloader, Env, Error-Handling), CORS, DB-Config
│   ├── controllers/       # HTTP-Controller (10 Controller)
│   ├── core/              # Framework-Kern: Router, Request, Response, Auth, Database, Validator, Env
│   ├── helpers/           # DateHelper, FileHelper, ResponseHelper
│   ├── middleware/        # AuthMiddleware, CsrfMiddleware, RoleMiddleware
│   ├── providers/         # Payment-Provider-Interface + Mock-Provider
│   ├── public/            # index.php (Einstiegspunkt), uploads/
│   ├── repositories/      # 10 Repositories (Prepared Statements, Pagination)
│   ├── routes/            # api.php (~120 Routen)
│   ├── services/          # 13 Services (Business-Logik)
│   └── storage/logs/      # Applikations-Logs
├── database/
│   ├── schema.sql         # 15 Tabellen
│   ├── seed.sql           # Testdaten (10 User, 10 Fahrzeuge, 12 Buchungen, …)
│   └── migrations/        # 005: Contracts, 006: Owner-Verified, 007: Swap-Unlock
├── frontend/
│   ├── src/
│   │   ├── components/    # common/ (Toast, Loader, ErrorBoundary), layout/ (Navbar, Footer), ui/ (Button, Card, Modal, Input, StatusBadge)
│   │   ├── features/      # 8 Feature-Module (admin, auth, bookings, contracts, dashboard, owner, payments, swaps, vehicles)
│   │   ├── hooks/         # useAuth, useAvailability, useBooking
│   │   ├── pages/         # 10 Seitenkomponenten
│   │   ├── services/      # Axios API-Client (Singleton, Interceptors)
│   │   ├── store/         # Zustand (UI-State + Auth-State)
│   │   └── styles/        # globals.css, theme.css (CSS Custom Properties)
│   └── package.json
└── docs/                  # API-Endpoints, DB-Modell, Setup-Anleitung
```

---

## API-Übersicht

~120 Endpunkte, aufgeteilt nach Rolle:

### Öffentlich (6)

| Methode | Endpunkt                               | Beschreibung                  |
| ------- | -------------------------------------- | ----------------------------- |
| GET     | `/api/health`                          | Health-Check                  |
| GET     | `/api/vehicles`                        | Fahrzeugliste (Filter+Paging) |
| GET     | `/api/vehicles/:id`                    | Fahrzeugdetail                |
| GET     | `/api/vehicles/:id/availability`       | Verfügbarkeitskalender        |
| POST    | `/api/vehicles/:id/check-availability` | Konfliktprüfung               |
| POST    | `/api/vehicles/:id/price-preview`      | Preisvorschau                 |

### Auth (4)

| Methode | Endpunkt             | Beschreibung     |
| ------- | -------------------- | ---------------- |
| POST    | `/api/auth/register` | Registrierung    |
| POST    | `/api/auth/login`    | Login            |
| POST    | `/api/auth/logout`   | Logout           |
| GET     | `/api/auth/me`       | Aktueller Nutzer |

### Mieter — Buchungen & Zahlungen (13)

| Methode  | Endpunkt                     | Beschreibung            |
| -------- | ---------------------------- | ----------------------- |
| GET      | `/api/dashboard`             | Mieter-Dashboard        |
| GET/POST | `/api/bookings`              | Liste / Erstellen       |
| GET      | `/api/bookings/:id`          | Buchungsdetail          |
| PATCH    | `/api/bookings/:id/confirm`  | Zahlung bestätigen      |
| PATCH    | `/api/bookings/:id/cancel`   | Stornieren              |
| GET/POST | `/api/payments`              | Liste / Initiieren      |
| GET      | `/api/payments/:id`          | Zahlungsdetail          |
| PATCH    | `/api/payments/:id/confirm`  | Zahlung bestätigen      |
| PATCH    | `/api/payments/:id/sync`     | Status synchronisieren  |
| GET      | `/api/bookings/:id/payments` | Zahlungen einer Buchung |

### Mieter — Verträge (5)

| Methode | Endpunkt                          | Beschreibung                     |
| ------- | --------------------------------- | -------------------------------- |
| GET     | `/api/bookings/:id/contract`      | Vertrag anzeigen (auto-erstellt) |
| GET     | `/api/bookings/:id/contract/pdf`  | Vertrag als PDF                  |
| PUT     | `/api/bookings/:id/contract/fill` | Mieter ergänzt Daten             |
| PATCH   | `/api/bookings/:id/contract/sign` | Unterschrift                     |
| PUT     | `/api/bookings/:id/contract`      | Owner füllt Vertrag aus          |

### Mieter — Tausch (8)

| Methode  | Endpunkt                       | Beschreibung        |
| -------- | ------------------------------ | ------------------- |
| GET      | `/api/swap-unlock/progress`    | Unlock-Fortschritt  |
| POST     | `/api/swap-unlock/redeem`      | Code einlösen       |
| GET/POST | `/api/swaps`                   | Liste / Erstellen   |
| GET/PUT  | `/api/swaps/:id`               | Detail / Bearbeiten |
| PATCH    | `/api/swaps/:id/cancel`        | Zurückziehen        |
| POST     | `/api/swaps/:id/images`        | Bild hochladen      |
| DELETE   | `/api/swaps/:id/images/:imgId` | Bild löschen        |

### Owner (20+)

Fahrzeug-CRUD, Bildverwaltung, Verfügbarkeitsregeln (inkl. Bulk), Buchungsanfragen genehmigen/ablehnen/abschließen, Umsatz-Dashboard, Tausch-Review.

### Admin (20+)

Dashboard-Statistiken, Nutzerverwaltung (Aktivierung, Owner-Verifizierung), Buchungsübersicht, Fahrzeug-Moderation, Report-System, Swap-Unlock-Verwaltung (Codes generieren/deaktivieren).

---

## Design

- **Farbschema**: Weiß (`#ffffff`) + Violett (`#8b5cf6`) mit Hover-Variante (`#7c3aed`)
- **Schrift**: Inter (sans-serif)
- **Responsive**: Mobile-first, Breakpoint bei 768 px
- **Landing Page**: Campfire-Hero mit Parallax-Effekt, Feature- & How-it-works-Sektionen

---

## Seed-Daten

Die `seed.sql` enthält umfangreiche Testdaten zum sofortigen Ausprobieren:

- 3 Rollen (user, owner, admin) · 10 Nutzer (1 Admin, 3 Owner, 6 User)
- 10 Fahrzeuge verschiedener Typen (Campervan, Wohnmobil, Wohnwagen, Offroad)
- 30 Fahrzeugbilder, Features und 7 Verfügbarkeitsregeln
- 12 Buchungen in allen Status (confirmed, pending, completed, cancelled, rejected)
- 30 Status-History-Einträge · 6 Zahlungen mit Transaktionslog
- 5 Tauschangebote mit Bildern · 3 System-Reports

---

## Lizenz

Copyright (c) 2026 etherengine. All rights reserved.  
Dieses Projekt dient ausschließlich als Portfolio- und Lernprojekt.  
Kommerzielle Nutzung, Weiterverbreitung und Modifikation sind ohne ausdrückliche schriftliche Genehmigung nicht gestattet.
