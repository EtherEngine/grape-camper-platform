# GRAPE – Camper-Vermietung & Tauschplattform

Fullstack-Plattform für die Vermietung und den Tausch von Campervans, Wohnmobilen und Wohnwagen.  
PHP-REST-API (ohne Framework) + React-SPA mit automatisiertem Mietvertragssystem.

---
<div style="display: flex; gap: 10px; margin-bottom: 10px;">
  <a href="https://github.com/user-attachments/assets/16cbb025-e56f-4b21-ba3c-ebe00b31e13a" target="_blank">
    <img src="https://github.com/user-attachments/assets/16cbb025-e56f-4b21-ba3c-ebe00b31e13a" width="300" />
  </a>
  <a href="https://github.com/user-attachments/assets/9d59faa4-a444-47bf-b409-110c599f6db2" target="_blank">
    <img src="https://github.com/user-attachments/assets/9d59faa4-a444-47bf-b409-110c599f6db2" width="300" />
  </a>
  <a href="https://github.com/user-attachments/assets/88fc7ec4-9649-43a4-a97a-42bdc789c16d" target="_blank">
    <img src="https://github.com/user-attachments/assets/88fc7ec4-9649-43a4-a97a-42bdc789c16d" width="300" />
  </a>
</div>

<div style="display: flex; gap: 10px; margin-bottom: 10px;">
  <a href="https://github.com/user-attachments/assets/511a5af3-ccbd-4cf2-9585-cf652c4026be" target="_blank">
    <img src="https://github.com/user-attachments/assets/511a5af3-ccbd-4cf2-9585-cf652c4026be" width="300" />
  </a>
  <a href="https://github.com/user-attachments/assets/c6ea5b81-4cf1-46c0-8ca3-e57cbd04ec84" target="_blank">
    <img src="https://github.com/user-attachments/assets/c6ea5b81-4cf1-46c0-8ca3-e57cbd04ec84" width="300" />
  </a>
  <a href="https://github.com/user-attachments/assets/3f98a287-dae4-4190-b3ad-0e204f58a015" target="_blank">
    <img src="https://github.com/user-attachments/assets/3f98a287-dae4-4190-b3ad-0e204f58a015" width="300" />
  </a>
</div>

## Features

- **Fahrzeugsuche** – Filter nach Typ, Preis, Standort, Datum; Verfügbarkeitskalender
- **Buchungssystem** – Mehrstufiger Flow: Anfrage → Bestätigung → Zahlung → Vertrag → Übergabe
- **Camper-Tausch** – Tauschangebote mit Bildern erstellen und als Owner annehmen/ablehnen
- **Digitaler Mietvertrag** – Automatische Vertragserstellung (Versicherung, Abhol-/Rückgabeort, Konditionen), beidseitige Unterschrift
- **Zahlungsabwicklung** – Zahlungsinitierung, Bestätigung, Admin-Rückerstattung
- **Verfügbarkeitsverwaltung** – Drag-Select-Kalender mit Saisonpreisen & Sperrzeiträumen
- **Rollenbasierter Zugriff** – User, Owner und Admin mit eigenem Dashboard
- **Admin-Panel** – Nutzerverwaltung, Buchungsübersicht, Reports & Statistiken
- **Landing Page** – Hero-Section mit Campfire-Hintergrundbild, Feature- & How-it-works-Sektionen

## Tech-Stack

| Schicht       | Technologie                                      |
| ------------- | ------------------------------------------------ |
| **Backend**   | PHP 8.1+, mysqli, kein Framework, kein Composer  |
| **Frontend**  | React 18, Vite 5, React Router 6, Zustand, Axios |
| **Datenbank** | MySQL 8 / MariaDB 10.6+, utf8mb4                 |
| **Server**    | XAMPP (Apache + MySQL)                           |

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

## Buchungsablauf

```
draft → pending_owner_review → pending_payment → pending_contract → confirmed → completed
                  ↓                   ↓                ↓                ↓
               rejected           cancelled         cancelled       cancelled
```

1. **Mieter** erstellt Buchungsanfrage (`draft` → `pending_owner_review`)
2. **Owner** genehmigt → `pending_payment`
3. **Mieter** bezahlt → `pending_contract`
4. **Owner** füllt Mietvertrag aus (Versicherung, Abhol-/Rückgabeort) und sendet an Mieter
5. **Mieter** ergänzt persönliche Daten (Führerschein, Ausweis)
6. **Beide** unterschreiben digital → `confirmed`
7. **Owner** schließt Buchung ab → `completed`

## Projektstruktur

```
GRAPE/
├── backend/
│   ├── config/          # App-Bootstrap, DB-Config, CORS
│   ├── controllers/     # HTTP-Controller (Auth, Booking, Vehicle, Swap, Payment, Contract, Admin)
│   ├── core/            # Router, Request, Response, Auth, DB, Validator
│   ├── helpers/         # DateHelper, FileHelper, ResponseHelper
│   ├── middleware/       # Auth, CORS, Role
│   ├── public/          # index.php (Einstiegspunkt), uploads/
│   ├── repositories/    # Datenbank-Zugriff (Repository-Pattern)
│   ├── routes/          # api.php (alle Routen)
│   ├── services/        # Business-Logik (Booking, Contract, Pricing, Availability, …)
│   └── storage/         # Logs
├── database/
│   ├── schema.sql       # Tabellenstruktur
│   ├── seed.sql         # Testdaten
│   └── migrations/      # Inkrementelle DB-Änderungen
├── frontend/
│   ├── src/
│   │   ├── assets/      # Bilder (Hero etc.)
│   │   ├── components/  # Wiederverwendbare UI-Komponenten (Button, Card, Modal, …)
│   │   ├── features/    # Feature-Module
│   │   │   ├── admin/       # Admin-Dashboard, Users, Bookings, Reports
│   │   │   ├── auth/        # Login, Register, ProtectedRoute
│   │   │   ├── bookings/    # Wizard, Detail, Kalender, StatusBadge, Print
│   │   │   ├── contracts/   # Mietvertrag (Owner-Form, Renter-Form, Sign, Signed)
│   │   │   ├── owner/       # Owner-Fahrzeuge, Buchungen, Swap-Review, Kalender
│   │   │   ├── payments/    # Zahlungsseite
│   │   │   ├── swaps/       # Tauschangebote erstellen & verwalten
│   │   │   └── vehicles/    # Fahrzeugliste, Detail, Karten
│   │   ├── hooks/       # useAuth, useAvailability, useBooking
│   │   ├── pages/       # Seitenkomponenten (Home, Dashboard, Vehicles, Bookings, …)
│   │   ├── router/      # React Router Konfiguration
│   │   ├── services/    # API-Client (Axios)
│   │   ├── store/       # Zustand Stores
│   │   ├── styles/      # Globale CSS, Theme-Variablen
│   │   └── utils/       # Hilfsfunktionen (Datum, Währung, Validierung)
│   └── package.json
└── docs/                # API-Endpoints, DB-Modell, Setup-Anleitung
```

## API-Übersicht

### Öffentlich

| Methode | Endpunkt                               | Beschreibung                  |
| ------- | -------------------------------------- | ----------------------------- |
| GET     | `/api/health`                          | Health-Check                  |
| GET     | `/api/vehicles`                        | Fahrzeugliste (Filter+Paging) |
| GET     | `/api/vehicles/:id`                    | Fahrzeugdetail                |
| GET     | `/api/vehicles/:id/availability`       | Verfügbarkeitskalender        |
| POST    | `/api/vehicles/:id/check-availability` | Konfliktprüfung               |
| POST    | `/api/vehicles/:id/price-preview`      | Preisvorschau                 |

### Auth

| Methode | Endpunkt             | Beschreibung     |
| ------- | -------------------- | ---------------- |
| POST    | `/api/auth/register` | Registrierung    |
| POST    | `/api/auth/login`    | Login            |
| POST    | `/api/auth/logout`   | Logout           |
| GET     | `/api/auth/me`       | Aktueller Nutzer |

### Dashboard

| Methode | Endpunkt               | Beschreibung     |
| ------- | ---------------------- | ---------------- |
| GET     | `/api/dashboard`       | Mieter-Dashboard |
| GET     | `/api/owner/dashboard` | Owner-Dashboard  |

### Buchungen (Mieter)

| Methode | Endpunkt                    | Beschreibung       |
| ------- | --------------------------- | ------------------ |
| GET     | `/api/bookings`             | Meine Buchungen    |
| POST    | `/api/bookings`             | Buchung erstellen  |
| GET     | `/api/bookings/:id`         | Buchungsdetail     |
| PATCH   | `/api/bookings/:id/confirm` | Zahlung bestätigen |
| PATCH   | `/api/bookings/:id/cancel`  | Stornieren         |

### Buchungen (Vermieter)

| Methode | Endpunkt                           | Beschreibung   |
| ------- | ---------------------------------- | -------------- |
| GET     | `/api/owner/bookings`              | Anfragen-Liste |
| PATCH   | `/api/owner/bookings/:id/approve`  | Bestätigen     |
| PATCH   | `/api/owner/bookings/:id/reject`   | Ablehnen       |
| PATCH   | `/api/owner/bookings/:id/complete` | Abschließen    |

### Mietvertrag

| Methode | Endpunkt                          | Beschreibung                     |
| ------- | --------------------------------- | -------------------------------- |
| GET     | `/api/bookings/:id/contract`      | Vertrag anzeigen (auto-erstellt) |
| PUT     | `/api/bookings/:id/contract`      | Owner füllt Vertrag aus          |
| PATCH   | `/api/bookings/:id/contract/send` | Owner sendet an Mieter           |
| PUT     | `/api/bookings/:id/contract/fill` | Mieter ergänzt Daten             |
| PATCH   | `/api/bookings/:id/contract/sign` | Unterschrift (beide Parteien)    |

### Fahrzeuge (Vermieter)

| Methode | Endpunkt                                | Beschreibung        |
| ------- | --------------------------------------- | ------------------- |
| GET     | `/api/owner/vehicles`                   | Eigene Fahrzeuge    |
| POST    | `/api/owner/vehicles`                   | Fahrzeug anlegen    |
| PUT     | `/api/owner/vehicles/:id`               | Fahrzeug bearbeiten |
| PATCH   | `/api/owner/vehicles/:id/activate`      | Aktivieren          |
| PATCH   | `/api/owner/vehicles/:id/deactivate`    | Deaktivieren        |
| PATCH   | `/api/owner/vehicles/:id/archive`       | Archivieren         |
| POST    | `/api/owner/vehicles/:id/images`        | Bild hochladen      |
| DELETE  | `/api/owner/vehicles/:id/images/:imgId` | Bild löschen        |

### Verfügbarkeit (Vermieter)

| Methode | Endpunkt                                          | Beschreibung     |
| ------- | ------------------------------------------------- | ---------------- |
| GET     | `/api/owner/vehicles/:id/availability-rules`      | Regeln abrufen   |
| POST    | `/api/owner/vehicles/:id/availability-rules`      | Regel erstellen  |
| PUT     | `/api/owner/vehicles/:id/availability-rules/bulk` | Bulk-Speichern   |
| PUT     | `/api/owner/vehicles/:id/availability-rules/:rid` | Regel bearbeiten |
| DELETE  | `/api/owner/vehicles/:id/availability-rules/:rid` | Regel löschen    |

### Tauschangebote

| Methode | Endpunkt                       | Beschreibung          |
| ------- | ------------------------------ | --------------------- |
| GET     | `/api/swaps`                   | Eigene Angebote       |
| POST    | `/api/swaps`                   | Angebot erstellen     |
| GET     | `/api/swaps/:id`               | Angebotsdetail        |
| PUT     | `/api/swaps/:id`               | Angebot bearbeiten    |
| PATCH   | `/api/swaps/:id/cancel`        | Angebot zurückziehen  |
| POST    | `/api/swaps/:id/images`        | Bild hochladen        |
| DELETE  | `/api/swaps/:id/images/:imgId` | Bild löschen          |
| GET     | `/api/owner/swaps`             | Eingehende Angebote   |
| PATCH   | `/api/owner/swaps/:id/review`  | Zur Prüfung markieren |
| PATCH   | `/api/owner/swaps/:id/accept`  | Angebot annehmen      |
| PATCH   | `/api/owner/swaps/:id/reject`  | Angebot ablehnen      |

### Zahlungen

| Methode | Endpunkt                          | Beschreibung            |
| ------- | --------------------------------- | ----------------------- |
| GET     | `/api/payments`                   | Meine Zahlungen         |
| POST    | `/api/payments/initiate`          | Zahlung initiieren      |
| GET     | `/api/payments/:id`               | Zahlungsdetail          |
| PATCH   | `/api/payments/:id/confirm`       | Zahlung bestätigen      |
| PATCH   | `/api/payments/:id/sync`          | Status synchronisieren  |
| GET     | `/api/bookings/:id/payments`      | Zahlungen einer Buchung |
| POST    | `/api/payments/:id/refund`        | Rückerstattung (Admin)  |
| POST    | `/api/webhooks/payment/:provider` | Provider-Webhook        |

### Admin

| Methode | Endpunkt                           | Beschreibung         |
| ------- | ---------------------------------- | -------------------- |
| GET     | `/api/admin/dashboard`             | Admin-Dashboard      |
| GET     | `/api/admin/users`                 | Nutzerliste          |
| GET     | `/api/admin/users/:id`             | Nutzerdetail         |
| PATCH   | `/api/admin/users/:id/activate`    | Nutzer aktivieren    |
| PATCH   | `/api/admin/users/:id/deactivate`  | Nutzer deaktivieren  |
| GET     | `/api/admin/bookings`              | Alle Buchungen       |
| GET     | `/api/admin/bookings/:id`          | Buchungsdetail       |
| PATCH   | `/api/admin/bookings/:id/cancel`   | Buchung stornieren   |
| GET     | `/api/admin/vehicles`              | Alle Fahrzeuge       |
| PATCH   | `/api/admin/vehicles/:id/moderate` | Fahrzeug moderieren  |
| GET     | `/api/admin/reports`               | Reports-Liste        |
| GET     | `/api/admin/reports/stats`         | Report-Statistiken   |
| POST    | `/api/admin/reports`               | Report erstellen     |
| GET     | `/api/admin/reports/:id`           | Report anzeigen      |
| PATCH   | `/api/admin/reports/:id`           | Report aktualisieren |

## Design

- **Farbschema**: Weiß (`#ffffff`) + Violett (`#8b5cf6`) mit Hover-Variante (`#7c3aed`)
- **Schrift**: Inter (sans-serif)
- **Responsive**: Mobile-first, Breakpoint bei 768px
- **Landing Page**: Campfire-Hero mit Parallax-Effekt, dezente Sektionen

## Seed-Daten

Die `seed.sql` enthält:

- 3 Rollen (user, owner, admin)
- 10 Nutzer (1 Admin, 3 Owner, 6 User)
- 10 Fahrzeuge verschiedener Typen (Campervan, Wohnmobil, Wohnwagen, Offroad)
- 30 Fahrzeugbilder, Features und 7 Verfügbarkeitsregeln
- 12 Buchungen in allen Status (confirmed, pending, completed, cancelled, rejected)
- 30 Status-History-Einträge, 6 Zahlungen mit Transaktionslog
- 5 Tauschangebote mit Bildern
- 3 System-Reports

## Datenbank-Tabellen

| Tabelle                  | Beschreibung                                    |
| ------------------------ | ----------------------------------------------- |
| `users`                  | Nutzer mit Rollen (user, owner, admin)          |
| `roles`                  | Rollendefinitionen                              |
| `vehicles`               | Fahrzeuge mit Typ, Ausstattung, Standort, Preis |
| `vehicle_images`         | Fahrzeugbilder (Sortierung, Cover)              |
| `vehicle_features`       | Ausstattungsmerkmale pro Fahrzeug               |
| `availability_rules`     | Verfügbarkeits-/Sperrregeln + Saisonpreise      |
| `bookings`               | Buchungen mit Status-Workflow                   |
| `booking_status_history` | Audit-Trail aller Statusänderungen              |
| `payments`               | Zahlungen (Stripe-/PayPal-fähig)                |
| `payment_transactions`   | Transaktionslog für Zahlungsereignisse          |
| `swap_offers`            | Tauschangebote zwischen Nutzern                 |
| `swap_offer_images`      | Bilder zu Tauschangeboten                       |
| `rental_contracts`       | Digitale Mietverträge mit beidseitiger Signatur |
| `reports`                | Admin-Reports & Statistiken                     |

## Lizenz

Copyright (c) 2026 etherengine. All rights reserved.  
Dieses Projekt dient ausschließlich als Portfolio- und Lernprojekt.  
Kommerzielle Nutzung, Weiterverbreitung und Modifikation sind ohne ausdrückliche schriftliche Genehmigung nicht gestattet.
