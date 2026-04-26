import React, { createContext, useState, useContext, useEffect } from 'react';

const DEFAULT_COLORS = ['#00e5a0', '#7c3aed', '#f97316'];

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [bgColors, setBgColors] = useState(() => {
    try {
      const saved = localStorage.getItem('fitMirrorBgColors');
      return saved ? JSON.parse(saved) : DEFAULT_COLORS;
    } catch {
      return DEFAULT_COLORS;
    }
  });

  const [bgEnabled, setBgEnabled] = useState(() => {
    return localStorage.getItem('fitMirrorBgEnabled') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('fitMirrorBgColors', JSON.stringify(bgColors));
  }, [bgColors]);

  useEffect(() => {
    localStorage.setItem('fitMirrorBgEnabled', String(bgEnabled));
  }, [bgEnabled]);

  const updateColor = (index, color) => {
    setBgColors(prev => prev.map((c, i) => (i === index ? color : c)));
  };

  const resetColors = () => setBgColors(DEFAULT_COLORS);

  return (
    <SettingsContext.Provider value={{ bgColors, bgEnabled, setBgEnabled, updateColor, resetColors }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
};
