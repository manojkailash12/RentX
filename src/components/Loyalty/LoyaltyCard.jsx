import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAppContext } from '../../context/AppContext';

const LoyaltyCard = () => {
  const [loyaltyData, setLoyaltyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { token, backendUrl } = useAppContext();

  useEffect(() => {
    if (token) {
      loadLoyaltyData();
    }
  }, [token]);

  const loadLoyaltyData = async () => {
    try {
      const response = await axios.get(`${backendUrl}/loyalty`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLoyaltyData(response.data.loyalty);
    } catch (error) {
      console.error('Load loyalty data error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-48 rounded-lg"></div>;
  }

  if (!loyaltyData) return null;

  const tierColors = {
    bronze: 'from-amber-700 to-amber-900',
    silver: 'from-gray-400 to-gray-600',
    gold: 'from-yellow-400 to-yellow-600',
    platinum: 'from-purple-400 to-purple-600'
  };

  const tierIcons = {
    bronze: '🥉',
    silver: '🥈',
    gold: '🥇',
    platinum: '💎'
  };

  return (
    <div className={`bg-gradient-to-br ${tierColors[loyaltyData.tier]} text-white p-6 rounded-xl shadow-lg`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-2xl font-bold mb-1">
            {loyaltyData.tier.charAt(0).toUpperCase() + loyaltyData.tier.slice(1)} Member
          </h3>
          <p className="text-white/80 text-sm">RentX Loyalty Program</p>
        </div>
        <div className="text-4xl">{tierIcons[loyaltyData.tier]}</div>
      </div>

      <div className="mb-4">
        <div className="text-4xl font-bold mb-1">{loyaltyData.points}</div>
        <div className="text-white/80 text-sm">Available Points</div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-lg font-semibold">{loyaltyData.totalEarned}</div>
          <div className="text-white/80 text-xs">Total Earned</div>
        </div>
        <div>
          <div className="text-lg font-semibold">{loyaltyData.totalRedeemed}</div>
          <div className="text-white/80 text-xs">Total Redeemed</div>
        </div>
      </div>

      <div className="border-t border-white/20 pt-4">
        <h4 className="font-semibold mb-2">Your Benefits</h4>
        <ul className="space-y-1 text-sm">
          {loyaltyData.benefits.perks.map((perk, index) => (
            <li key={index} className="flex items-center gap-2">
              <span>✓</span>
              <span>{perk}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default LoyaltyCard;
