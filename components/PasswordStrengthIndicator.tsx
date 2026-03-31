'use client';

import { CheckCircle2, XCircle } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
  showIndicator?: boolean;
}

export default function PasswordStrengthIndicator({
  password,
  showIndicator = true
}: PasswordStrengthIndicatorProps) {
  const criteria = [
    {
      label: 'Mínimo 8 caracteres',
      met: password.length >= 8,
    },
    {
      label: 'Letra maiúscula (A-Z)',
      met: /[A-Z]/.test(password),
    },
    {
      label: 'Letra minúscula (a-z)',
      met: /[a-z]/.test(password),
    },
    {
      label: 'Número (0-9)',
      met: /\d/.test(password),
    },
  ];

  const allCriteriaMet = criteria.every(c => c.met);
  const metCount = criteria.filter(c => c.met).length;

  if (!showIndicator || !password) {
    return null;
  }

  return (
    <div className={`mt-3 p-4 rounded-lg border-2 transition-all ${
      allCriteriaMet
        ? 'bg-green-50 border-green-500'
        : 'bg-red-50 border-red-500'
    }`}>
      <div className="mb-2 flex items-center justify-between">
        <span className={`text-sm font-semibold ${
          allCriteriaMet ? 'text-green-700' : 'text-red-700'
        }`}>
          Força da Senha: {metCount}/4
        </span>
        {allCriteriaMet && (
          <span className="text-sm text-green-700 font-medium">
            ✓ Senha forte!
          </span>
        )}
      </div>

      <div className="space-y-2">
        {criteria.map((criterion, index) => (
          <div key={index} className="flex items-center gap-2">
            {criterion.met ? (
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            )}
            <span className={`text-sm ${
              criterion.met ? 'text-green-700' : 'text-red-700'
            }`}>
              {criterion.label}
            </span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            allCriteriaMet ? 'bg-green-600' : 'bg-red-600'
          }`}
          style={{ width: `${(metCount / 4) * 100}%` }}
        />
      </div>
    </div>
  );
}
