'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        setError('パスワードが違います');
      }
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
    >
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 320 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'var(--accent)',
              margin: '0 auto 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#0B1F33">
              <path d="M4 15h16l-1.5 3a2 2 0 0 1-1.8 1.1H7.3A2 2 0 0 1 5.5 18L4 15Z" />
              <path d="M8 15V6a1 1 0 0 1 1-1h1v10" />
              <path d="M11 15V9.5l4.5 3.2c.6.4.4 1.3-.3 1.3H11Z" />
            </svg>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>ココモ法 資金管理</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>パスワードを入力してください</div>
        </div>

        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="パスワード"
          style={{
            width: '100%',
            padding: '14px 16px',
            fontSize: 18,
            letterSpacing: '0.2em',
            textAlign: 'center',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--panel)',
            color: 'var(--text)',
            marginBottom: 12
          }}
        />

        {error && (
          <div style={{ color: 'var(--loss)', fontSize: 12, textAlign: 'center', marginBottom: 12 }}>{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px 0',
            borderRadius: 10,
            border: 'none',
            background: 'var(--accent)',
            color: '#0B1F33',
            fontWeight: 700,
            fontSize: 15
          }}
        >
          {loading ? '確認中…' : 'ログイン'}
        </button>
      </form>
    </div>
  );
}
