const ITERATIONS = 100_000;
const KEY_LENGTH = 64;
const HASH_ALGORITHM = 'PBKDF2';
const SIGN_HASH = 'SHA-256';
const SALT_LENGTH = 32;

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  return toHex(salt.buffer);
}

async function deriveKey(
  password: string,
  salt: Uint8Array,
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    HASH_ALGORITHM,
    false,
    ['deriveBits'],
  );

  return crypto.subtle.deriveBits(
    {
      name: HASH_ALGORITHM,
      salt,
      iterations: ITERATIONS,
      hash: SIGN_HASH,
    },
    keyMaterial,
    KEY_LENGTH * 8,
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = generateSalt();
  const key = await deriveKey(password, fromHex(salt));
  return `${salt}:${toHex(key)}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [saltHex, hashHex] = storedHash.split(':');
  if (!saltHex || !hashHex) return false;

  const salt = fromHex(saltHex);
  const key = await deriveKey(password, salt);
  const computedHash = toHex(key);

  if (computedHash.length !== hashHex.length) return false;

  let result = 0;
  for (let i = 0; i < computedHash.length; i++) {
    result |= computedHash.charCodeAt(i) ^ hashHex.charCodeAt(i);
  }
  return result === 0;
}

export function generateToken(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(32)).buffer);
}

export function createSessionCookie(
  sessionId: string,
  maxAge: number,
): string {
  const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';
  const secure = isDev ? '' : ' Secure;';
  return `session=${sessionId}; HttpOnly;${secure} SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export function clearSessionCookie(): string {
  const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';
  const secure = isDev ? '' : ' Secure;';
  return `session=; HttpOnly;${secure} SameSite=Lax; Path=/; Max-Age=0`;
}

export function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.split('=');
    if (name) {
      cookies[name.trim()] = rest.join('=').trim();
    }
  }
  return cookies;
}
