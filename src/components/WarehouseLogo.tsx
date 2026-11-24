import React from 'react';

interface WarehouseLogoProps {
  className?: string;
  compact?: boolean;
}

export function WarehouseLogo({ className = '', compact = false }: WarehouseLogoProps) {
  return (
    <svg
      viewBox="0 0 120 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Logotipo de transporte rápido de almacén"
    >
      {/* Líneas de velocidad traseras en azul acento */}
      <path
        d="M26 13H58V31H21"
        stroke="#2563EB"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 22H47"
        stroke="#0284C7"
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      {/* Silueta minimalista de camioneta / cabina en azul marino formal */}
      <path
        d="M67 31V13C81 13 91 17 95 25L108 27.5C110.8 28 112 29.8 112 32.5V39H8"
        stroke="#0F2942"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Línea sutil inferior de dinamismo */}
      {!compact && (
        <path
          d="M22 45H96"
          stroke="#93C5FD"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
