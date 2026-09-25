const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'karkana_super_secret_session_key_2026_atelier_cred';

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export interface SessionPayload {
  username: string;
  role: 'admin';
  exp: number; // unix timestamp in ms
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const enc = new TextEncoder();
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = base64UrlEncode(enc.encode(payloadJson));

  const key = await getHmacKey(SESSION_SECRET);
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(payloadB64));
  const sigB64 = base64UrlEncode(new Uint8Array(signatureBuffer));

  return `${payloadB64}.${sigB64}`;
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadB64, sigB64] = parts;
    const enc = new TextEncoder();

    const key = await getHmacKey(SESSION_SECRET);
    const signatureBytes = base64UrlDecode(sigB64);

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes as unknown as BufferSource,
      enc.encode(payloadB64)
    );

    if (!isValid) return null;

    const decodedPayloadBytes = base64UrlDecode(payloadB64);
    const dec = new TextDecoder();
    const payload: SessionPayload = JSON.parse(dec.decode(decodedPayloadBytes));

    if (Date.now() > payload.exp) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}
