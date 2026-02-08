import { createContext, useContext, useState, ReactNode } from 'react';

interface DashboardContextType {
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  currency: string;
  setCurrency: (currency: string) => void;
  currencySymbol: string;
  baseYear: number | null;
  setBaseYear: (year: number | null) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

const getCurrencySymbol = (currency: string): string => {
  const symbols: Record<string, string> = {
    GBP: '£',
    USD: '$',
    EUR: '€',
    JPY: '¥',
    INR: '₹',
  };
  return symbols[currency] || currency;
};

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear - 1);
  const [currency, setCurrency] = useState('GBP');
  const [baseYear, setBaseYear] = useState<number | null>(null);

  const currencySymbol = getCurrencySymbol(currency);

  return (
    <DashboardContext.Provider value={{ 
      selectedYear, 
      setSelectedYear, 
      currency, 
      setCurrency, 
      currencySymbol,
      baseYear,
      setBaseYear,
    }}>
      {children}
    </DashboardContext.Provider>
  );
};
