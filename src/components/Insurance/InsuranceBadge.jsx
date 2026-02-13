import React from 'react';

const InsuranceBadge = ({ insurance }) => {
  if (!insurance || !insurance.selected) {
    return null;
  }

  const badgeColors = {
    basic: 'bg-blue-100 text-blue-700',
    comprehensive: 'bg-purple-100 text-purple-700',
    premium: 'bg-yellow-100 text-yellow-700'
  };

  const badgeIcons = {
    basic: '🛡️',
    comprehensive: '🛡️✨',
    premium: '🛡️⭐'
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badgeColors[insurance.type] || 'bg-gray-100 text-gray-700'}`}>
      <span>{badgeIcons[insurance.type] || '🛡️'}</span>
      <span className="capitalize">{insurance.type}</span>
    </span>
  );
};

export default InsuranceBadge;
