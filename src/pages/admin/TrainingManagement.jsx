import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAppContext } from '../../context/AppContext';
import BackButton from '../../components/BackButton';

const TrainingManagement = () => {
  const { backendUrl, token } = useAppContext();
  const [trainings, setTrainings] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('trainings');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'technical',
    duration: { hours: 0, minutes: 0 },
    provider: '',
    cost: 0,
    maxParticipants: 20,
    schedule: {
      startDate: '',
      endDate: ''
    },
    certification: {
      provided: false,
      name: '',
      validityPeriod: 12
    }
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      const [trainingsRes, enrollmentsRes, employeesRes] = await Promise.all([
        axios.get(`${backendUrl}/training/list`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${backendUrl}/training/enrollments`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${backendUrl}/employees`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setTrainings(trainingsRes.data.trainings || []);
      setEnrollments(enrollmentsRes.data.enrollments || []);
      setEmployees(employeesRes.data.employees || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const handleCreateTraining = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(
        `${backendUrl}/training/create`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(data.message);
      setShowModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create training');
    }
  };

  const handleEnroll = async (trainingId, employeeId) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/training/enroll`,
        { trainingId, employeeId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(data.message);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to enroll');
    }
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
        <h1 className="text-3xl font-bold text-gray-800">Training Management</h1>
        {activeTab === 'trainings' && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors"
          >
            + Create Training
          </button>
        )}
      </div>

      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('trainings')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'trainings'
              ? 'bg-primary text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Trainings
        </button>
        <button
          onClick={() => setActiveTab('enrollments')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'enrollments'
              ? 'bg-primary text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Enrollments
        </button>
      </div>

      {activeTab === 'trainings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {trainings.map((training) => (
            <div key={training._id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{training.title}</h3>
                  <span className="text-sm text-gray-500 capitalize">{training.category}</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  training.status === 'scheduled' 
                    ? 'bg-blue-100 text-blue-800'
                    : training.status === 'ongoing'
                    ? 'bg-green-100 text-green-800'
                    : training.status === 'completed'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {training.status}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-4">{training.description}</p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-xs text-gray-500">Duration</p>
                  <p className="font-semibold">{training.duration?.hours}h {training.duration?.minutes}m</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-xs text-gray-500">Max Participants</p>
                  <p className="font-semibold">{training.maxParticipants}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-xs text-gray-500">Provider</p>
                  <p className="font-semibold text-sm">{training.provider || 'Internal'}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-xs text-gray-500">Cost</p>
                  <p className="font-semibold">₹{training.cost || 0}</p>
                </div>
              </div>

              {training.certification?.provided && (
                <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-3">
                  <p className="text-xs text-blue-800">
                    🎓 Certificate: {training.certification.name}
                  </p>
                </div>
              )}

              <div className="text-sm text-gray-500">
                {new Date(training.schedule?.startDate).toLocaleDateString()} - {new Date(training.schedule?.endDate).toLocaleDateString()}
              </div>
            </div>
          ))}

          {trainings.length === 0 && (
            <div className="col-span-2 text-center py-12 bg-white rounded-lg shadow-md">
              <p className="text-gray-500 text-lg">No trainings created yet</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'enrollments' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Training</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Certificate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {enrollments.map((enrollment) => (
                <tr key={enrollment._id}>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium">{enrollment.employeeId?.userId?.name}</p>
                      <p className="text-sm text-gray-500">{enrollment.employeeId?.employeeId}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium">{enrollment.trainingId?.title}</p>
                    <p className="text-sm text-gray-500 capitalize">{enrollment.trainingId?.category}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      enrollment.status === 'completed' 
                        ? 'bg-green-100 text-green-800'
                        : enrollment.status === 'in-progress'
                        ? 'bg-blue-100 text-blue-800'
                        : enrollment.status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {enrollment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {enrollment.assessment?.score && (
                      <span>{enrollment.assessment.score}/{enrollment.assessment.maxScore}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {enrollment.certification?.issued ? (
                      <span className="text-green-600">✓ Issued</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {enrollments.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No enrollments yet</p>
            </div>
          )}
        </div>
      )}

      {/* Create Training Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 my-8">
            <h2 className="text-2xl font-bold mb-4">Create Training Program</h2>
            
            <form onSubmit={handleCreateTraining} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Training Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Customer Service Excellence"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows="2"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="technical">Technical</option>
                    <option value="soft-skills">Soft Skills</option>
                    <option value="safety">Safety</option>
                    <option value="compliance">Compliance</option>
                    <option value="customer-service">Customer Service</option>
                    <option value="management">Management</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provider
                  </label>
                  <input
                    type="text"
                    value={formData.provider}
                    onChange={(e) => setFormData({...formData, provider: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Internal / External"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (Hours)
                  </label>
                  <input
                    type="number"
                    value={formData.duration.hours}
                    onChange={(e) => setFormData({
                      ...formData,
                      duration: {...formData.duration, hours: parseInt(e.target.value)}
                    })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Participants
                  </label>
                  <input
                    type="number"
                    value={formData.maxParticipants}
                    onChange={(e) => setFormData({...formData, maxParticipants: parseInt(e.target.value)})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.schedule.startDate}
                    onChange={(e) => setFormData({
                      ...formData,
                      schedule: {...formData.schedule, startDate: e.target.value}
                    })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.schedule.endDate}
                    onChange={(e) => setFormData({
                      ...formData,
                      schedule: {...formData.schedule, endDate: e.target.value}
                    })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div className="col-span-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.certification.provided}
                      onChange={(e) => setFormData({
                        ...formData,
                        certification: {...formData.certification, provided: e.target.checked}
                      })}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Provides Certification
                    </span>
                  </label>
                </div>

                {formData.certification.provided && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Certificate Name
                    </label>
                    <input
                      type="text"
                      value={formData.certification.name}
                      onChange={(e) => setFormData({
                        ...formData,
                        certification: {...formData.certification, name: e.target.value}
                      })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Certified Customer Service Professional"
                    />
                  </div>
                )}
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
                >
                  Create Training
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingManagement;
