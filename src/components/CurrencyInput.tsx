import React from 'react';
import { formatCurrencyInput, parseFormattedCurrency } from '../lib/utils';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  label?: string;
  error?: string;
  required?: boolean;
}

const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  placeholder = "0",
  className = "",
  disabled = false,
  label,
  error,
  required = false
}) => {
  const [displayValue, setDisplayValue] = React.useState<string>('');

  React.useEffect(() => {
    if (value === 0) {
      setDisplayValue('');
    } else {
      setDisplayValue(formatCurrencyInput(value.toString()));
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    
    // Remove all non-digit characters
    const numericValue = rawValue.replace(/[^\d]/g, '');
    
    if (numericValue === '') {
      setDisplayValue('');
      onChange(0);
      return;
    }

    const numberValue = parseInt(numericValue, 10);
    setDisplayValue(formatCurrencyInput(numberValue.toString()));
    onChange(numberValue);
  };

  const handleBlur = () => {
    if (value === 0) {
      setDisplayValue('');
    }
  };

  const baseInputClass = `
    w-full pl-12 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent bg-white text-gray-900
    ${error 
      ? 'border-red-300 focus:ring-red-500' 
      : 'border-gray-300 focus:ring-blue-500'
    }
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
    ${className}
  `.trim();

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-gray-500 text-sm font-medium">Rp</span>
        </div>
        <input
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={baseInputClass}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default CurrencyInput;