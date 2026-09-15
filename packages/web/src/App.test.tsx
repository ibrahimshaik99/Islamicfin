import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }), { status: 401 }))));

import App from './App';

describe('App', () => {
  it('renders the landing page at root', async () => {
    render(<App />);
    expect(await screen.findByText(/Stronger Islamic Communities/)).toBeInTheDocument();
  });

  it('renders 404 for unknown routes', async () => {
    window.history.pushState({}, '', '/nonexistent');
    render(<App />);
    expect(await screen.findByText('Page Not Found')).toBeInTheDocument();
  });

  it('redirects /login to /signin', async () => {
    window.history.pushState({}, '', '/login');
    render(<App />);
    expect(await screen.findByText('Sign in to your account')).toBeInTheDocument();
  });

  it('redirects /register to /signup', async () => {
    window.history.pushState({}, '', '/register');
    render(<App />);
    expect(await screen.findByText('Create your account')).toBeInTheDocument();
  });
});
