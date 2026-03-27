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
    // OAuth token endpoint (production)
    tokenUrl: 'https://api.ebay.com/identity/v1/oauth2/token',
    // Browse API search endpoint (production)
    searchUrl: 'https://api.ebay.com/buy/browse/v1/item_summary/search',
  },

  // Finn.no does not have a public API.
  // We fetch their RSS feed via a CORS proxy.
  finn: {
    // RSS search URL — {query} is replaced at runtime
    rssUrl: 'https://www.finn.no/bap/forsale/search.html?q={query}&feed=rss',
    // CORS proxy used to fetch Finn.no RSS from the browser
    corsProxy: 'https://api.allorigins.win/get?url=',
  },
};
