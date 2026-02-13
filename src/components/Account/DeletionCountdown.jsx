import React, { useState, useEffect } from 'react';

const DeletionCountdown = ({ scheduledDate, minutesRemaining, secondsRemaining, onCancel, canCancel }) => {
  const [timeLeft, setTimeLeft] = useState({ minutes: minutesRemaining || 0, seconds: secondsRemaining || 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const scheduled = new Date(scheduledDate);
      const diff = scheduled - now;

      if (diff <= 0) {
        setTimeLeft({ minutes: 0, seconds: 0 });
        clearInterval(timer);
      } else {
        const minutes = Math.floor(diff / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [scheduledDate]);

  return (
    <div className="bg-red-100 border-2 border-red-500 rounded-lg p-6 mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-bold text-red-900 mb-2">
            ⚠️ Account Deletion Scheduled
          </h3>
          <p className="text-red-800 mb-2">
            Your account will be permanently deleted on:
          </p>
          <p className="text-2xl font-bold text-red-900 mb-2">
            {new Date(scheduledDate).toLocaleDateString()} at {new Date(scheduledDate).toLocaleTimeString()}
          </p>
          <p className="text-red-700 text-lg">
            <strong className="text-2xl">{timeLeft.minutes}:{timeLeft.seconds.toString().padStart(2, '0')}</strong> minutes remaining
          </p>
        </div>
        {canCancel && (
          <button
            onClick={onCancel}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
          >
            Cancel Deletion
          </button>
        )}
      </div>
    </div>
  );
};

export default DeletionCountdown;
