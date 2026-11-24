import { useId } from 'react';
import { convertToInr } from '@/lib/payment-money';

export function PaymentConversionFields({ amount, currency, rate, onRate }: {
  amount: string; currency: string; rate: string; onRate: (value: string) => void;
}) {
  const id = useId();
  const domestic = currency === 'INR';
  const amountInr = convertToInr(Number(amount), domestic ? 1 : Number(rate));
  const inputClass = 'mt-1 block w-full rounded-lg border border-[#E8E6E1] p-2 text-sm tabular-nums focus:border-[#00319D]';
  return <div className="grid grid-cols-2 gap-2">
    <label className="text-xs font-semibold" htmlFor={id}>INR per 1 {currency}
      <input id={id} type="number" min="0" step="any" required readOnly={domestic}
        className={inputClass} value={domestic ? '1' : rate} onChange={e => onRate(e.target.value)} />
    </label>
    <label className="text-xs font-semibold" htmlFor={id + '-inr'}>Amount in INR
      <input id={id + '-inr'} name="amountInr" type="number" min="0.01" step="0.01"
        key={amount + ':' + currency + ':' + rate} required readOnly={domestic}
        className={inputClass} defaultValue={amountInr?.toFixed(2) ?? ''} />
    </label>
  </div>;
}
