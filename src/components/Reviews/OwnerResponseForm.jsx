import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const OwnerResponseForm = ({ review, carOwnerId, onSuccess }) => {
  const [responseText, setResponseText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [validationError, setValidationError] = useState('');
  const { token, backendUrl, user } = useAppContext();

  // Character limits based on requirements 4.3
  const MIN_CHARS = 4;
  const MAX_CHARS = 1000;

  // Check if current user is the car owner
  const isCarOwner = user && user._id === carOwnerId;

  // Check if response already exists
  const hasExistingResponse = review.ownerResponse && review.ownerResponse.text;

  useEffect(() => {
    // Pre-fill with existing response if editing
    if (hasExistingResponse && isEditing) {
      setResponseText(review.ownerResponse.text);
    }
  }, [isEditing, hasExistingResponse, review.ownerResponse]);

  // Validate response text
  const validateResponseText = (text) => {
    const trimmedText = text.trim();
    
    if (trimmedText.length === 0) {
      return 'Response cannot be empty';
    }
    
    if (trimmedText.length < MIN_CHARS) {
      return `Response must be at least ${MIN_CHARS} characters (currently ${trimmedText.length})`;
    }
    
    if (text.length > MAX_CHARS) {
      return `Response cannot exceed ${MAX_CHARS} characters`;
    }
    
    // Check for whitespace-only content
    if (!/\S/.test(text)) {
      return 'Response cannot contain only whitespace';
    }
    
    return '';
  };

  const handleResponseTextChange = (e) => {
    const newText = e.target.value;
    setResponseText(newText);
    
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate before submission
    const error = validateResponseText(responseText);
    if (error) {
      setValidationError(error);
      toast.error(error);
      return;
    }

    setLoading(true);
    setValidationError('');

    try {
      const response = await axios.post(
        `${backendUrl}/reviews/${review._id}/respond`,
        { responseText: responseText.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(hasExistingResponse ? 'Response updated successfully!' : 'Response submitted successfully!');
      
      // Reset form
      setResponseText('');
      setIsEditing(false);
      
      if (onSuccess) onSuccess();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to submit response';
      toast.error(errorMessage);
      setValidationError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setResponseText('');
    setIsEditing(false);
    setValidationError('');
  };

  // Don't show form if user is not the car owner
  if (!isCarOwner) {
    return null;
  }

  const trimmedLength = responseText.trim().length;
  const isValid = trimmedLength >= MIN_CHARS && responseText.length <= MAX_CHARS;
  const charCountColor = 
    responseText.length > MAX_CHARS ? 'text-red-600' :
    trimmedLength < MIN_CHARS ? 'text-yellow-600' :
    'text-green-600';

  // If response exists and not editing, show edit button
  if (hasExistingResponse && !isEditing) {
    return (
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-blue-900">Your Response</p>
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Response
          </button>
        </div>
        <p className="text-sm text-gray-700">{review.ownerResponse.text}</p>
        <p className="text-xs text-gray-500 mt-2">
          Responded on {new Date(review.ownerResponse.respondedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 p-4 bg-white rounded-lg border-2 border-blue-200 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
        </svg>
        <label className="block text-sm font-semibold text-gray-800">
          {hasExistingResponse ? 'Edit Your Response' : 'Respond to this Review'}
        </label>
      </div>

      <textarea
        value={responseText}
        onChange={handleResponseTextChange}
        maxLength={MAX_CHARS}
        rows={4}
        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors resize-none ${
          validationError 
            ? 'border-red-500 focus:ring-red-500' 
            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
        }`}
        placeholder="Write your response to the reviewer... (minimum 4 characters)"
      />
      
      {/* Character Counter */}
      <div className="flex justify-between items-center mt-2">
        <p className={`text-sm font-medium ${charCountColor}`}>
          {trimmedLength < MIN_CHARS && (
            <span>{MIN_CHARS - trimmedLength} more characters needed</span>
          )}
          {trimmedLength >= MIN_CHARS && responseText.length <= MAX_CHARS && (
            <span>✓ Valid length</span>
          )}
          {responseText.length > MAX_CHARS && (
            <span>Exceeds maximum length</span>
          )}
        </p>
        <p className={`text-sm ${charCountColor}`}>
          {responseText.length}/{MAX_CHARS} characters
        </p>
      </div>

      {/* Validation Error Message */}
      {validationError && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600 flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {validationError}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mt-4">
        <button
          type="submit"
          disabled={loading || !isValid}
          className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>{hasExistingResponse ? 'Updating...' : 'Submitting...'}</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{hasExistingResponse ? 'Update Response' : 'Submit Response'}</span>
            </>
          )}
        </button>
        
        {(hasExistingResponse || responseText) && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Help Text */}
      <p className="text-xs text-gray-500 text-center mt-3">
        Your response will be visible to all users viewing this review
      </p>
    </form>
  );
};

export default OwnerResponseForm;
