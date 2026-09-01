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

// 危険な操作（リセット・削除）の確認用パスワード。ログイン用とは別。
// コードには平文を置かず、ハッシュだけを保持する。
const ACTION_PASSWORD_HASH = '3ed23197a0865b6d7eaec04eff603145ce6b09e9d4af8a438cc416cdbf9b7b95';

export async function verifyActionPassword(input: string): Promise<boolean> {
  if (!input) return false;
  const hash = await sha256Hex(input);
  return hash === ACTION_PASSWORD_HASH;
}
