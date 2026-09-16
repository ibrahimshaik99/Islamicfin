// Cloudflare Pages Function - API Proxy + SPA Routing
// Routes /api/* requests to the Cloudflare Workers API
// All other routes serve index.html for SPA client-side routing

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Proxy API requests to Cloudflare Workers
    if (url.pathname.startsWith('/api/')) {
      const apiUrl = new URL(url);
      apiUrl.hostname = env.API_HOST || 'icp-api.framewebpixel.workers.dev';

      const proxyRequest = new Request(apiUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });

      return fetch(proxyRequest);
    }

    // Try to serve static asset first
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status === 200) {
      return assetResponse;
    }

    // For all non-asset routes, serve index.html (SPA fallback)
    const indexRequest = new Request(new URL('/index.html', request.url).toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    return env.ASSETS.fetch(indexRequest);
  },
};
