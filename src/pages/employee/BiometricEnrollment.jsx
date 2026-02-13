import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAppContext } from '../../context/AppContext';
import BackButton from '../../components/BackButton';

const BiometricEnrollment = () => {
  const { backendUrl, token, userData } = useAppContext();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [selectedType, setSelectedType] = useState('fingerprint');

  useEffect(() => {
    if (userData?._id) {
      fetchTemplates();
    }
  }, [userData]);

  const fetchTemplates = async () => {
    try {
      const { data } = await axios.get(
        `${backendUrl}/biometric/templates/${userData._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTemplates(data.templates || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching templates:', error);
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      // Simulate biometric capture (in production, this would use actual biometric device)
      const simulatedTemplate = btoa(`${selectedType}-${userData._id}-${Date.now()}`);
      
      const { data } = await axios.post(
        `${backendUrl}/biometric/enroll`,
        {
          userId: userData._id,
          biometricType: selectedType,
          templateData: simulatedTemplate,
          quality: 95
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(data.message);
      fetchTemplates();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Enrollment failed');
    } finally {
      setEnrolling(false);
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
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <BackButton />
      </div>

      <h1 className="text-3xl font-bold text-gray-800 mb-6">Biometric Enrollment</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Enroll New Biometric</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Biometric Type
          </label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="fingerprint">Fingerprint</option>
            <option value="face">Face Recognition</option>
            <option value="iris">Iris Scan</option>
            <option value="palm">Palm Print</option>
          </select>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800">
            📱 In production, this would connect to your biometric device. 
            For demo purposes, click "Enroll" to simulate biometric capture.
          </p>
        </div>

        <button
          onClick={handleEnroll}
          disabled={enrolling}
          className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
        >
          {enrolling ? 'Enrolling...' : 'Enroll Biometric'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Enrolled Biometrics</h2>
        
        {templates.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No biometrics enrolled yet. Enroll your first biometric above.
          </p>
        ) : (
          <div className="space-y-4">
            {templates.map((template) => (
              <div
                key={template._id}
                className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center space-x-4">
                  <div className="text-4xl">
                    {template.biometricType === 'fingerprint' && '👆'}
                    {template.biometricType === 'face' && '😊'}
                    {template.biometricType === 'iris' && '👁️'}
                    {template.biometricType === 'palm' && '🖐️'}
                  </div>
                  <div>
                    <p className="font-semibold capitalize">{template.biometricType}</p>
                    <p className="text-sm text-gray-500">
                      Quality: {template.quality}%
                    </p>
                    <p className="text-xs text-gray-400">
                      Enrolled: {new Date(template.enrolledAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    template.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {template.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BiometricEnrollment;
