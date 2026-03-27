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

// Reset button is injected dynamically into the result div — see resetForm()

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
  // Skip eBay if credentials are still placeholder values
  if (CONFIG.ebay.clientId === 'YOUR_EBAY_CLIENT_ID') return [];

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
    const title = item.querySelector('title')?.textContent ?? '';
    const link  = item.querySelector('link')?.textContent ?? '';
    const desc  = item.querySelector('description')?.textContent ?? '';

    // Price appears in multiple places depending on Finn.no category:
    // 1. Custom <finn:price> element
    // 2. Title suffix  "Product name - 8 000 kr"
    // 3. Description text  "Pris: 8 000 kr" or "8000 kr"
    const finnPrice = item.getElementsByTagNameNS('*', 'price')[0]?.textContent ?? '';
    const searchIn  = finnPrice || title + ' ' + desc;
    const match     = searchIn.match(/([\d\s.,]+)\s*kr/i);
    const price     = match
      ? parseInt(match[1].replace(/[\s.]/g, '').replace(',', ''), 10)
      : null;

    return { source: 'Finn.no', title, price, currency: 'NOK', url: link };
  }).filter(item => item.price !== null && item.price > 0);
}

// ─── Results display ─────────────────────────────────────────

function showLoading() {
  priceForm.classList.add('hidden');
  result.classList.remove('hidden');
  result.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Fetching prices from Finn.no${CONFIG.ebay.clientId !== 'YOUR_EBAY_CLIENT_ID' ? ' and eBay' : ''}…</p>
    </div>`;
}

function showResults(name, ebay, finn) {
  // Normalise all listings to USD for sorting/estimate
  const allListings = [
    ...ebay.map(i => ({ ...i, usd: i.price })),
    ...finn.map(i => ({ ...i, usd: i.price / 10.5 })),
  ].filter(i => i.usd > 0);

  if (allListings.length === 0) {
    result.innerHTML = `
      <h3>Price estimate</h3>
      <p class="estimate-label">No listings found for "${name}"</p>
      <p class="estimate-value no-data">–</p>
      <button id="resetBtn" class="btn-secondary btn-full" style="margin-top:1.5rem">
        Check another product
      </button>`;
    document.getElementById('resetBtn').addEventListener('click', resetForm);
    return;
  }

  // Sort ascending by USD price
  allListings.sort((a, b) => a.usd - b.usd);

  const prices   = allListings.map(i => i.usd);
  const estimate = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  const low      = Math.round(prices[0]);
  const high     = Math.round(prices[prices.length - 1]);

  // 3 cheapest and 3 most expensive
  const bottomThree = allListings.slice(0, 3);
  const topThree    = allListings.slice(-3).reverse();

  result.innerHTML = `
    <div class="estimate-hero">
      <p class="estimate-label">Estimated market price for</p>
      <p class="estimate-product-name">"${name}"</p>
      <p class="estimate-value">${formatUSD(estimate)}</p>
      <div class="estimate-range-bar">
        <span class="range-low">${formatUSD(low)}</span>
        <div class="range-track"><div class="range-fill"></div></div>
        <span class="range-high">${formatUSD(high)}</span>
      </div>
      <p class="estimate-meta">Based on ${allListings.length} listing${allListings.length !== 1 ? 's' : ''} from eBay &amp; Finn.no</p>
    </div>

    <div class="evidence-grid">
      ${renderEvidenceColumn('High range', topThree)}
      ${renderEvidenceColumn('Low range', bottomThree)}
    </div>

    <button id="resetBtn" class="btn-secondary btn-full" style="margin-top:1.5rem">
      Check another product
    </button>`;

  document.getElementById('resetBtn').addEventListener('click', resetForm);
}

function renderEvidenceColumn(label, items) {
  const isHigh = label === 'High range';
  const rows = items.map(i => {
    const priceStr = i.currency === 'NOK' ? formatNOK(i.price) : formatUSD(i.price);
    return `
      <a class="evidence-card" href="${i.url}" target="_blank" rel="noopener">
        <span class="evidence-source ${i.source === 'eBay' ? 'tag-ebay' : 'tag-finn'}">${i.source}</span>
        <span class="evidence-title">${i.title}</span>
        <span class="evidence-price ${isHigh ? 'price-high' : 'price-low'}">${priceStr}</span>
      </a>`;
  }).join('');

  return `
    <div class="evidence-column">
      <h4 class="evidence-heading ${isHigh ? 'heading-high' : 'heading-low'}">
        ${isHigh ? '▲' : '▼'} ${label}
      </h4>
      ${rows}
    </div>`;
}

function resetForm() {
  priceForm.reset();
  preview.src = '';
  preview.classList.add('hidden');
  placeholder.classList.remove('hidden');
  result.classList.add('hidden');
  result.innerHTML = '';
  priceForm.classList.remove('hidden');
}

// ─── Formatting helpers ──────────────────────────────────────

function formatUSD(amount) {
  return '$' + Math.round(amount).toLocaleString('en-US');
}

function formatNOK(amount) {
  return Math.round(amount).toLocaleString('nb-NO') + ' kr';
}
