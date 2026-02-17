import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

const CarRecommendations = () => {
  const { backendUrl, token, getImageUrl } = useAppContext();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('recommended');

  useEffect(() => {
    if (token) {
      fetchRecommendations();
      fetchTrending();
    }
  }, [token]);

  const fetchRecommendations = async () => {
    try {
      const { data } = await axios.get(
        '/recommendations?limit=6',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRecommendations(data.recommendations || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setLoading(false);
    }
  };

  const fetchTrending = async () => {
    try {
      const { data } = await axios.get(
        '/recommendations/trending?limit=6'
      );
      setTrending(data.trendingCars || []);
    } catch (error) {
      console.error('Error fetching trending:', error);
    }
  };

  const handleCarClick = (carId) => {
    navigate(`/car-details/${carId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const displayCars = activeTab === 'recommended' ? recommendations : trending;

  return (
    <div className="my-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {activeTab === 'recommended' ? '🎯 Recommended For You' : '🔥 Trending Cars'}
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('recommended')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'recommended'
                ? 'bg-primary text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Recommended
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'trending'
                ? 'bg-primary text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Trending
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayCars.map((car) => (
          <div
            key={car._id}
            onClick={() => handleCarClick(car._id)}
            className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
          >
            <div className="relative">
              <img
                src={getImageUrl(car.image)}
                alt={car.name}
                className="w-full h-48 object-cover"
              />
              {activeTab === 'recommended' && car.recommendationScore && (
                <div className="absolute top-2 right-2 bg-primary text-white px-3 py-1 rounded-full text-sm font-medium">
                  {Math.round(car.recommendationScore)}% Match
                </div>
              )}
              {activeTab === 'trending' && car.trendingStats && (
                <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  🔥 {car.trendingStats.bookingCount} bookings
                </div>
              )}
            </div>

            <div className="p-4">
              <h3 className="text-lg font-semibold mb-2">{car.name}</h3>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">{car.category}</span>
                <div className="flex items-center">
                  <span className="text-yellow-500">★</span>
                  <span className="ml-1 text-sm">{car.averageRating?.toFixed(1) || 'New'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl font-bold text-primary">
                  ₹{car.pricePerDay}
                  <span className="text-sm text-gray-500">/day</span>
                </span>
              </div>

              {activeTab === 'recommended' && car.matchReasons && car.matchReasons.length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-xs text-gray-500 mb-1">Why recommended:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {car.matchReasons.slice(0, 2).map((reason, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-green-500 mr-1">✓</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button className="w-full mt-3 bg-primary text-white py-2 rounded-lg hover:bg-primary-dark transition-colors">
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {displayCars.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <p className="text-gray-500 text-lg">
            {activeTab === 'recommended' 
              ? 'Start booking cars to get personalized recommendations!'
              : 'No trending cars at the moment'}
          </p>
        </div>
      )}
    </div>
  );
};

export default CarRecommendations;
