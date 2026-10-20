# LOR Inventory demo

A standalone, test-data-only inventory dashboard. Open `index.html` in a modern browser; no package installation or server is required.

## What it does

- Tracks Lowcountry inventory with opening count/value, quantity subtracted/added, current count, and current value by item.
- Shows annual movement totals, on-hand quantities, item unit values, and estimated on-hand value.
- Filters the movement log by reporting year, date range, and movement type; searches stock by name, size, and category.
- Accepts CSV exports and public Google Sheets CSV feeds. Rows are previewed and validated before import.
- Exports a year-end annual inventory estimate as CSV.
- Uses the Lowcountry item names and sample counts/values from the supplied inventory screenshot. “Reset sample data” restores only the demo data in this browser.
- Opens the Add inventory form at `https://form.jotform.com/241895593214161` in a new tab.
- Keeps the sample inventory catalog in one data list so it can be replaced with an inventory Google Sheets source when that sheet is available; no live catalog sync is configured yet.

## Calculation and valuation limits

- Inventory table uses opening count/value as the prior-year sample balance, then shows current-year quantity added/subtracted and the resulting count/value.
- Current value = current count × the latest recorded per-item unit value.
- Estimated on-hand value = on-hand quantity multiplied by the latest recorded unit value through the report's year-end date.
- Annual received/distributed totals use the movement date; annual year-end stock includes all earlier movements.
- Unit values are manually recorded internal estimates. They are not an IRS-approved valuation, a tax receipt, or tax advice, and this dashboard does not determine fair market value or deductible contributions.
- Keep source documents and obtain tax/accounting guidance for formal reporting.

## CSV format

Required headers: `date`, `type` (`received` or `distributed`), `item`, `quantity`.

Optional headers: `category`, `size`, `unit_value`, `source`, `notes`. Use ISO dates (`YYYY-MM-DD`), positive whole-number quantities, and nonnegative unit values. If `unit_value` is omitted, an earlier value for the same item and size is reused; if none exists, the row is rejected for review. Imports that would distribute more stock than available on that date are rejected row by row. Invalid rows are not imported.

## Integrations and persistence

This workspace contains no application server, authentication, database, or production connector. Activity is stored only in the browser running the demo and is not synchronized between staff or devices.

- Google Sheets import fetches a published CSV URL from the browser. The sheet must be public and permit browser CORS access. Private/authenticated Sheets need a server-side integration.
- Jotform CSV exports can be uploaded. Live Jotform API synchronization is not implemented; an API key must not be placed in frontend code.
- Do not enter real client records or personally identifying information.

## Browser verification

The dashboard was exercised with synthetic sample entries for receipts, distributions, sizes, values, filtering, and CSV review. Live authenticated Google Sheets/Jotform access and server persistence cannot be verified in this standalone workspace because no credentials or backend are provided.
