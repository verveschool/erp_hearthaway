'use client';

import { Search, X } from 'lucide-react';
import { useRef, type Ref } from 'react';

export function WorkspaceSearch({ label, value, onChange, placeholder, inputRef, className = '' }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputRef?: Ref<HTMLInputElement>;
  className?: string;
}) {
  const wrapper = useRef<HTMLDivElement>(null);
  function clear() {
    onChange('');
    wrapper.current?.querySelector('input')?.focus();
  }
  return <div ref={wrapper} className={`ha-search ${className}`}>
    <Search aria-hidden="true" size={16} className="ha-search-icon" />
    <input ref={inputRef} type="search" aria-label={label} placeholder={placeholder ?? label} value={value}
      onChange={event => onChange(event.target.value)}
      onKeyDown={event => { if (event.key === 'Escape' && value) { event.preventDefault(); event.stopPropagation(); clear(); } }} />
    {value && <button type="button" onClick={clear} aria-label={`Clear ${label.toLowerCase()}`} title="Clear search"><X aria-hidden="true" size={15} /></button>}
  </div>;
}
