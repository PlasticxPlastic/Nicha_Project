# Venio Customer Service Issue Insight Dashboard

Local desktop-first dashboard for importing Venio issue CSV files, analyzing pending/resolved issues, detecting Venio categories, and exporting feedback reports.

## Run

```powershell
npm run dev
```

Open:

```text
http://localhost:4173
```

On first run, the app imports the provided sample CSV from:

```text
C:\Users\usEr\Downloads\tickets_export_with_dates - Tickets.csv
```

Uploaded data is stored locally in `data/venio.sqlite`.

## Vercel No-Database Demo

This project can also deploy to Vercel as a static no-database demo.

In the deployed version:

* CSV upload works in the browser.
* Data is stored in the browser's `localStorage`.
* Project Dashboard opens with the included static project seed from `public/demo-data.json`.
* Add Project works in the browser and opens the project edit popup for dashboard fields.
* Dashboard, board, filters, notes, manual category correction, settings, PDF, and Excel exports work.
* Data persists only in the same browser/device.
* Data is not shared between users or devices.
* Clearing browser storage removes uploaded data.

Deploy with Vercel using the included `vercel.json`.

## Included

* CSV upload and required column validation
* SQLite storage and upload history
* Dashboard metrics, charts, and feedback summary
* Kanban board grouped by Status Category
* Issue table with filters, search, sorting, PDF print report, and Excel export
* Issue detail modal with read-only imported fields, notes, and manual category correction
* Rule-based Venio category detection with English and Thai keywords
* Configurable thresholds and keyword rules
* 2-week comparison based on Report Date
* English primary / Thai secondary labels
* Dark mode
