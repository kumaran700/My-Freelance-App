export const getCurrencySymbol = (currency: 'USD' | 'INR' | string = 'INR') => {
  return currency === 'USD' ? '$' : '₹';
};

export const formatCurrency = (amount: number, currency: 'USD' | 'INR' | string = 'INR') => {
  const value = amount || 0;
  const symbol = getCurrencySymbol(currency);
  
  if (currency === 'USD') {
    return `${symbol}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  // Default to INR with Indian format
  const formattedAmount = value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${symbol} ${formattedAmount}`;
};

export const convertToINR = (amount: number, currency: string, rate: number) => {
  if (currency === 'INR') return amount;
  return amount * (rate || 1);
};

export const convertCurrency = (amount: number, from: string, to: string, rate: number) => {
  if (from === to) return amount;
  if (from === 'USD' && to === 'INR') return amount * rate;
  if (from === 'INR' && to === 'USD') return amount / rate;
  return amount;
};
