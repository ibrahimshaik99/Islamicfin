// Cloudflare Pages Function - API Proxy
// Routes /api/* requests to the Cloudflare Workers API
// Deploy with: wrangler pages deploy dist --project-name=icp-frontend

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Proxy API requests to Cloudflare Workers
    if (url.pathname.startsWith('/api/')) {
      const apiUrl = new URL(url);

      // Set this to your Workers deployment URL
      // After first deploy, update this with your actual Workers URL
      apiUrl.hostname = env.API_HOST || 'icp-api.framewebpixel.workers.dev';

      const proxyRequest = new Request(apiUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });

      return fetch(proxyRequest);
    }

    // Serve static assets for all other routes
    return env.ASSETS.fetch(request);
  },
};
