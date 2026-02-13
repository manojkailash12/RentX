import React from 'react';

const InsuranceDetails = ({ insurance }) => {
  if (!insurance || !insurance.selected) {
    return (
      <div className="text-sm text-gray-500">
        No insurance selected
      </div>
    );
  }

  const insuranceNames = {
    basic: 'Basic Insurance',
    comprehensive: 'Comprehensive Insurance',
    premium: 'Premium Insurance'
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">🛡️</span>
        <h4 className="font-semibold text-gray-900">
          {insuranceNames[insurance.type] || 'Insurance'}
        </h4>
      </div>
      
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Coverage:</span>
          <span className="font-medium">₹{(insurance.coverage / 100000).toFixed(0)} Lakh</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Cost:</span>
          <span className="font-medium text-blue-600">₹{insurance.cost}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Provider:</span>
          <span className="font-medium">{insurance.provider}</span>
        </div>
      </div>
    </div>
  );
};

export default InsuranceDetails;
