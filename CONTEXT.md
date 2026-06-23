# LVS-GSM Shipment Tracker — Project Context

## What this is
A two-phase HAWB reconciliation web app for LVS-GSM, a freight/cargo operation at Pearson Airport (YYZ). Built as a single-file PWA hosted on GitHub Pages.

Shipments arrive as low-value packages grouped under **Master Airway Bills (MAWBs)**. Each MAWB contains multiple **House Airway Bills (HAWBs)**, each with its own tracking ID (`STRCA…`). The app exists to account for all HAWBs within each MAWB across two phases of processing.

## Tech stack
- **Single HTML file** (`index.html`) — self-contained, no build step
- **SheetJS** bundled inline — parses deconsolidated XLSX and RNS CSV in the browser
- **localStorage** — saves all shipment data and scan progress across sessions
- **Supabase** — cloud sync so scan sessions are shared across devices in real time
  - Project: `wzwcfvmhnqwhmfjdcsxj.supabase.co`
  - Use legacy `anon` key (eyJ… format), not the new publishable key
  - Tables: `shipments`, `scans`, `actions`
- **PWA** — manifest.json + sw.js make it installable and offline-capable
- **Hosted** on GitHub Pages at `https://cheezeburrito.github.io/lvs-gsm-tracker/`

## Repo structure
```
lvs-gsm-tracker/
├── index.html        ← the entire app (HTML + CSS + JS + SheetJS bundled)
├── manifest.json     ← PWA manifest
├── sw.js             ← service worker for offline caching
├── icon-192.png      ← GTA GSM logo, PWA icon
├── icon-512.png      ← GTA GSM logo, PWA icon large
└── CONTEXT.md        ← this file
```

## User identity
On first load users are prompted to enter their name. This is stored as the operator label and appears on all exports and Supabase records. Multiple operators work on different devices simultaneously.

---

## Phase 1 — Physical Receipt (Pre-scan)

### Purpose
As parcels physically arrive off the aircraft/truck, staff scan each one to confirm it is on hand. The output is a report showing which HAWBs (tracking IDs) under each MAWB (CCN) were received and which are missing.

### Data source
- **Deconsolidated XLSX** (from shipper/internal system)
  - Key columns: `CCN`, `Carton`, `Reference` (tracking ID, format `STRCA…`)

### Scanning workflow
1. Operations employee opens a **Google Doc** on their computer
2. CipherLab scanner gun (keyboard-wedge/HID mode) scans each physical parcel → keystrokes go into the Google Doc
3. When done, operator copies the Google Doc content and **pastes the batch** into the app's text area
4. App matches each value against the manifest (by tracking ID or CCN)
5. UI shows per-CCN breakdown: scanned (present) vs not scanned (missing)
6. **Export Excel** → file showing all CCNs, their HAWBs, and scanned/missing status

### Notes
- No live keystroke capture — input is always batch paste
- Matching is done via `norm()` — strips to A-Z0-9 uppercase — on both tracking ID and CCN

---

## Phase 2 — CBSA Clearance Check (Post-scan)

### Purpose
After the shipment has been processed through BorderConnect, cross-reference the deconsolidated file against the RNS export to flag any parcel not yet Released by CBSA.

### Data sources
1. **Deconsolidated XLSX** — same file as Phase 1
2. **RNS CSV** (BorderConnect export)
   - Key columns: `Cargo Control Number` (CCN), `Status`
   - Status values: `Released`, `Examination Required`, `Arrived`, `Awaiting CBSA Processing`, etc.

### Scanning workflow
1. Upload both files → app joins them on CCN, builds combined manifest
2. Paste batch of scanned tracking IDs (same Google Doc method as Phase 1)
3. Any pasted parcel whose RNS status is **not** `Released` is flagged inline
4. **Export report** → titled with AWB, showing all CCNs, their HAWBs, and CBSA status; non-released items highlighted

### Status classification
| RNS Status | Flag | UI treatment |
|---|---|---|
| `Released` | cleared | no alert |
| `Examination Required` | exam | amber flag |
| anything else | hold | cyan flag |

---

## localStorage schema
```javascript
// key: cartonReconcile_v3 (bump version on schema changes)
{
  operator: "Oscar",
  shipments: {
    "[shipment-id]": {
      id, name, phase,         // phase: "prescan" | "cbsa"
      createdAt,
      manifest: [{ ccn, carton, tracking, status? }],
      scanned: [],             // normed tracking IDs confirmed present
      rawPaste: ""             // raw paste for re-processing
    }
  }
}
```

---

## Key architectural notes

- **Never copy-paste `index.html` through github.dev** — the SheetJS bundle gets corrupted. Always use Upload Files (Ctrl+Shift+P → Files: Upload Files)
- Service worker caches aggressively — bump the SW cache name string on every deploy that changes behavior
- `norm()` strips everything except A-Z0-9 and uppercases — used for all CCN/tracking ID matching
- The scanner gun is NOT directly connected to the web app — it feeds a Google Doc; the app only receives batch paste

## Company context
- **Company:** LVS-GSM (cargo/freight operations, Pearson Airport YYZ)
- **System:** BorderConnect for CBSA customs clearance
- **Scanner hardware:** CipherLab RS51 (Android, keyboard-wedge mode) → feeds Google Doc
- **Operator:** Oscar (primary developer and user)
- **GitHub account:** cheezeburrito
- **Live URL:** https://cheezeburrito.github.io/lvs-gsm-tracker/
