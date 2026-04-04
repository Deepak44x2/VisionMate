import React, { useState, useEffect } from 'react';

const BatteryIndicator: React.FC = () => {
  const [level, setLevel] = useState<number | null>(null);
  const [charging, setCharging] = useState<boolean>(false);

  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setLevel(Math.round(battery.level * 100));
        setCharging(battery.charging);

        battery.addEventListener('levelchange', () => {
          setLevel(Math.round(battery.level * 100));
        });
        battery.addEventListener('chargingchange', () => {
          setCharging(battery.charging);
        });
      });
    }
  }, []);

  if (level === null) return null;

  return (
    <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm border border-gray-700">
      <span className={`text-sm font-bold ${level <= 20 ? 'text-eyefi-alert' : 'text-white'}`}>
        {level}%
      </span>
      {charging && <span className="text-eyefi-primary text-xs">⚡</span>}
    </div>
  );
};

export default BatteryIndicator;