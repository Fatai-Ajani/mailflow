import React, { useState } from 'react';
import { verifyPin } from '../api';

const s = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: '16px', padding: '32px', width: '320px', textAlign: 'center', border: '0.5px solid #e0e0d8' },
  lockIcon: { fontSize: '32px', marginBottom: '12px' },
  title: { fontSize: '18px', fontWeight: '500', color: '#111', marginBottom: '6px' },
  sub: { fontSize: '13px', color: '#888', marginBottom: '24px' },
  pinRow: { display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' },
  pinBox: { width: '52px', height: '60px', fontSize: '24px', fontWeight: '500', textAlign: 'center', borderRadius: '10px', border: '1.5px solid #ccc', outline: 'none', background: '#f5f5f0', color: '#111' },
  pinBoxFilled: { border: '1.5px solid #111', background: '#fff' },
  pinBoxError: { border: '1.5px solid #A32D2D', background: '#fcebeb' },
  error: { fontSize: '13px', color: '#A32D2D', marginBottom: '12px' },
  btn: { width: '100%', padding: '10px', fontSize: '14px', fontWeight: '500', borderRadius: '8px', border: 'none', background: '#111', color: '#fff', cursor: 'pointer', marginBottom: '10px' },
  cancelBtn: { width: '100%', padding: '10px', fontSize: '14px', borderRadius: '8px', border: '0.5px solid #ccc', background: '#fff', color: '#666', cursor: 'pointer' },
};

export default function PinModal({ onSuccess, onCancel, actionLabel }) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputs = React.useRef([]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    setError('');
    if (value && index < 3) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    const enteredPin = pin.join('');
    if (enteredPin.length < 4) return setError('Please enter all 4 digits');
    setLoading(true);
    try {
      const res = await verifyPin(enteredPin);
      if (res.data.success) {
        onSuccess(enteredPin);
      }
    } catch (e) {
      setError(e.response ? 'Wrong PIN. Try again.' : 'Server unreachable. Check your connection and try again.');
      setPin(['', '', '', '']);
      inputs.current[0]?.focus();
    }
    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.lockIcon}>🔒</div>
        <div style={s.title}>PIN required</div>
        <div style={s.sub}>Enter your 4-digit PIN to {actionLabel || 'continue'}</div>
        <div style={s.pinRow}>
          {pin.map((digit, i) => (
            <input
              key={i}
              ref={el => inputs.current[i] = el}
              style={{
                ...s.pinBox,
                ...(digit ? s.pinBoxFilled : {}),
                ...(error ? s.pinBoxError : {})
              }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onKeyPress={handleKeyPress}
              autoFocus={i === 0}
            />
          ))}
        </div>
        {error && <div style={s.error}>{error}</div>}
        <button style={s.btn} onClick={handleSubmit} disabled={loading}>
          {loading ? 'Verifying...' : 'Confirm'}
        </button>
        <button style={s.cancelBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
