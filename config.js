// PriceChecker Configuration
// ─────────────────────────────────────────────────────────────
// eBay Developer credentials
// Register at: https://developer.ebay.com/
//
// After registering, create an app and copy the keys below.
// Use the PRODUCTION environment keys for live data.
// ─────────────────────────────────────────────────────────────
const CONFIG = {
  ebay: {
    clientId:     'YOUR_EBAY_CLIENT_ID',
    clientSecret: 'YOUR_EBAY_CLIENT_SECRET',
    tokenUrl:  'https://api.ebay.com/identity/v1/oauth2/token',
    searchUrl: 'https://api.ebay.com/buy/browse/v1/item_summary/search',
  },

  // Finn.no — no public API, fetched via RSS + CORS proxy.
  finn: {
    rssUrl:    'https://www.finn.no/bap/forsale/search.html?q={query}&feed=rss',
    corsProxy: 'https://api.allorigins.win/get?url=',
  },

  // ─────────────────────────────────────────────────────────────
  // Prisjakt.no — Norwegian price comparison (new products).
  // Register for a free partner API key at:
  //   https://developer.prisjakt.no/
  // Copy your API key below.
  // ─────────────────────────────────────────────────────────────
  prisjakt: {
    apiKey:    'YOUR_PRISJAKT_API_KEY',
    searchUrl: 'https://api.prisjakt.no/v1/products/search',
  },

  // ─────────────────────────────────────────────────────────────
  // Craigslist — American classifieds (used items).
  // No API key needed. Uses RSS feed via CORS proxy.
  // Change 'city' to any Craigslist city slug, e.g.:
  //   sfbay, newyork, losangeles, chicago, seattle, boston
  // ─────────────────────────────────────────────────────────────
  craigslist: {
    city:      'sfbay',
    rssUrl:    'https://{city}.craigslist.org/search/sss?format=rss&query={query}',
    corsProxy: 'https://api.allorigins.win/get?url=',
  },
};
