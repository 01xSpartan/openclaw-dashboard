import { randomBytes } from 'node:crypto';

let sessionToken: string | null = null;

export function generateToken(): string {
  sessionToken = randomBytes(32).toString('hex');
  return sessionToken;
}

export function getToken(): string {
  if (!sessionToken) throw new Error('Token not generated yet');
  return sessionToken;
}

export function validateToken(header: string | undefined): boolean {
  if (!sessionToken) return false;
  if (!header) return false;
  const token = header.replace(/^Bearer\s+/i, '');
  return token === sessionToken;
}
