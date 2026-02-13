import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAppContext } from '../../context/AppContext';

const InsuranceSelector = ({ totalDays, onInsuranceSelect, selectedInsurance }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const { backendUrl, token } = useAppContext();

  useEffect(() => {
    loadInsurancePlans();
  }, [totalDays]);

  const loadInsurancePlans = async () => {
    try {
      const response = await axios.get(`${backendUrl}/insurance/plans`, {
        params: { totalDays },
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlans(response.data.plans);
    } catch (error) {
      console.error('Load insurance plans error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan) => {
    if (selectedInsurance?.type === plan.type) {
      onInsuranceSelect(null);
    } else {
      onInsuranceSelect({
        selected: true,
        type: plan.type,
        cost: plan.totalCost,
        coverage: plan.coverage
      });
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading insurance plans...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Add Insurance Protection (Optional)</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isSelected = selectedInsurance?.type === plan.type;
          
          return (
            <div
              key={plan.type}
              onClick={() => handleSelectPlan(plan)}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                isSelected
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-green-300'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                  <p className="text-sm text-gray-600">Coverage: ₹{(plan.coverage / 100000).toFixed(0)} Lakh</p>
                </div>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  className="w-5 h-5 text-green-600"
                />
              </div>

              <div className="mb-3">
                <div className="text-2xl font-bold text-green-600">₹{plan.totalCost}</div>
                <div className="text-xs text-gray-500">₹{plan.costPerDay}/day</div>
              </div>

              <ul className="space-y-1">
                {plan.features.map((feature, index) => (
                  <li key={index} className="text-xs text-gray-600 flex items-start">
                    <span className="text-green-500 mr-1">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {selectedInsurance && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-800">
            <span className="font-semibold">Insurance Selected:</span> {
              plans.find(p => p.type === selectedInsurance.type)?.name
            } - ₹{selectedInsurance.cost}
          </p>
        </div>
      )}
    </div>
  );
};

export default InsuranceSelector;
