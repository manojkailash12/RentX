import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const BookingConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { booking } = location.state || {};

  if (!booking) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <p className="text-gray-600">No booking information found</p>
        <button
          onClick={() => navigate('/my-bookings')}
          className="mt-4 px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          View My Bookings
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold text-green-600 mb-2">Booking Confirmed!</h1>
          <p className="text-gray-600">Your booking has been successfully created</p>
        </div>

        <div className="border-t border-b py-6 mb-6 space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Booking ID:</span>
            <span className="font-semibold">{booking._id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Car:</span>
            <span className="font-semibold">
              {booking.carId?.brand} {booking.carId?.model}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Start Date:</span>
            <span className="font-semibold">
              {new Date(booking.startDate).toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">End Date:</span>
            <span className="font-semibold">
              {new Date(booking.endDate).toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total Amount:</span>
            <span className="font-bold text-xl text-blue-600">
              ${booking.totalAmount}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => navigate('/my-bookings')}
            className="flex-1 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold"
          >
            View My Bookings
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;
