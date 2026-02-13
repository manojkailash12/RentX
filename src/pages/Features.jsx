import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LoyaltyCard from '../components/Loyalty/LoyaltyCard';
import ChatWidgetNetlify from '../components/Chat/ChatWidgetNetlify';
import { useAppContext } from '../context/AppContext';

const Features = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { token } = useAppContext();

  const features = [
    {
      icon: '💬',
      title: 'Real-time Chat',
      description: 'Communicate instantly with car owners and support team',
      color: 'from-blue-500 to-blue-600',
      action: () => {}
    },
    {
      icon: '⭐',
      title: 'Rating & Reviews',
      description: 'Share your experience and read reviews from other users',
      color: 'from-yellow-500 to-yellow-600',
      action: () => navigate('/cars')
    },
    {
      icon: '🌐',
      title: 'Multi-language Support',
      description: 'Use the app in English, Telugu, Hindi, and more',
      color: 'from-green-500 to-green-600',
      action: () => {}
    },
    {
      icon: '📊',
      title: 'Advanced Analytics',
      description: 'Track your bookings, earnings, and performance metrics',
      color: 'from-purple-500 to-purple-600',
      action: () => navigate('/owner/dashboard')
    },
    {
      icon: '🎁',
      title: 'Loyalty Program',
      description: 'Earn points on every booking and get exclusive rewards',
      color: 'from-pink-500 to-pink-600',
      action: () => {}
    },
    {
      icon: '📱',
      title: 'Mobile Responsive',
      description: 'Access all features seamlessly on any device',
      color: 'from-indigo-500 to-indigo-600',
      action: () => {}
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Powerful Features for Better Experience
          </h1>
          <p className="text-xl text-gray-600">
            Everything you need to rent, manage, and track your car rentals
          </p>
        </div>

        {/* Loyalty Card Section */}
        {token && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Loyalty Status</h2>
            <LoyaltyCard />
          </div>
        )}

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => (
            <div
              key={index}
              onClick={feature.action}
              className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
            >
              <div className={`bg-gradient-to-r ${feature.color} p-6 text-white`}>
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-2xl font-bold">{feature.title}</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-600">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Feature Details */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Feature Highlights</h2>
          
          <div className="space-y-6">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="text-xl font-semibold mb-2">Real-time Chat System</h3>
              <p className="text-gray-600">
                Connect instantly with car owners, ask questions, and get support through our integrated chat system. 
                Messages are delivered in real-time with read receipts and typing indicators.
              </p>
            </div>

            <div className="border-l-4 border-yellow-500 pl-4">
              <h3 className="text-xl font-semibold mb-2">Rating & Review System</h3>
              <p className="text-gray-600">
                Share your rental experience and help others make informed decisions. Rate cars, write detailed reviews, 
                and see responses from owners. All reviews are verified from actual bookings.
              </p>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="text-xl font-semibold mb-2">Multi-language Support</h3>
              <p className="text-gray-600">
                Use RentX in your preferred language. Currently supporting English, Telugu (తెలుగు), and Hindi (हिंदी). 
                Switch languages anytime from the navigation bar.
              </p>
            </div>

            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="text-xl font-semibold mb-2">Advanced Analytics</h3>
              <p className="text-gray-600">
                Get detailed insights into your rental business. Track revenue, booking trends, top-performing cars, 
                customer behavior, and more with interactive charts and reports.
              </p>
            </div>

            <div className="border-l-4 border-pink-500 pl-4">
              <h3 className="text-xl font-semibold mb-2">Loyalty Program</h3>
              <p className="text-gray-600">
                Earn points on every booking and unlock exclusive benefits. Progress through Bronze, Silver, Gold, 
                and Platinum tiers to get better discounts, priority support, and special perks.
              </p>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-amber-100 p-3 rounded-lg text-center">
                  <div className="text-2xl mb-1">🥉</div>
                  <div className="font-semibold text-sm">Bronze</div>
                  <div className="text-xs text-gray-600">1x points</div>
                </div>
                <div className="bg-gray-100 p-3 rounded-lg text-center">
                  <div className="text-2xl mb-1">🥈</div>
                  <div className="font-semibold text-sm">Silver</div>
                  <div className="text-xs text-gray-600">1.25x points + 5% off</div>
                </div>
                <div className="bg-yellow-100 p-3 rounded-lg text-center">
                  <div className="text-2xl mb-1">🥇</div>
                  <div className="font-semibold text-sm">Gold</div>
                  <div className="text-xs text-gray-600">1.5x points + 10% off</div>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg text-center">
                  <div className="text-2xl mb-1">💎</div>
                  <div className="font-semibold text-sm">Platinum</div>
                  <div className="text-xs text-gray-600">2x points + 15% off</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-primary to-primary-dull text-white rounded-xl shadow-lg p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Experience These Features?</h2>
          <p className="text-xl mb-6">
            Start renting cars today and enjoy all these amazing features
          </p>
          <button
            onClick={() => navigate('/cars')}
            className="bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Browse Cars
          </button>
        </div>
      </div>

      {/* Chat Widget */}
      {token && <ChatWidgetNetlify />}
    </div>
  );
};

export default Features;
