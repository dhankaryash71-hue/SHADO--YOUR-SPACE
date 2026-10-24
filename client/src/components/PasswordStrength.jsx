import React from 'react';
import { Check, X } from 'lucide-react';

export const PasswordStrength = ({ password = '' }) => {
  const criteria = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'At least 1 uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'At least 1 lowercase letter', met: /[a-z]/.test(password) },
    { label: 'At least 1 number', met: /[0-9]/.test(password) },
  ];

  const metCount = criteria.filter((c) => c.met).length;

  const getStrengthConfig = () => {
    if (!password) return { label: 'Empty', color: 'bg-slate-300 dark:bg-slate-700', width: '0%', text: 'text-slate-400' };
    if (metCount === 1) return { label: 'Weak', color: 'bg-rose-500', width: '25%', text: 'text-rose-500' };
    if (metCount === 2) return { label: 'Fair', color: 'bg-amber-500', width: '50%', text: 'text-amber-500' };
    if (metCount === 3) return { label: 'Good', color: 'bg-sky-500', width: '75%', text: 'text-sky-500' };
    return { label: 'Strong', color: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]', width: '100%', text: 'text-emerald-500' };
  };

  const strength = getStrengthConfig();

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2 select-none">
      {/* Strength Bar */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400 font-medium">Strength:</span>
        <span className={`font-semibold ${strength.text}`}>{strength.label}</span>
      </div>
      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${strength.color} transition-all duration-300 ease-out`}
          style={{ width: strength.width }}
        />
      </div>

      {/* Criteria pills */}
      <div className="grid grid-cols-2 gap-1 pt-1">
        {criteria.map((item, index) => (
          <div
            key={index}
            className={`flex items-center gap-1.5 text-[11px] ${
              item.met ? 'text-emerald-500 font-medium' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {item.met ? <Check size={12} className="shrink-0" /> : <X size={12} className="shrink-0 opacity-40" />}
            <span className="truncate">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasswordStrength;
