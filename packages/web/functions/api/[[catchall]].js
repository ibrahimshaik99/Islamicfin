// Cloudflare Pages Function - handles API proxy
// This is a Pages Function, not a Worker

export async function onRequest(context) {
  const url = new URL(context.request.url);

  // Only proxy /api/* requests
  if (url.pathname.startsWith('/api/')) {
    const apiUrl = new URL(url);
    apiUrl.hostname = context.env.API_HOST || 'icp-api.framewebpixel.workers.dev';

    const proxyRequest = new Request(apiUrl.toString(), {
      method: context.request.method,
      headers: context.request.headers,
      body: context.request.body,
    });

    return fetch(proxyRequest);
  }

  // For non-API requests, fall through to static assets (handled by Pages automatically)
  return context.next();
}
