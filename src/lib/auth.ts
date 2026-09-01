// パスワードはコード上に平文で置かず、SHA-256ハッシュだけを保持する。
// 本番ではVercelの環境変数 APP_PASSWORD_HASH で上書き可能（.env.example参照）。
// 既定値は「0524」のSHA-256ハッシュ。
const DEFAULT_PASSWORD_HASH =
  '46f49d091f363e178735bf21688c989bab23fafad4af2cd01b818b944084c4cf';

export function getExpectedHash(): string {
  return process.env.APP_PASSWORD_HASH || DEFAULT_PASSWORD_HASH;
}

// Edge runtime (middleware / route handler) でも動く Web Crypto を使用
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const AUTH_COOKIE = 'cocomo_auth';
