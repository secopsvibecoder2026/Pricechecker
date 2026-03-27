// ─── DOM references ─────────────────────────────────────────
const openFormBtn = document.getElementById('openFormBtn');
const closeBtn    = document.getElementById('closeBtn');
const overlay     = document.getElementById('overlay');
const modal       = document.getElementById('modal');
const uploadArea  = document.getElementById('uploadArea');
const imageInput  = document.getElementById('imageInput');
const preview     = document.getElementById('preview');
const placeholder = document.getElementById('uploadPlaceholder');
const priceForm   = document.getElementById('priceForm');
const result      = document.getElementById('result');
const resetBtn    = document.getElementById('resetBtn');

// ─── Modal open / close ──────────────────────────────────────
openFormBtn.addEventListener('click', openModal);
closeBtn.addEventListener('click', closeModal);
overlay.addEventListener('click', closeModal);

function openModal() {
  modal.classList.remove('hidden');
  overlay.classList.remove('hidden');
}

function closeModal() {
  modal.classList.add('hidden');
  overlay.classList.add('hidden');
}

// ─── Image upload — click ────────────────────────────────────
uploadArea.addEventListener('click', () => imageInput.click());

imageInput.addEventListener('change', () => {
  const file = imageInput.files[0];
  if (file) showPreview(file);
});

// ─── Image upload — drag and drop ────────────────────────────
uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) showPreview(file);
});

function showPreview(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    preview.src = e.target.result;
    preview.classList.remove('hidden');
    placeholder.classList.add('hidden');
  };
  reader.readAsDataURL(file);
}

// ─── Form submit ─────────────────────────────────────────────
priceForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name      = document.getElementById('productName').value.trim();
  const condition = document.getElementById('condition').value;

  showLoading();

  const [ebayResults, finnResults] = await Promise.allSettled([
    fetchEbayPrices(name, condition),
    fetchFinnPrices(name),
  ]);

  const ebay = ebayResults.status === 'fulfilled' ? ebayResults.value : [];
  const finn = finnResults.status === 'fulfilled' ? finnResults.value : [];

  showResults(name, ebay, finn);
});

// ─── Reset ───────────────────────────────────────────────────
resetBtn.addEventListener('click', () => {
  priceForm.reset();
  preview.src = '';
  preview.classList.add('hidden');
  placeholder.classList.remove('hidden');
  result.classList.add('hidden');
  result.innerHTML = '';
  priceForm.classList.remove('hidden');
});

// ─── eBay API ────────────────────────────────────────────────

// Fetches an Application access token using client credentials flow.
async function getEbayToken() {
  const credentials = btoa(`${CONFIG.ebay.clientId}:${CONFIG.ebay.clientSecret}`);
  const res = await fetch(CONFIG.ebay.tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
  });
  if (!res.ok) throw new Error('eBay auth failed');
  const data = await res.json();
  return data.access_token;
}

// Maps our condition values to eBay condition filter values.
const conditionMap = {
  new:       'NEW',
  'like-new': 'LIKE_NEW',
  used:      'USED',
  worn:      'FOR_PARTS_OR_NOT_WORKING',
};

async function fetchEbayPrices(query, condition) {
  const token = await getEbayToken();

  const params = new URLSearchParams({
    q:      query,
    limit:  '5',
    filter: `conditions:{${conditionMap[condition] ?? 'USED'}}`,
  });

  const res = await fetch(`${CONFIG.ebay.searchUrl}?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!res.ok) throw new Error('eBay search failed');
  const data = await res.json();

  return (data.itemSummaries ?? []).map(item => ({
    source: 'eBay',
    title:  item.title,
    price:  parseFloat(item.price?.value ?? 0),
    currency: item.price?.currency ?? 'USD',
    url:    item.itemWebUrl,
    condition: item.condition,
  }));
}

// ─── Finn.no RSS ─────────────────────────────────────────────

async function fetchFinnPrices(query) {
  const rssUrl = CONFIG.finn.rssUrl.replace('{query}', encodeURIComponent(query));
  const proxyUrl = CONFIG.finn.corsProxy + encodeURIComponent(rssUrl);

  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error('Finn.no RSS fetch failed');

  const json = await res.json();
  const xml  = new DOMParser().parseFromString(json.contents, 'text/xml');
  const items = Array.from(xml.querySelectorAll('item'));

  return items.slice(0, 5).map(item => {
    const title     = item.querySelector('title')?.textContent ?? '';
    const link      = item.querySelector('link')?.textContent ?? '';
    // Finn.no puts the price in the description as "X kr"
    const desc      = item.querySelector('description')?.textContent ?? '';
    const priceMatch = desc.match(/([\d\s]+)\s*kr/);
    const price     = priceMatch ? parseInt(priceMatch[1].replace(/\s/g, ''), 10) : null;

    return { source: 'Finn.no', title, price, currency: 'NOK', url: link };
  }).filter(item => item.price !== null);
}

// ─── Results display ─────────────────────────────────────────

function showLoading() {
  priceForm.classList.add('hidden');
  result.classList.remove('hidden');
  result.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Fetching prices from eBay and Finn.no…</p>
    </div>`;
}

function showResults(name, ebay, finn) {
  const allPrices = [
    ...ebay.map(i => i.price),
    // Convert NOK to USD roughly for the combined estimate (1 USD ≈ 10.5 NOK)
    ...finn.map(i => i.price / 10.5),
  ].filter(p => p > 0);

  const estimate = allPrices.length > 0
    ? Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length)
    : null;

  const low  = allPrices.length > 0 ? Math.round(Math.min(...allPrices)) : null;
  const high = allPrices.length > 0 ? Math.round(Math.max(...allPrices)) : null;

  result.innerHTML = `
    <h3>Price estimate</h3>
    <p class="estimate-label">Estimated market price for "${name}"</p>
    ${estimate !== null
      ? `<p class="estimate-value">${formatUSD(estimate)}</p>
         <p class="estimate-range">Range: ${formatUSD(low)} – ${formatUSD(high)}</p>`
      : `<p class="estimate-value no-data">No data found</p>`}

    ${renderSourceSection('eBay', ebay, i => formatUSD(i.price))}
    ${renderSourceSection('Finn.no', finn, i => formatNOK(i.price))}

    <button id="resetBtn" class="btn-secondary btn-full" style="margin-top:1.5rem">
      Check another product
    </button>`;

  document.getElementById('resetBtn').addEventListener('click', () => {
    priceForm.reset();
    preview.src = '';
    preview.classList.add('hidden');
    placeholder.classList.remove('hidden');
    result.classList.add('hidden');
    result.innerHTML = '';
    priceForm.classList.remove('hidden');
  });
}

function renderSourceSection(label, items, formatFn) {
  if (items.length === 0) {
    return `
      <div class="source-section">
        <h4>${label}</h4>
        <p class="source-empty">No results found or source unavailable.</p>
      </div>`;
  }

  const rows = items.map(i => `
    <a class="listing-row" href="${i.url}" target="_blank" rel="noopener">
      <span class="listing-title">${i.title}</span>
      <span class="listing-price">${formatFn(i)}</span>
    </a>`).join('');

  return `
    <div class="source-section">
      <h4>${label}</h4>
      ${rows}
    </div>`;
}

// ─── Formatting helpers ──────────────────────────────────────

function formatUSD(amount) {
  return '$' + Math.round(amount).toLocaleString('en-US');
}

function formatNOK(amount) {
  return Math.round(amount).toLocaleString('nb-NO') + ' kr';
}
