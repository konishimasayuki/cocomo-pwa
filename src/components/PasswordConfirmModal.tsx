'use client';

import { useState } from 'react';
import { verifyActionPassword } from '@/lib/auth';

export default function PasswordConfirmModal({
  open,
  title,
  onCancel,
  onSuccess
}: {
  open: boolean;
  title: string;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  if (!open) return null;

  async function handleConfirm() {
    setChecking(true);
    setError('');
    const ok = await verifyActionPassword(password);
    setChecking(false);
    if (ok) {
      setPassword('');
      onSuccess();
    } else {
      setError('パスワードが違います');
    }
  }

  function handleCancel() {
    setPassword('');
    setError('');
    onCancel();
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: 20
      }}
      onClick={handleCancel}
    >
      <div className="card" style={{ width: '100%', maxWidth: 320, margin: 0 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, textAlign: 'center' }}>{title}</div>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
          placeholder="確認用パスワード"
          style={{
            width: '100%',
            padding: '12px 10px',
            fontSize: 16,
            letterSpacing: '0.2em',
            textAlign: 'center',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--panel-2)',
            color: 'var(--text)',
            marginBottom: 8
          }}
        />
        {error && <div style={{ fontSize: 11, color: 'var(--loss)', textAlign: 'center', marginBottom: 8 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleCancel}
            style={{ flex: 1, padding: '11px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 13 }}
          >
            キャンセル
          </button>
          <button
            onClick={handleConfirm}
            disabled={checking || !password}
            style={{ flex: 1, padding: '11px 0', borderRadius: 8, border: 'none', background: 'var(--loss)', color: '#F5EAE8', fontWeight: 700, fontSize: 13 }}
          >
            {checking ? '確認中…' : '実行する'}
          </button>
        </div>
      </div>
    </div>
  );
}
