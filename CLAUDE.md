# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

HAWB (House Airway Bill) reconciliation web app for LVS-GSM (freight/cargo, Pearson Airport YYZ). Used by warehouse staff to account for all house airway bills within master airway bills (MAWBs) across two distinct workflow phases.

**Live URL:** https://cheezeburrito.github.io/lvs-betatracker-1/  
**GitHub account:** cheezeburrito

## Architecture

Single-file app — `index.html` contains all HTML, CSS, JS, and SheetJS (~850KB) bundled inline. No build step, no framework, no dependencies to install.

Supporting PWA files: `manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png`.

**Deployment:** push to `main` → GitHub Pages serves it. Bump the SW cache name on breaking changes — users may need Ctrl+Shift+R otherwise.

**Critical:** never edit `index.html` via github.dev — copy-pasting corrupts the SheetJS bundle. Always use **Upload Files** (Ctrl+Shift+P → Files: Upload Files).

**Cloud sync:** Supabase project `wzwcfvmhnqwhmfjdcsxj.supabase.co`. Use the legacy `anon` key (eyJ… format), not the new publishable key format.

## User identity

On first load (and accessible via settings), users are prompted to enter their name. This name is stored and used as the session/operator label on all exports and Supabase records. Multiple operators may use the app on different devices simultaneously.

## Two-phase workflow

The app has two separate interfaces accessible from a top-level tab/mode switcher:

---

### Phase 1 — Physical Receipt (Pre-scan)

**Goal:** As parcels physically arrive, scan each one to confirm it is on hand. Output a report showing which HAWBs under each MAWB (CCN) were received and which are missing.

**Input:** Deconsolidated XLSX only  
**Columns used:** `CCN` (= HAWB/MAWB identifier), `Carton`, `Reference` (tracking ID, format `STRCA…`)

**Scanning method:** The CipherLab scanner gun is in keyboard-wedge/HID mode pointed at a **Google Doc** on an operations employee's computer. Staff scan all parcels into the Google Doc, then **paste the batch** into the app's text area. There is no live keystroke capture in Phase 1 — input is always batch paste.

**Flow:**
1. Upload deconsolidated XLSX → app parses and builds a manifest of all CCNs and their tracking IDs
2. Paste batch scan text from Google Doc → app matches each scanned value (by tracking ID or CCN, via `norm()`) against the manifest
3. UI shows per-CCN breakdown: which tracking IDs are present (scanned) vs missing
4. Export Excel → file with scanned vs missing per CCN/HAWB

---

### Phase 2 — CBSA Clearance Check (Post-scan)

**Goal:** After the shipment has been processed through BorderConnect, cross-reference the deconsolidated file with the RNS export to flag any parcels that are not yet Released.

**Input:** Deconsolidated XLSX + RNS CSV (BorderConnect export)  
**RNS columns used:** `Cargo Control Number`, `Status`

**Scanning method:** Same as Phase 1 — batch paste from Google Doc scan session.

**Flow:**
1. Upload deconsolidated XLSX + RNS CSV → app joins them on CCN
2. Paste batch of scanned tracking IDs
3. Any pasted parcel whose RNS status is **not** `Released` triggers an alert (flagged inline, distinct UI state)
4. Export report → file titled with AWB, showing all CCNs and statuses, highlighting non-released items

**Status handling:**
- `Released` → cleared, no flag
- `Examination Required` → flagged (amber)
- anything else (Awaiting CBSA Processing, Arrived, etc.) → flagged (cyan)

---

## Shared conventions

- `norm(val)` — strips everything except A-Z0-9, uppercases — used for all matching (tracking ID and CCN)
- Matching always tries both tracking ID and CCN so either can be scanned
- localStorage key: `cartonReconcile_v3` — bump version suffix on schema changes
- Supabase tables: `shipments`, `scans`, `actions`, `operators`, `customers`, `admins` — all live and production-ready
- Admin auth uses bcrypt via `verify_admin()` / `upsert_admin()` / `delete_admin()` / `list_admins()` SECURITY DEFINER RPCs — anon has no direct access to the `admins` table

## localStorage schema

```javascript
{
  operator: "Oscar",           // set on first-launch prompt
  shipments: {
    "[id]": {
      id, name, phase,         // phase: "prescan" | "cbsa"
      createdAt,
      manifest: [{ ccn, carton, tracking, status? }],
      scanned: [],             // normed tracking IDs seen
      rawPaste: ""             // raw paste content for re-processing
    }
  }
}
```
