# AquaTap — Water Refilling Station Management

AquaTap replaces the notebook ("listahan") of a water refilling station with a mobile app:

- Customers sign an **electronic gallon-borrowing contract** and order water.
- Employees **accept or decline** orders and deliver them with a map.
- Every gallon, payment, utang (credit) and expense is computed and saved automatically.

| Part | Tech | Folder |
|------|------|--------|
| Mobile app (customers, employees, owner) | React Native · Expo SDK 58 · Expo Router · TypeScript | [`mobile/`](mobile) |
| REST API | NestJS 11 · TypeORM · JWT · Swagger | [`backend/`](backend) |
| Database | MySQL 8 (MySQL Workbench) | [`database/`](database) |

---

## Features → where to find them

| Requirement | How it works | Main code |
|---|---|---|
| Electronic contract when borrowing gallons | Customer sign-up wizard: name and station → address and map pin → borrowed gallons, contract preview (template optional), finger signature. Saved in `GallonContract` (SVG signature). | `mobile/src/app/onboarding/customer.tsx`, `backend/src/modules/customers` |
| Google SSO, choose the station, full name | Google Sign-In → `POST /auth/google` (ID token verified by Google). Names are saved in uppercase (`LEO ISIDRO DUMANGAS`). | `mobile/src/features/auth`, `backend/src/modules/auth` |
| New customer appears in the customer list with their first remaining gallons | Registration creates `Customer` + `GallonContract`. Remaining gallons = borrowed + delivered − returned. | `backend/src/modules/gallon-contracts/gallon-ledger.service.ts` |
| Accept / decline orders, auto-recorded grid | Pending orders show in red with a tab badge. Accept or decline with one tap. The **Records** tab shows Name · Gallons ordered · Returned · Remaining · Cash/Credit · Mode of payment. | `mobile/src/app/staff/index.tsx`, `staff/records.tsx` |
| Daily transactions per employee shift, with expenses | Time in / time out. The daily report lists every delivered / declined / failed / cancelled order and expenses (food, fuel, flat tire, …) with computed totals. Time-out saves a snapshot of the shift. | `staff/daily.tsx`, `backend/src/modules/reports`, `employee-shifts` |
| Customer's own history, utang filter | Customer **My orders**: All / Active / Unpaid (utang) / Paid / Cancelled. Plus the remaining gallons and the gallon history. | `mobile/src/app/customer/*` |
| Credits tab for the employee and the admin | Search by name and order date, select orders, **Mark as paid** with the payment mode, reference number and **date of payment**. | `staff/credits.tsx`, `backend/src/modules/payments` |
| Map like Foodpanda | Free **OpenStreetMap** (Leaflet in a WebView, no API key). Road route and ETA from OSRM. The rider shares their location while delivering; "Directions" opens Google Maps navigation. | `mobile/src/components/map` |
| Pending notification, decline / failed recorded | Red badge and banner; the orders list polls every 10 seconds. Customers can cancel while the order is pending. Employees can decline it, or mark it failed after accepting. | `customer-orders` module (`order-status.policy.ts`) |
| Payment QR (GCash / bank transfer) | The admin uploads GCash / bank QR codes. Customers scan them, copy the account number, and send the reference number. | `admin/payment-channels.tsx`, `mobile/src/app/pay.tsx` |
| Station sign-up with legitimacy documents (KYB) | After registering, the owner opens **Business verification**: registered business name, BIR TIN, and photos of the BIR Certificate of Registration (Form 2303), Mayor's/Business Permit, DTI/SEC registration, Sanitary Permit, water analysis certificate, and owner's valid ID. An AquaTap reviewer (**SystemAdmin**) approves the station or asks for changes. Only **verified** stations appear in the customer sign-up list. | `mobile/src/app/station-verification.tsx`, `mobile/src/app/system/*`, `backend/src/modules/station-verifications` |
| My profile and account safety | Every user has **My profile**: profile photo (resized by the server), name, **password** (sign in with email + password besides Google), **two-step sign-in** (6-digit code from an authenticator app + backup codes), **Devices** (where the account is signed in, sign out one or all other devices) and **Account history** (orders, payments, time in/out, sign-ins...). | `mobile/src/app/profile/*`, `backend/src/modules/account-security`, `account-activity` |
| Confirmation before every transaction | One shared dialog (`useConfirm` / `confirmAction`) shows a summary (gallons, total, payment) before an order, payment, delivery, time in/out or setting is saved. | `mobile/src/components/ui/ConfirmDialog.tsx` |
| Yearly / monthly sales, expenses, income, gallons, new customers | `GET /reports/business-summary?year=` (ready for a web admin) and the admin **Reports** screen. | `backend/src/modules/reports/business-summary.service.ts` |

### Order flow

```
Customer places order ──▶ Pending (red) ──accept──▶ Accepted (on the way, map + rider location)
                              │                           ├──deliver──▶ Delivered (gallons + payment recorded)
                              ├──decline (staff)──▶ Declined         └──fail─────▶ Failed
                              └──cancel (customer)─▶ Cancelled
```

Status changes are atomic (`UPDATE ... WHERE OrderStatus IN (...)`), so two riders can never accept the same order.

---

## Database

Run [`database/aquatap_schema.sql`](database/aquatap_schema.sql) in MySQL Workbench, or `npm run db:setup` inside `backend/`. It creates the **`aquatap_db`** database on your local server. Your other databases (e.g. `tti_devops_db`) are not touched.

Naming conventions:

- Tables are **PascalCase**, singular: `CustomerOrder`, `GallonContract`.
- Primary key: `<Table>ID`, e.g. `CustomerOrderID`.
- Foreign key: **same name as the referenced key**, e.g. `CustomerOrder.CustomerID → Customer.CustomerID`.
- `Is…` for booleans and `…At` for timestamps.
- Named constraints: `FK_CustomerOrder_CustomerID`, `UQ_UserAccount_Email`, `IX_…`.

```
WaterStation 1─┬─* UserAccount        (login: Google SSO, role Admin/Employee/Customer)
               ├─* Employee ─1 UserAccount
               ├─* Customer ─1 UserAccount
               │      ├─* GallonContract   (signed e-contract, borrowed gallons)
               │      └─* CustomerOrder ─* Payment
               ├─* EmployeeShift  (time in/out + saved totals) ─* Expense
               ├─* PaymentChannel (GCash / bank + QR)
               └─* StationDocument (KYB files: BIR COR, permits, water analysis, owner ID)
```

KYB status of a station (`WaterStation.VerificationStatus`):

```
NotSubmitted ──owner submits──▶ UnderReview ──reviewer approves──▶ Verified (visible to customers)
                                     └──asks for changes──▶ Rejected ──owner fixes & resubmits──▶ UnderReview
```

> Already created `aquatap_db` before the profile / account-safety feature? Run `npm run db:migrate -- ../database/migrations/003_account_security.sql` inside `backend/` (safe to run again). It adds the password, two-step and photo columns to `UserAccount` and the tables `UserSession`, `TwoFactorRecoveryCode` and `AccountActivity`.

> Already created `aquatap_db` before the KYB feature? Run [`database/migrations/002_station_kyb.sql`](database/migrations/002_station_kyb.sql) once. It also marks existing stations as Verified.

> **Note (Windows):** MySQL on Windows is installed with `lower_case_table_names=1`, so Workbench *displays* table names in lowercase (`customerorder`). Column names stay PascalCase. MySQL 8 only allows this setting when the server is first initialized. On a Linux server the tables keep their PascalCase names exactly as written in the script.

Optional demo data: `npm run db:seed` loads [`database/aquatap_seed.sql`](database/aquatap_seed.sql), which creates 1 station, an owner, a rider, 2 customers and 5 months of orders.

---

## Running it locally

Prerequisites: **Node 22** (`nvm use 22.18.0`), MySQL 8 running on `localhost:3306`.

### 1. API (`backend/`)

```bash
cd backend
npm install
cp .env.example .env        # then fill DB_PASSWORD, JWT_SECRET (already filled in your local .env)
npm run db:setup            # creates aquatap_db and its tables
npm run db:seed             # optional demo data
npm run start:dev           # http://localhost:3000/api/v1  ·  Swagger docs: http://localhost:3000/api/docs
```

### 2. Mobile app (`mobile/`)

```bash
cd mobile
npm install
npx expo start              # press "a" for Android emulator, "w" for web, or scan the QR with Expo Go
```

During development the app reaches the API automatically through the IP of the computer running Expo, so your phone and PC must be on the **same Wi-Fi**. To use another server, set `EXPO_PUBLIC_API_URL` in `mobile/.env`.

**Testing without Google:** while `AUTH_DEV_SIGN_IN_ENABLED=true` (backend `.env`), the sign-in screen shows **Developer sign-in**. **Set it to `false` before going live.** Seeded accounts:

| Email | Opens |
|---|---|
| `owner@aquatap.test` | Station owner (admin): orders, daily records, credits, records, reports, employees, QR, settings, KYB |
| `rider@aquatap.test` | Employee / rider app |
| `juan@aquatap.test`, `maria@aquatap.test` | Customer app |
| `admin@aquatap.test` | AquaTap reviewer: approves station KYB documents (from `SYSTEM_ADMIN_EMAILS` in `backend/.env`) |

Any other email starts a brand-new sign-up (customer or station owner).

### 3. Test on a real phone (APK + tunnel, no cable, any network)

The installable app is built in the cloud with **EAS Build** (Expo project `@leyds-team/aquatap`). While the API still runs on your computer, a free **Cloudflare Quick Tunnel** gives it a public HTTPS address the phone can reach from mobile data or any Wi-Fi.

1. Start the API (`npm run start:dev`), then, in a second terminal inside `backend/`:
   ```bash
   npm run tunnel
   ```
   It prints an address like `https://abcd-efgh.trycloudflare.com/api/v1`. Keep that window open. The first run downloads Cloudflare's `cloudflared` into `.tools/` (git-ignored). **The address changes every time the tunnel restarts.**
2. Install the APK from the build page on expo.dev (scan its QR code with the phone and allow "Install unknown apps").
3. In the app's sign-in screen tap **Server › Change**, paste the address, then **Save and connect** (the app checks `/health` first). The address is remembered on the phone.

Builds and updates (run inside `mobile/`):

| When | Command |
|---|---|
| New preview APK (first time, or after adding a library with native code) | `npx eas-cli@latest build --platform android --profile preview` |
| Screens, logic or design changed (JavaScript only) | `npx eas-cli@latest update --channel preview --environment preview --message "what changed"` |

`runtimeVersion` uses the **fingerprint** policy: when native code changes, the fingerprint changes and EAS will not send the update to old builds, so you know a new build is needed. Updates download in the background; close and reopen the app (up to twice) to see them.

Preview builds read `EXPO_PUBLIC_API_URL` (default server) and `EXPO_PUBLIC_ALLOW_SERVER_CHANGE=true` from the EAS **preview** environment (`npx eas-cli@latest env:list --environment preview`). Production builds do not allow changing the server.

> The tunnel is for development only. For a thesis defense or real use, host the API and database online and set `EXPO_PUBLIC_API_URL` to that address.

---

## Design (Tailwind)

The mobile app is styled with **Tailwind CSS classes** through [Uniwind](https://docs.uniwind.dev) (`className="bg-brand rounded-card p-4"`). The theme ("Fresh Water": colors, Plus Jakarta Sans font, shapes) is in [`mobile/src/global.css`](mobile/src/global.css) and the rules for screens, labels (UPPERCASE through the components, plain words) and confirmation dialogs are in [`mobile/DESIGN.md`](mobile/DESIGN.md).

If the styles look missing after pulling changes, start Expo once with a clean cache: `npx expo start --clear`.

---

## Google SSO setup (your keys)

Google Sign-In is free. You only need OAuth client IDs from <https://console.cloud.google.com>.

1. Create a project and configure the **OAuth consent screen** (External, add your test Gmail accounts).
2. **Credentials → Create OAuth client ID → Web application.** Copy the client ID into:
   - `backend/.env` → `GOOGLE_WEB_CLIENT_ID=...` (the app also reads it from the API, so this one place is enough), and
   - optionally `mobile/.env` → `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...`
3. **Credentials → Create OAuth client ID → Android**:
   - Package name: `com.aquatap.app`.
   - SHA-1: the certificate of your build. For a local debug build, run `cd mobile/android && ./gradlew signingReport` after the first `npx expo run:android`. For EAS builds, use `npx eas-cli credentials`.
4. Google Sign-In uses native code, so it does **not** run in Expo Go. Build the app once:
   - `npx expo run:android`, which needs Android Studio and the SDK, or
   - `npx eas-cli@latest build --profile development --platform android` (cloud build, free tier).
5. iOS (optional): create an iOS client ID and put its reversed ID in `mobile/app.json` → `iosUrlScheme`.
6. Put your own Gmail in `SYSTEM_ADMIN_EMAILS` (backend `.env`) to review station KYB submissions.

---

## Project structure

```
backend/src
  common/            enums, guards helpers, decorators, exception filter, utils
  config/            typed environment configuration
  modules/
    auth/            Google ID-token verification (IdentityTokenVerifier abstraction), JWT guards, roles
    user-accounts/   accounts, employee-invite linking
    water-stations/  station registration & settings, contract template
    customers/       e-contract registration, customer list, account summary
    gallon-contracts/ contract template rendering, gallon ledger (remaining-gallon computation)
    customer-orders/ placing orders, order workflow (state machine), records grid
    payments/        credits (utang) list and settlement
    employee-shifts/ time in / time out with saved totals
    expenses/        food, fuel, repairs, ...
    payment-channels/ GCash / bank accounts with QR
    reports/         daily report, yearly business summary (shared calculator)
    station-verifications/ KYB documents, submit for review, approve / reject (SystemAdmin)
    account-security/ devices (sessions), password, two-step sign-in (TOTP), profile photo
    account-activity/ account history: @RecordActivity decorator + interceptor
mobile/src
  app/               screens (Expo Router): sign-in, onboarding, customer/*, staff/*, orders/*, customers/*, admin/*,
                     station-verification (owner KYB), system/* (AquaTap reviewer)
  api/               axios client + typed endpoint functions
  components/ui      design system (Button, TextField, Card, BottomSheet, Toast, ...)
  components/map     free Leaflet / OpenStreetMap map (WebView + web iframe)
  components/signature finger signature pad (react-native-svg)
  features/          screen-specific pieces (onboarding, customer, staff, payments, auth)
  hooks/ store/ theme/ utils/ types/
```

SOLID in practice:

- **Single responsibility:** `CustomerOrdersService` places and reads orders; `OrderWorkflowService` changes their status; `GallonLedgerService` owns the gallon math.
- **Open/closed:** order transitions are rules in `OrderStatusPolicy`.
- **Dependency inversion:** `AuthService` depends on the abstract `IdentityTokenVerifier`, not on Google directly.
- **Shared calculator:** the daily report and the shift time-out use one `TransactionSummaryCalculator`, so the totals always match.

---

## Should there be a web admin?

**Yes — keep the mobile app for operations, and add a web admin for the owner's analytics.**

- Riders and customers are always on their phones (orders, map, time in/out, collections), so they stay on mobile.
- Yearly sales, expenses and income tables, monthly gallon charts, exports to Excel/PDF and printing are much easier to read on a big screen.
- The API is already shaped for it: `GET /reports/business-summary`, `/reports/daily`, `/customer-orders/records`, `/credits` and `/customers` are all reusable. A React (Vite) web admin can sign in with the same Google account and call the same endpoints. No backend rewrite is needed.
- Until the web admin exists, the owner can see the yearly summary in the mobile app (**More › Business reports**).
