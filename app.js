(() => {
  "use strict";

  const STORAGE_KEY = "lor-inventory-demo-v2";
  const today = new Date().toISOString().slice(0, 10);
  const currentYear = new Date().getFullYear();
  const sampleInventory = [
    ["Blankets",204,1128.12,3,1],["Books",18083,13562.25,2,1],["Childrens Bottoms",10996,76972,2,1],
    ["Childrens Dresses",747,7753.86,1,1],["Childrens Jackets",1174,24043.52,2,1],["Childrens Pajamas",956,5238.88,2,1],
    ["Childrens Shoes",451,3414.07,2,1],["Childrens Socks",567,907.20,2,1],["Childrens Tops",11403,70128.45,2,1],
    ["Childrens Underwear",493,1824.10,2,1],["Diapers",1205,8736.25,5,1],["Elementary School Bookbag & Supplies",148,6660,5,1],
    ["Mens Bottoms",1111,9776.80,3,1],["Mens Jackets",247,5352.49,3,1],["Mens Pajamas",142,969.86,3,1],
    ["Mens Shoes",238,4907.56,3,1],["Mens Socks",476,1428,3,1],["Mens Tops",1531,15493.72,3,1],
    ["Mens Underwear",1238,3255.94,3,1],["Middle/High School Bookbag & Supplies",66,3616.80,2,1],["Pull Ups",53,384.25,5,1],
    ["Stuffed Animals",5948,55019,7,1],["Toiletry Kit 0-5",198,1346.40,3,1],["Toiletry Kit 6-11",184,1840,2,1],
    ["Toiletry Kit 12-18",151,1661,2,1],["Wipes",745,1862.50,5,1],["Womens Bottoms",1064,9075.92,2,1],
    ["Womens Dresses",654,10483.62,2,1],["Womens Jackets",249,2614.50,2,1],["Womens Pajamas",220,2310,2,1],
    ["Womens Shoes",239,4832.58,2,1],["Womens Socks",548,739.80,2,1],["Womens Tops",2117,21424.04,2,1],
    ["Womens Underwear",604,1902.60,2,1],
  ];
  const seed = sampleInventory.flatMap(([item, initialCount, initialValue, quantitySub, quantityAdd], index) => {
    const unitValue = Math.round((initialValue / initialCount) * 100) / 100;
    const common = { item, category: "Inventory", size: "One size", unitValue, notes: "" };
    return [
      { ...common, id: `opening-${index}`, date: `${currentYear - 1}-12-31`, type: "opening", quantity: initialCount, source: "Sample opening balance" },
      ...(quantitySub ? [{ ...common, id: `out-${index}`, date: `${currentYear}-01-10`, type: "distributed", quantity: quantitySub, source: "Sample quantity sub" }] : []),
      ...(quantityAdd ? [{ ...common, id: `in-${index}`, date: `${currentYear}-01-11`, type: "received", quantity: quantityAdd, source: "Sample quantity add" }] : []),
    ];
  });

  const isValidIsoDate = (date) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const parsed = new Date(`${date}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
  };
  let entries = loadEntries();
  let pendingImport = [];
  let toastTimer;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const money = (amount) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(amount);
  const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

  function loadEntries() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === null) return seed.map((entry) => ({ ...entry }));
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.some((entry) => !entry || typeof entry !== "object"
        || !isValidIsoDate(entry.date) || !["opening", "received", "distributed"].includes(entry.type)
        || typeof entry.item !== "string" || !entry.item.trim()
        || !Number.isSafeInteger(entry.quantity) || entry.quantity < 1
        || typeof entry.size !== "string"
        || !Number.isFinite(entry.unitValue) || entry.unitValue < 0)) {
        throw new Error("Saved demo data has an unexpected format.");
      }
      return parsed;
    } catch (error) {
      console.error("Could not load local demo data:", error);
      return seed.map((entry) => ({ ...entry }));
    }
  }

  function saveEntries() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      return true;
    } catch (error) {
      console.error("Could not save local demo data:", error);
      showToast("Could not save changes in this browser. Check available storage.");
      return false;
    }
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
  }

  function groupStock(source = entries) {
    const groups = new Map();
    const ordered = [...source].sort((a, b) => a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id)));
    for (const entry of ordered) {
      const key = `${entry.item.toLocaleLowerCase()}|${entry.size.toLocaleLowerCase()}`;
      let row = groups.get(key);
      if (!row) {
        row = { item: entry.item, category: entry.category || "Uncategorized", size: entry.size || "Unspecified", quantity: 0, unitValue: 0, valueDate: "", received: 0, distributed: 0 };
        groups.set(key, row);
      }
      if (entry.type !== "distributed") {
        row.quantity += entry.quantity;
        if (entry.type === "received") row.received += entry.quantity;
      } else {
        row.quantity -= entry.quantity;
        row.distributed += entry.quantity;
      }
      if (entry.unitValue !== null && entry.unitValue !== undefined && entry.date >= row.valueDate) {
        row.unitValue = entry.unitValue;
        row.valueDate = entry.date;
      }
      if (entry.category) row.category = entry.category;
    }
    return [...groups.values()].filter((row) => row.quantity !== 0 || row.received || row.distributed);
  }

  function renderYears() {
    const years = new Set([currentYear, ...entries.map((entry) => Number(entry.date.slice(0, 4))).filter(Number.isFinite)]);
    const ordered = [...years].sort((a, b) => b - a);
    $$(".year-select").forEach((select) => {
      const old = select.value;
      select.innerHTML = ordered.map((year) => `<option value="${year}">${year}</option>`).join("");
      if (ordered.includes(Number(old))) select.value = old;
      else select.value = String(currentYear);
    });
  }

  function renderDashboard() {
    const year = Number($("#dashboardYear").value) || currentYear;
    const yearEntries = entries.filter((entry) => entry.date.startsWith(`${year}-`));
    const received = yearEntries.filter((entry) => entry.type === "received").reduce((sum, entry) => sum + entry.quantity, 0);
    const distributed = yearEntries.filter((entry) => entry.type === "distributed").reduce((sum, entry) => sum + entry.quantity, 0);
    const stock = groupStock();
    $("#kpiReceived").textContent = received.toLocaleString();
    $("#kpiDistributed").textContent = distributed.toLocaleString();
    $("#kpiStock").textContent = stock.reduce((sum, row) => sum + row.quantity, 0).toLocaleString();
    $("#kpiValue").textContent = money(stock.reduce((sum, row) => sum + row.quantity * row.unitValue, 0));
    $("#kpiReceivedSub").textContent = `units added in ${year}`;
    $("#kpiDistributedSub").textContent = `units to community in ${year}`;
    const overviewRows = stock.filter((row) => row.quantity > 0).sort((a, b) => (b.quantity * b.unitValue) - (a.quantity * a.unitValue)).slice(0, 5);
    $("#overviewInventory").innerHTML = overviewRows.length ? overviewRows.map((row) => {
      const low = row.quantity < 10;
      const width = Math.max(4, Math.min(100, row.quantity / 60 * 100));
      return `<tr><td>${escapeHtml(row.item)}<small class="cell-sub">${escapeHtml(row.size)}</small></td><td><span class="quantity-pill ${low ? "low" : ""}">${row.quantity}</span></td><td class="money">${money(row.unitValue)}</td><td class="money">${money(row.quantity * row.unitValue)}</td><td><div class="stock-track"><div class="stock-fill ${low ? "low" : ""}" style="width:${width}%"></div></div></td></tr>`;
    }).join("") : `<tr><td colspan="5">No stock on hand.</td></tr>`;
    $("#recentActivity").innerHTML = [...entries].filter((entry) => entry.type !== "opening").sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id))).slice(0, 5).map(activityMarkup).join("") || `<div class="empty-state">No activity yet.</div>`;
  }

  function activityMarkup(entry) {
    const received = entry.type === "received";
    return `<div class="activity-row"><span class="activity-mark ${received ? "received" : "distributed"}">${received ? "↓" : "↑"}</span><div class="activity-copy"><strong>${escapeHtml(entry.item)} · ${escapeHtml(entry.size || "One size")}</strong><small>${formatDate(entry.date)}${entry.source ? ` · ${escapeHtml(entry.source)}` : ""}</small></div><span class="activity-amount ${received ? "in" : "out"}">${received ? "+" : "−"}${entry.quantity}</span></div>`;
  }

  function formatDate(date) {
    const parsed = new Date(`${date}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? escapeHtml(date) : parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function renderInventory() {
    const query = $("#inventorySearch").value.trim().toLocaleLowerCase();
    const year = currentYear;
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    const opening = aggregateItems(groupStock(entries.filter((entry) => entry.date < startDate)));
    const closing = aggregateItems(groupStock(entries.filter((entry) => entry.date <= endDate)));
    const movement = new Map();
    for (const entry of entries.filter((record) => record.date >= startDate && record.date <= endDate)) {
      const key = entry.item.toLocaleLowerCase();
      const totals = movement.get(key) || { added: 0, subtracted: 0 };
      if (entry.type === "received") totals.added += entry.quantity;
      else if (entry.type === "distributed") totals.subtracted += entry.quantity;
      movement.set(key, totals);
    }
    const itemNames = new Set([...opening.keys(), ...closing.keys(), ...movement.keys()]);
    const rows = [...itemNames].map((key) => {
      const initial = opening.get(key) || { item: closing.get(key)?.item || movement.get(key)?.item || key, count: 0, value: 0 };
      const current = closing.get(key) || { item: initial.item, count: 0, value: 0 };
      const changes = movement.get(key) || { added: 0, subtracted: 0 };
      return { item: current.item || initial.item, initialCount: initial.count, initialValue: initial.value, added: changes.added, subtracted: changes.subtracted, currentCount: current.count, currentValue: current.value };
    }).sort((a, b) => a.item.localeCompare(b.item));
    const filteredRows = rows.filter((row) => row.item.toLocaleLowerCase().includes(query));
    $("#inventoryCount").textContent = `${plural(filteredRows.length, "item")} · Lowcountry`;
    $("#inventoryRows").innerHTML = filteredRows.map((row) => `<tr><td>${escapeHtml(row.item)}</td><td>${row.initialCount.toLocaleString()}</td><td class="money">${money(row.initialValue)}</td><td>${row.subtracted.toLocaleString()}</td><td>${row.added.toLocaleString()}</td><td>${row.currentCount.toLocaleString()}</td><td class="money">${money(row.currentValue)}</td></tr>`).join("");
    $("#inventoryEmpty").classList.toggle("hidden", filteredRows.length !== 0);
    const totals = rows.reduce((result, row) => ({
      initialCount: result.initialCount + row.initialCount,
      initialValue: result.initialValue + row.initialValue,
      added: result.added + row.added,
      subtracted: result.subtracted + row.subtracted,
      currentCount: result.currentCount + row.currentCount,
      currentValue: result.currentValue + row.currentValue,
    }), { initialCount: 0, initialValue: 0, added: 0, subtracted: 0, currentCount: 0, currentValue: 0 });
    $("#inventorySummaryYear").textContent = `Opening balance and activity for ${year} · Lowcountry`;
    $("#inventoryInitialCount").textContent = totals.initialCount.toLocaleString();
    $("#inventorySummaryAdded").textContent = totals.added.toLocaleString();
    $("#inventorySummarySubtracted").textContent = totals.subtracted.toLocaleString();
    $("#inventorySummaryCount").textContent = totals.currentCount.toLocaleString();
    $("#inventorySummaryValue").textContent = money(totals.currentValue);
  }

  function aggregateItems(groups) {
    const aggregated = new Map();
    for (const row of groups) {
      const key = row.item.toLocaleLowerCase();
      const result = aggregated.get(key) || { item: row.item, count: 0, value: 0 };
      result.count += row.quantity;
      result.value += row.quantity * row.unitValue;
      aggregated.set(key, result);
    }
    return aggregated;
  }

  function renderActivity() {
    const year = $("#activityYear").value;
    const from = $("#dateFrom").value;
    const to = $("#dateTo").value;
    const type = $("#activityType").value;
    const filtered = [...entries].filter((entry) => entry.type !== "opening" && (!year || entry.date.startsWith(`${year}-`)) && (!from || entry.date >= from) && (!to || entry.date <= to) && (type === "all" || entry.type === type)).sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)));
    $("#activityCount").textContent = plural(filtered.length, "record");
    $("#activityRows").innerHTML = filtered.map((entry) => `<tr><td>${formatDate(entry.date)}</td><td><span class="status-label ${entry.type === "distributed" ? "low-label" : ""}"><i></i>${entry.type === "received" ? "Received" : "Distributed"}</span></td><td>${escapeHtml(entry.item)}</td><td>${escapeHtml(entry.size || "One size")}</td><td>${entry.quantity}</td><td class="money">${money(entry.unitValue || 0)}</td><td class="money">${money(entry.quantity * (entry.unitValue || 0))}</td><td>${escapeHtml([entry.source, entry.notes].filter(Boolean).join(" · ") || "—")}</td></tr>`).join("");
    $("#activityEmpty").classList.toggle("hidden", filtered.length !== 0);
  }

  function renderReport() {
    const year = Number($("#reportYear").value) || currentYear;
    const throughDate = `${year}-12-31`;
    const period = entries.filter((entry) => entry.date.startsWith(`${year}-`));
    const received = period.filter((entry) => entry.type === "received").reduce((sum, entry) => sum + entry.quantity, 0);
    const distributed = period.filter((entry) => entry.type === "distributed").reduce((sum, entry) => sum + entry.quantity, 0);
    const beforeEnd = entries.filter((entry) => entry.date <= throughDate);
    const rows = groupStock(beforeEnd).sort((a, b) => a.item.localeCompare(b.item) || a.size.localeCompare(b.size));
    $("#reportReceived").textContent = received.toLocaleString();
    $("#reportDistributed").textContent = distributed.toLocaleString();
    $("#reportStock").textContent = rows.reduce((sum, row) => sum + row.quantity, 0).toLocaleString();
    $("#reportValue").textContent = money(rows.reduce((sum, row) => sum + row.quantity * row.unitValue, 0));
    const reportRows = rows.map((row) => {
      const itemEntries = period.filter((entry) => entry.item.toLocaleLowerCase() === row.item.toLocaleLowerCase() && (entry.size || "One size").toLocaleLowerCase() === row.size.toLocaleLowerCase());
      const inQty = itemEntries.filter((entry) => entry.type === "received").reduce((sum, entry) => sum + entry.quantity, 0);
      const outQty = itemEntries.filter((entry) => entry.type === "distributed").reduce((sum, entry) => sum + entry.quantity, 0);
      return { ...row, received: inQty, distributed: outQty, value: row.quantity * row.unitValue };
    });
    $("#reportRows").innerHTML = reportRows.map((row) => `<tr><td>${escapeHtml(row.item)}</td><td>${escapeHtml(row.size)}</td><td>${row.received}</td><td>${row.distributed}</td><td>${row.quantity}</td><td class="money">${money(row.unitValue)}</td><td class="money">${money(row.value)}</td></tr>`).join("") || `<tr><td colspan="7">No inventory activity through ${year} year-end.</td></tr>`;
    const totals = reportRows.reduce((result, row) => ({ received: result.received + row.received, distributed: result.distributed + row.distributed, quantity: result.quantity + row.quantity, value: result.value + row.value }), { received: 0, distributed: 0, quantity: 0, value: 0 });
    $("#reportFoot").innerHTML = `<tr><td colspan="2">TOTAL</td><td>${totals.received}</td><td>${totals.distributed}</td><td>${totals.quantity}</td><td>—</td><td class="money">${money(totals.value)}</td></tr>`;
  }

  function renderAll() {
    renderYears();
    renderDashboard();
    renderInventory();
    renderActivity();
    renderReport();
  }

  function navigate(page) {
    const valid = ["dashboard", "inventory", "activity", "reports", "imports"].includes(page) ? page : "dashboard";
    $$(".page").forEach((section) => section.classList.toggle("active", section.id === `page-${valid}`));
    $$(".nav-link[data-page]").forEach((link) => link.classList.toggle("active", link.dataset.page === valid));
    $("#crumbTitle").textContent = ({ dashboard: "Overview", inventory: "Inventory", activity: "Activity", reports: "Reports", imports: "Data imports" })[valid];
    if (location.hash !== `#${valid}`) history.replaceState(null, "", `#${valid}`);
  }

  function openActivity(type = "received") {
    $("#activityForm").reset();
    $("#entryDate").value = today;
    $("#entryType").value = type;
    $("#entryQuantity").value = "1";
    $("#entryValue").value = "0";
    $("#formError").textContent = "";
    refreshItemSuggestions();
    $("#activityDialog").showModal();
  }

  function refreshItemSuggestions() {
    const names = [...new Set(entries.map((entry) => entry.item))].sort();
    $("#itemSuggestions").innerHTML = names.map((name) => `<option value="${escapeHtml(name)}">`).join("");
  }

  function validateActivity(form) {
    const date = form.date;
    const quantity = Number(form.quantity);
    const unitValue = Number(form.unitValue);
    if (!isValidIsoDate(date)) return "Enter a valid activity date.";
    if (date > today) return "Activity date cannot be in the future.";
    if (!form.item.trim()) return "Enter an item name.";
    if (!Number.isSafeInteger(quantity) || quantity < 1) return "Quantity must be a positive whole number.";
    if (!Number.isFinite(unitValue) || unitValue < 0) return "Unit value must be zero or greater.";
    if (form.type === "distributed") {
      const available = groupStock(entries.filter((entry) => entry.date <= date))
        .find((row) => row.item.toLocaleLowerCase() === form.item.trim().toLocaleLowerCase() && row.size.toLocaleLowerCase() === form.size.toLocaleLowerCase())?.quantity || 0;
      if (quantity > available) return `Only ${available} ${available === 1 ? "unit is" : "units are"} available for this item and size.`;
    }
    return "";
  }

  function addActivity(form) {
    const error = validateActivity(form);
    $("#formError").textContent = error;
    if (error) return;
    const entry = {
      id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: form.date,
      type: form.type,
      item: form.item.trim(),
      category: form.category,
      size: form.size,
      quantity: Number(form.quantity),
      unitValue: Number(form.unitValue),
      source: form.source.trim(),
      notes: form.notes.trim(),
    };
    if (entry.type === "distributed" && Number(form.unitValue) === 0) {
      entry.unitValue = groupStock(entries.filter((existingEntry) => existingEntry.date <= entry.date))
        .find((row) => row.item.toLocaleLowerCase() === entry.item.toLocaleLowerCase() && row.size.toLocaleLowerCase() === entry.size.toLocaleLowerCase())?.unitValue ?? 0;
    }
    entries.push(entry);
    if (saveEntries()) {
      $("#activityDialog").close();
      renderAll();
      showToast("Activity saved to this browser.");
    } else {
      entries.pop();
    }
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (quoted) {
        if (char === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
        else if (char === '"') quoted = false;
        else field += char;
      } else if (char === '"' && field.length === 0) quoted = true;
      else if (char === ",") { row.push(field); field = ""; }
      else if (char === "\n" || char === "\r") {
        if (char === "\r" && text[i + 1] === "\n") i += 1;
        row.push(field); field = "";
        if (row.some((cell) => cell.trim() !== "")) rows.push(row);
        row = [];
      } else field += char;
    }
    if (quoted) throw new Error("CSV contains an unclosed quoted field.");
    row.push(field);
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
    if (rows.length < 2) throw new Error("CSV must include a header and at least one data row.");
    const headers = rows.shift().map((header) => header.replace(/^\uFEFF/, "").trim().toLocaleLowerCase().replace(/[\s-]+/g, "_"));
    const required = ["date", "type", "item", "quantity"];
    const missing = required.filter((header) => !headers.includes(header));
    if (missing.length) throw new Error(`Missing required columns: ${missing.join(", ")}.`);
    return rows.map((cells, index) => {
      const record = Object.fromEntries(headers.map((header, column) => [header, cells[column] ?? ""]));
      const type = String(record.type).trim().toLocaleLowerCase();
      const normalizedType = ["received", "incoming", "in"].includes(type) ? "received" : ["distributed", "outgoing", "out"].includes(type) ? "distributed" : type;
      const quantity = Number(String(record.quantity).trim());
      const rawValue = String(record.unit_value ?? record.value ?? "").trim().replace(/[$,]/g, "");
      const date = String(record.date).trim();
      const item = String(record.item).trim();
      const size = String(record.size || "One size").trim();
      const category = String(record.category || "Clothing").trim();
      const errors = [];
      const priorValuation = entries
        .filter((entry) => entry.date <= date && entry.item.toLocaleLowerCase() === item.toLocaleLowerCase() && (entry.size || "One size").toLocaleLowerCase() === size.toLocaleLowerCase() && Number.isFinite(entry.unitValue))
        .sort((a, b) => b.date.localeCompare(a.date))[0]?.unitValue;
      const unitValue = rawValue === "" ? priorValuation ?? null : Number(rawValue);
      if (!isValidIsoDate(date)) errors.push("Invalid date (use YYYY-MM-DD)");
      if (date > today) errors.push("Future date");
      if (!["received", "distributed"].includes(normalizedType)) errors.push("Type must be received or distributed");
      if (!item) errors.push("Item is missing");
      if (!Number.isSafeInteger(quantity) || quantity <= 0) errors.push("Quantity must be a positive whole number");
      if (rawValue !== "" && (!Number.isFinite(unitValue) || unitValue < 0)) errors.push("Unit value must be zero or greater");
      if (unitValue === null && normalizedType === "received") errors.push("Unit value is missing and there is no earlier recorded value for this item and size");
      return { rowNumber: index + 2, entry: { id: `import-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 5)}`, date, type: normalizedType, item, category, size, quantity, unitValue, source: String(record.source || ""), notes: String(record.notes || "") }, errors };
    });
  }

  function validateImportStock(records) {
    const timeline = [
      ...entries.map((entry) => ({ entry, record: null })),
      ...records.map((record) => ({ entry: record.entry, record })),
    ].sort((a, b) => a.entry.date.localeCompare(b.entry.date)
      || Number(Boolean(a.record)) - Number(Boolean(b.record))
      || (a.record?.rowNumber || 0) - (b.record?.rowNumber || 0));
    const simulated = new Map();
    for (const movement of timeline) {
      const { entry, record } = movement;
      if (record?.errors.length) continue;
      const key = `${entry.item.toLocaleLowerCase()}|${entry.size.toLocaleLowerCase()}`;
      const available = simulated.get(key) || 0;
      if (entry.type !== "distributed") simulated.set(key, available + entry.quantity);
      else if (entry.quantity > available && record) record.errors.push(`Insufficient stock on ${entry.date} (available: ${available})`);
      else if (entry.quantity > available) simulated.set(key, available - entry.quantity);
      else simulated.set(key, available - entry.quantity);
    }
  }

  function showImportPreview(records, sourceName) {
    pendingImport = records.filter((record) => !record.errors.length).map((record) => record.entry);
    const errors = records.reduce((sum, record) => sum + record.errors.length, 0);
    $("#previewSummary").textContent = `${sourceName}: ${records.length} row${records.length === 1 ? "" : "s"} reviewed`;
    $("#previewRows").innerHTML = records.map((record) => {
      const e = record.entry;
      return `<tr class="${record.errors.length ? "preview-row-error" : ""}"><td>${record.rowNumber}</td><td>${escapeHtml(e.date)}</td><td>${escapeHtml(e.type)}</td><td>${escapeHtml(e.item || "—")}</td><td>${escapeHtml(e.size)}</td><td>${Number.isFinite(e.quantity) ? e.quantity : "—"}</td><td class="money">${Number.isFinite(e.unitValue) ? money(e.unitValue) : "Missing"}</td><td class="${record.errors.length ? "validation-error" : "validation-ok"}">${record.errors.length ? escapeHtml(record.errors.join("; ")) : "Ready"}</td></tr>`;
    }).join("");
    $("#previewNotice").textContent = errors ? `${errors} validation issue${errors === 1 ? "" : "s"}; invalid rows will be skipped.` : "All rows passed validation.";
    $("#confirmImport").disabled = pendingImport.length === 0;
    $("#confirmImport").textContent = `Import ${plural(pendingImport.length, "valid row")}`;
    $("#importPreview").classList.remove("hidden");
    $("#importPreview").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function importText(text, sourceName) {
    $("#importMessage").textContent = "";
    try {
      const records = parseCsv(text);
      validateImportStock(records);
      showImportPreview(records, sourceName);
    } catch (error) {
      $("#importMessage").textContent = error.message;
    }
  }

  function exportReport() {
    const year = Number($("#reportYear").value) || currentYear;
    const period = entries.filter((entry) => entry.date.startsWith(`${year}-`));
    const rows = groupStock(entries.filter((entry) => entry.date <= `${year}-12-31`)).sort((a, b) => a.item.localeCompare(b.item) || a.size.localeCompare(b.size));
    const lines = [["Annual inventory estimate", year], ["Generated", today], ["Note", "Internal estimate only; not an IRS valuation or tax advice"], [], ["Item", "Category", "Size", "Received in year", "Distributed in year", "Year-end quantity", "Unit value", "Estimated value"]];
    let totals = { received: 0, distributed: 0, quantity: 0, value: 0 };
    for (const row of rows) {
      const byItem = period.filter((entry) => entry.item.toLocaleLowerCase() === row.item.toLocaleLowerCase() && (entry.size || "One size").toLocaleLowerCase() === row.size.toLocaleLowerCase());
      const received = byItem.filter((entry) => entry.type === "received").reduce((sum, entry) => sum + entry.quantity, 0);
      const distributed = byItem.filter((entry) => entry.type === "distributed").reduce((sum, entry) => sum + entry.quantity, 0);
      const value = row.quantity * row.unitValue;
      totals = { received: totals.received + received, distributed: totals.distributed + distributed, quantity: totals.quantity + row.quantity, value: totals.value + value };
      lines.push([row.item, row.category, row.size, received, distributed, row.quantity, row.unitValue.toFixed(2), value.toFixed(2)]);
    }
    lines.push(["TOTAL", "", "", totals.received, totals.distributed, totals.quantity, "", totals.value.toFixed(2)]);
    const csv = lines.map((line) => line.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    downloadBlob(csv, `lor-inventory-${year}-annual-report.csv`, "text/csv;charset=utf-8");
    showToast(`${year} annual report downloaded.`);
  }

  function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function wireEvents() {
    $$(".nav-link[data-page]").forEach((link) => link.addEventListener("click", (event) => { event.preventDefault(); navigate(link.dataset.page); }));
    $$("[data-navigate]").forEach((link) => link.addEventListener("click", (event) => { event.preventDefault(); navigate(link.dataset.navigate); }));
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      if (link.dataset.page || link.dataset.navigate) return;
      link.addEventListener("click", (event) => {
        const page = link.getAttribute("href").slice(1);
        if (["dashboard", "inventory", "activity", "reports", "imports"].includes(page)) { event.preventDefault(); navigate(page); }
      });
    });
    $("#dashboardYear").addEventListener("change", renderDashboard);
    $("#inventorySearch").addEventListener("input", renderInventory);
    ["activityYear", "dateFrom", "dateTo", "activityType"].forEach((id) => $(`#${id}`).addEventListener("change", renderActivity));
    $("#clearActivityFilters").addEventListener("click", () => {
      $("#activityYear").value = String(currentYear);
      $("#dateFrom").value = "";
      $("#dateTo").value = "";
      $("#activityType").value = "all";
      renderActivity();
    });
    $("#reportYear").addEventListener("change", renderReport);
    $("#quickAdd").addEventListener("click", () => openActivity("received"));
    $("#activityAdd").addEventListener("click", () => openActivity());
    $("#closeDialog").addEventListener("click", () => $("#activityDialog").close());
    $("#cancelDialog").addEventListener("click", () => $("#activityDialog").close());
    $("#activityForm").addEventListener("submit", (event) => {
      event.preventDefault();
      addActivity({ type: $("#entryType").value, date: $("#entryDate").value, item: $("#entryItem").value, category: $("#entryCategory").value, size: $("#entrySize").value, quantity: $("#entryQuantity").value, unitValue: $("#entryValue").value, source: $("#entrySource").value, notes: $("#entryNotes").value });
    });
    $("#entryType").addEventListener("change", () => { $("#dialogTitle").textContent = $("#entryType").value === "received" ? "Receive items" : "Record distribution"; });
    $("#exportReport").addEventListener("click", exportReport);
    $("#downloadTemplate").addEventListener("click", () => downloadBlob("date,type,item,category,size,quantity,unit_value,source,notes\r\n2026-01-15,received,Winter coat,Clothing,M,5,48,Community donation,Sample row\r\n", "lor-inventory-import-template.csv", "text/csv;charset=utf-8"));
    $("#csvFile").addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { $("#importMessage").textContent = "CSV file must be smaller than 5 MB."; event.target.value = ""; return; }
      await importText(await file.text(), file.name);
      event.target.value = "";
    });
    $("#sheetsForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const url = $("#sheetsUrl").value.trim();
      $("#importMessage").textContent = "Fetching public CSV feed…";
      try {
        const response = await fetch(url, { headers: { Accept: "text/csv,text/plain" }, mode: "cors" });
        if (!response.ok) throw new Error(`The sheet returned HTTP ${response.status}.`);
        const contentType = response.headers.get("content-type") || "";
        const text = await response.text();
        if (!contentType.includes("csv") && !text.includes(",")) throw new Error("The URL did not return CSV. Publish the sheet as CSV and use its published URL.");
        await importText(text, "Google Sheets public CSV");
      } catch (error) {
        $("#importMessage").textContent = `Could not fetch the sheet: ${error.message} Public publishing and browser CORS access are required.`;
      }
    });
    $("#confirmImport").addEventListener("click", () => {
      if (!pendingImport.length) return;
      const oldEntries = entries;
      entries = [...entries, ...pendingImport];
      if (!saveEntries()) { entries = oldEntries; return; }
      const importedCount = pendingImport.length;
      pendingImport = [];
      $("#importPreview").classList.add("hidden");
      $("#importMessage").textContent = "";
      renderAll();
      showToast(`${plural(importedCount, "record")} imported successfully.`);
    });
    $("#cancelImport").addEventListener("click", () => { pendingImport = []; $("#importPreview").classList.add("hidden"); });
    $("#resetDemo").addEventListener("click", () => {
      if (!window.confirm("Reset this browser's demo data to the original sample records? This only affects this demo workspace.")) return;
      entries = seed.map((entry) => ({ ...entry }));
      if (saveEntries()) { renderAll(); showToast("Sample data restored."); }
    });
    window.addEventListener("hashchange", () => navigate(location.hash.slice(1)));
  }

  wireEvents();
  renderAll();
  navigate(location.hash.slice(1) || "dashboard");
})();
