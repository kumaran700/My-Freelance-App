export const formatCurrency = (amount: number, currency: 'USD' | 'INR' = 'INR') => {
  const value = amount || 0;
  if (currency === 'USD') {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  // Use ₹ for INR
  const formattedAmount = value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `₹ ${formattedAmount}`;
};

export const convertToINR = (amount: number, currency: string, rate: number) => {
  if (currency === 'INR') return amount;
  return amount * rate;
};

export const convertCurrency = (amount: number, from: string, to: string, rate: number) => {
  if (from === to) return amount;
  if (from === 'USD' && to === 'INR') return amount * rate;
  if (from === 'INR' && to === 'USD') return amount / rate;
  return amount;
};
