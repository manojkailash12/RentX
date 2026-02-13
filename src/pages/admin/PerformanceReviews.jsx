import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAppContext } from '../../context/AppContext';
import BackButton from '../../components/BackButton';

const PerformanceReviews = () => {
  const { backendUrl, token } = useAppContext();
  const [reviews, setReviews] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    reviewPeriod: {
      start: '',
      end: ''
    },
    reviewType: 'quarterly',
    ratings: {
      attendance: { score: 3, comments: '' },
      punctuality: { score: 3, comments: '' },
      workQuality: { score: 3, comments: '' },
      teamwork: { score: 3, comments: '' },
      communication: { score: 3, comments: '' },
      initiative: { score: 3, comments: '' },
      customerService: { score: 3, comments: '' }
    },
    strengths: [],
    areasForImprovement: [],
    goals: [],
    trainingRecommendations: [],
    reviewerComments: ''
  });

  useEffect(() => {
    fetchReviews();
    fetchEmployees();
  }, []);

  const fetchReviews = async () => {
    try {
      const { data } = await axios.get(
        `${backendUrl}/performance/reviews`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReviews(data.reviews || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data } = await axios.get(
        `${backendUrl}/employees`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEmployees(data.employees || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(
        `${backendUrl}/performance/reviews`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(data.message);
      setShowCreateModal(false);
      fetchReviews();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create review');
    }
  };

  const updateRating = (category, field, value) => {
    setFormData({
      ...formData,
      ratings: {
        ...formData.ratings,
        [category]: {
          ...formData.ratings[category],
          [field]: value
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <BackButton />
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Performance Reviews</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors"
        >
          + Create Review
        </button>
      </div>

      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review._id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">
                  {review.employeeId?.userId?.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {review.employeeId?.employeeId} | {review.reviewType}
                </p>
                <p className="text-sm text-gray-500">
                  Period: {new Date(review.reviewPeriod.start).toLocaleDateString()} - {new Date(review.reviewPeriod.end).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-primary">
                  {review.overallScore.toFixed(1)}
                </div>
                <p className="text-sm text-gray-500">Overall Score</p>
                <span className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-medium ${
                  review.status === 'completed' 
                    ? 'bg-blue-100 text-blue-800'
                    : review.status === 'acknowledged'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {review.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {Object.entries(review.ratings).map(([key, value]) => (
                <div key={key} className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                  <div className="flex items-center">
                    <span className="text-lg font-semibold">{value.score}</span>
                    <span className="text-sm text-gray-400 ml-1">/5</span>
                  </div>
                </div>
              ))}
            </div>

            {review.strengths && review.strengths.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-700 mb-1">Strengths:</p>
                <div className="flex flex-wrap gap-2">
                  {review.strengths.map((strength, idx) => (
                    <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                      {strength}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {review.areasForImprovement && review.areasForImprovement.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-700 mb-1">Areas for Improvement:</p>
                <div className="flex flex-wrap gap-2">
                  {review.areasForImprovement.map((area, idx) => (
                    <span key={idx} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="text-sm text-gray-600">
              Reviewed by: {review.reviewedBy?.name} on {new Date(review.createdAt).toLocaleDateString()}
            </div>
          </div>
        ))}

        {reviews.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <p className="text-gray-500 text-lg">No performance reviews yet</p>
          </div>
        )}
      </div>

      {/* Create Review Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Create Performance Review</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee
                  </label>
                  <select
                    required
                    value={formData.employeeId}
                    onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Select Employee</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>
                        {emp.userId?.name} - {emp.employeeId}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Review Type
                  </label>
                  <select
                    value={formData.reviewType}
                    onChange={(e) => setFormData({...formData, reviewType: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="quarterly">Quarterly</option>
                    <option value="half-yearly">Half-Yearly</option>
                    <option value="annual">Annual</option>
                    <option value="probation">Probation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Period Start
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.reviewPeriod.start}
                    onChange={(e) => setFormData({
                      ...formData,
                      reviewPeriod: {...formData.reviewPeriod, start: e.target.value}
                    })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Period End
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.reviewPeriod.end}
                    onChange={(e) => setFormData({
                      ...formData,
                      reviewPeriod: {...formData.reviewPeriod, end: e.target.value}
                    })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Ratings (1-5)</h3>
                <div className="space-y-3">
                  {Object.keys(formData.ratings).map((category) => (
                    <div key={category} className="grid grid-cols-3 gap-4 items-center">
                      <label className="text-sm font-medium capitalize">
                        {category.replace(/([A-Z])/g, ' $1')}
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={formData.ratings[category].score}
                        onChange={(e) => updateRating(category, 'score', parseInt(e.target.value))}
                        className="w-full"
                      />
                      <span className="text-lg font-semibold text-center">
                        {formData.ratings[category].score}/5
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reviewer Comments
                </label>
                <textarea
                  value={formData.reviewerComments}
                  onChange={(e) => setFormData({...formData, reviewerComments: e.target.value})}
                  rows="3"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Overall assessment..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
                >
                  Create Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceReviews;
