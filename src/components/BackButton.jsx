import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const BackButton = ({ customPath, className = '' }) => {
  const navigate = useNavigate();
  const { isAdmin, isOwner, userData } = useAppContext();

  const handleBack = () => {
    if (customPath) {
      navigate(customPath);
      return;
    }

    // Determine dashboard path based on role
    if (isAdmin || isOwner || userData?.role === 'employee') {
      navigate('/owner/dashboard');
    } else {
      navigate('/');
    }
  };

  return (
    <button
      onClick={handleBack}
      className={`flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors ${className}`}
      title="Back to Dashboard"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      <span>Back</span>
    </button>
  );
};

export default BackButton;
