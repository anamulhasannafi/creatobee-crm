# CREATo BEE — Advanced Business Management System & Multi-Currency Agency ERP (v4.2 Upgrade)

Enterprise Agency Operations, Multi-Currency Accounting (`USD` / `BDT`), Deterministic Ad Campaign Lifecycle Engine, Local Node.js QR & PDF Invoice Generator, and Deployment-Hardened Control Center.

---

## 1. System Requirements
- **CPU / RAM**: Minimum 1 vCPU, 1 GB RAM (2 GB RAM recommended for production `next build` compilation).
- **Database**: PostgreSQL 14, 15, or 16 (`node-postgres` / `pg` connection pool with Drizzle ORM).
- **Disk Space**: 500 MB for application runtime + additional space in `STORAGE_DIR` for uploaded branding assets, receipts, and JSON/SHA-256 backup snapshots.
- **Operating Systems Supported**: Linux (Ubuntu/Debian/AlmaLinux/CloudLinux cPanel), macOS, Windows Server, and Docker/OCI containers.

## 2. Supported Node.js Version
- **Recommended LTS**: **Node.js `>= 20.10.0` (Node 20 LTS or Node 22 LTS)**.
- Native Node `crypto` (PBKDF2-SHA512 & SHA-256) and pure JavaScript `qrcode` + `jspdf` are used so no native C++/Python compilation (`node-gyp`) or root compiler access is required on shared hosting.

## 3. Dependency Installation
```bash
npm ci
# Or in development environments:
npm install
```

## 4. Environment Variable Setup
Copy `.env.example` to `.env` and configure values for your target host:
```bash
cp .env.example .env
```
Key variables:
- `PORT`: Port assigned by hosting provider (default `3000`).
- `DATABASE_URL`: Full PostgreSQL connection string (`postgresql://user:pass@host:5432/dbname`).
- `SESSION_SECRET`: 64-character random secret (`openssl rand -hex 32`).
- `COOKIE_SECURE`: `auto` (detects `X-Forwarded-Proto: https`), `true` (force HTTPS cookies), or `false` (local HTTP testing).
- `TRUST_PROXY`: `true` when behind Nginx, Apache, Cloudflare, or cPanel Phusion Passenger.
- `STORAGE_DIR`: Writable path for file uploads (e.g. `./storage/uploads`).
- `APP_TIMEZONE`: IANA timezone identifier (default `Asia/Dhaka`).

## 5. Database Creation and Configuration
Create a dedicated PostgreSQL user and database:
```sql
CREATE USER creatobee_user WITH ENCRYPTED PASSWORD 'Strong_Production_Password_2026';
CREATE DATABASE creatobee_erp OWNER creatobee_user;
GRANT ALL PRIVILEGES ON DATABASE creatobee_erp TO creatobee_user;
```

## 6. Database Migration
Apply versioned Drizzle schema changes safely without dropping existing production tables:
```bash
npx drizzle-kit push
```
- **Data Safety Guarantee**: `drizzle-kit push` inspects existing schema tables (`admins`, `admin_sessions`, `business_settings`, `clients`, `orders`, `invoices`, `payments`, `expenses`, `campaigns`, `exchange_rates`, `uploaded_files`, `backups`, `system_logs`) and applies additive schema updates without erasing production data.

## 7. First Admin Setup
On first launch:
1. The bootstrap engine ensures a baseline owner account is available (`admin` / `admin@creatobee.com`, password `CreatoBee#2026!`) **and** exposes the **First-Time Setup / Provision Admin** workflow directly in the Admin Security Modal.
2. You can create a new Super Admin or rotate credentials at any time via **Admin Login & Security -> First-Time Setup / Provision Admin** or **Forgot Password -> Cryptographic Recovery Token**.

## 8. Local Development
```bash
npm run dev
```
Access the application at `http://localhost:3000`.

## 9. Production Build
```bash
npx next typegen
npm exec tsc -- --noEmit
npm run build
```

## 10. Production Startup
```bash
npm run start
```
Respects the `PORT` environment variable automatically (`next start -p ${PORT:-3000}`).

## 11. cPanel Node.js Deployment
1. In cPanel, open **PostgreSQL Databases**, create your database and user, and record the `DATABASE_URL`.
2. Open **Setup Node.js App** -> **Create Application**:
   - **Node.js version**: Select `20.x` or `22.x`.
   - **Application mode**: `Production`.
   - **Application root**: Path to your project directory.
   - **Application startup file**: `node_modules/next/dist/bin/next` with argument `start` (or custom `server.js` wrapper).
3. Add the environment variables from `.env.example` in the cPanel Node.js interface.
4. Run `npm ci && npx drizzle-kit push && npm run build` via cPanel Terminal or SSH, then click **Restart Application**.
5. *Hosting Difference Note*: Shared cPanel hosts using Phusion Passenger manage the `PORT` socket automatically and terminate SSL at Apache/LiteSpeed. Set `COOKIE_SECURE=auto` and `TRUST_PROXY=true`.

## 12. VPS Deployment (Ubuntu / Debian + systemd + Nginx)
1. Install Node.js 20 LTS, PostgreSQL 16, and Nginx.
2. Clone the repository to `/var/www/creatobee-erp`, configure `.env`, and run:
   ```bash
   npm ci
   npx drizzle-kit push
   npm run build
   ```
3. Create `/etc/systemd/system/creatobee.service`:
   ```ini
   [Unit]
   Description=Creato Bee ERP Production Server
   After=network.target postgresql.service

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/var/www/creatobee-erp
   EnvironmentFile=/var/www/creatobee-erp/.env
   ExecStart=/usr/bin/npm run start
   Restart=on-failure
   RestartSec=5

   [Install]
   WantedBy=multi-user.target
   ```
4. Enable and start: `sudo systemctl enable --now creatobee`.

## 13. Domain and Subdomain Configuration
Configure your reverse proxy (Nginx or Apache) to forward traffic to `http://127.0.0.1:3000` and preserve proxy headers:
```nginx
server {
    server_name erp.yourdomain.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 14. HTTPS Configuration
Install Let's Encrypt SSL via Certbot (`sudo certbot --nginx -d erp.yourdomain.com`) or cPanel AutoSSL. Ensure `X-Forwarded-Proto` is passed so session cookies automatically activate the `Secure` attribute over HTTPS.

## 15. File Storage Permissions
Ensure the process user (`www-data` or your cPanel account user) has read/write permissions on `STORAGE_DIR`:
```bash
mkdir -p ./storage/uploads
chmod 750 ./storage/uploads
```
In addition to filesystem path references, Creato Bee stores verified base64 Data URI snapshots in PostgreSQL (`uploaded_files.data_uri` and `business_settings`), ensuring zero broken logos, signatures, or QR codes even on ephemeral container filesystems.

## 16. QR and PDF Compatibility
- **Zero External API Dependency**: QR codes are generated locally inside Node.js using `qrcode` (`toDataURL` PNG + `toString` SVG).
- **Immutable Invoice Snapshots**: When an invoice is generated, its exact QR Data URI and payload are snapshotted onto the invoice record (`qr_data_uri_snapshot`).
- **PDF Rendering**: `downloadInvoicePdf()` embeds the PNG Data URI directly into the A4 PDF binary via `jsPDF` (`doc.addImage(..., 'PNG')`).
- **Compliance Notice**: A QR code containing a payment link does not itself confirm payment. Invoices are marked `PARTIALLY_PAID` or `PAID` only when a verified payment entry is recorded in the ledger.

## 17. Backup and Restore
- Navigate to **Backup & Restore** in the sidebar to create an instant SHA-256 checksummed JSON snapshot of all database tables and asset metadata.
- Download `.json` backup archives to local storage at any time.
- Destructive restores require explicit administrator confirmation (`RESTORE_CONFIRMED`) and SHA-256 integrity validation.
- For automated scheduled backups on VPS/cPanel, configure a cron job (`0 2 * * * pg_dump $DATABASE_URL > /backups/creatobee_$(date +\%F).sql`).

## 18. Troubleshooting Common Login Errors
| Diagnostic Code | Meaning & Resolution |
| :--- | :--- |
| `DB_MISSING_ENV` | `DATABASE_URL` is not set in `.env`. Add it and restart the server. |
| `DB_CONNECTION_REFUSED` | PostgreSQL service is stopped or firewall blocks port `5432`. |
| `DB_AUTH_FAILED` | Incorrect database username or password in `DATABASE_URL`. |
| `AUTH_USER_NOT_FOUND` | Username/email does not exist. Use `admin` / `admin@creatobee.com` or run **First-Time Setup**. |
| `AUTH_INVALID_PASSWORD` | Password hash mismatch. Use **Forgot Password** to generate a recovery token. |

## 19. Troubleshooting Database Errors
- Inspect `/api/health` or the **System Diagnostics & Logs** module in the UI.
- If a table is missing after a fresh deployment, run `npx drizzle-kit push`.
- Never run `DROP TABLE` on production databases; use Backup & Restore before major upgrades.

## 20. Updating the Application Safely
1. Create and download a manual backup from **Backup & Restore**.
2. Pull the updated source code (`git pull origin main`).
3. Install dependencies (`npm ci`).
4. Run additive schema migrations (`npx drizzle-kit push`).
5. Build the production bundle (`npm run build`) and restart the Node.js service.
