import React from 'react';

export const QyvrinLogo: React.FC<{ className?: string }> = ({ className = "h-8 w-auto max-w-full" }) => (
  <img 
    src="/qyvrin-logo.svg" 
    alt="QYVRIN" 
    className={className}
    style={{ objectFit: 'contain' }}
  />
);

