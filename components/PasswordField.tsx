'use client';

import { Eye, EyeOff, Key } from 'lucide-react';
import { useState, type InputHTMLAttributes } from 'react';

export function PasswordField(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = useState(false);
  return <div className="ha-password-field">
    <Key className="ha-search-icon" size={16} aria-hidden="true" />
    <input {...props} type={visible ? 'text' : 'password'} spellCheck={false} autoCapitalize="none" />
    <button type="button" aria-label={visible ? 'Hide password' : 'Show password'} title={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} onClick={() => setVisible(value => !value)}>
      {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
    </button>
  </div>;
}
