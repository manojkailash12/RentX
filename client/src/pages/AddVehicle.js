import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './AddVehicle.css';

const AddVehicle = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    model: '',
    year: '',
    type: 'sedan',
    seats: '',
    transmission: 'manual',
    fuelType: 'petrol',
    pricePerDay: '',
    pricePerKm: '',
    registrationNumber: '',
    location: {
      city: '',
      district: '',
      state: '',
      address: ''
    },
    features: [],
    insuranceDetails: {
      provider: '',
      policyNumber: '',
      expiryDate: ''
    }
  });

  const [files, setFiles] = useState({
    images: [],
    rcBook: null,
    registrationCertificate: null,
    insuranceCertificate: null,
    pollutionCertificate: null
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const carTypes = ['sedan', 'suv', 'hatchback', 'luxury', 'economy'];
  const fuelTypes = ['petrol', 'diesel', 'electric', 'hybrid'];
  const southIndianStates = ['Tamil Nadu', 'Karnataka', 'Kerala', 'Andhra Pradesh', 'Telangana'];
  const commonFeatures = [
    'AC', 'GPS', 'Music System', 'Power Steering', 'Power Windows',
    'Central Locking', 'ABS', 'Airbags', 'Bluetooth', 'USB Charging'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('location.')) {
      const locationField = name.split('.')[1];
      setFormData({
        ...formData,
        location: {
          ...formData.location,
          [locationField]: value
        }
      });
    } else if (name.startsWith('insuranceDetails.')) {
      const insuranceField = name.split('.')[1];
      setFormData({
        ...formData,
        insuranceDetails: {
          ...formData.insuranceDetails,
          [insuranceField]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleFeatureChange = (feature) => {
    const updatedFeatures = formData.features.includes(feature)
      ? formData.features.filter(f => f !== feature)
      : [...formData.features, feature];
    
    setFormData({
      ...formData,
      features: updatedFeatures
    });
  };

  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target;
    
    if (name === 'images') {
      setFiles({
        ...files,
        [name]: Array.from(selectedFiles)
      });
    } else {
      setFiles({
        ...files,
        [name]: selectedFiles[0]
      });
    }
  };

  const validateForm = () => {
    if (!formData.name || !formData.brand || !formData.model || !formData.year) {
      toast.error('Please fill in all basic vehicle details');
      return false;
    }

    if (!formData.registrationNumber) {
      toast.error('Registration number is required');
      return false;
    }

    if (!formData.pricePerDay || !formData.pricePerKm) {
      toast.error('Please set pricing details');
      return false;
    }

    if (!formData.location.city || !formData.location.state) {
      toast.error('Please provide location details');
      return false;
    }

    // For admin, documents are optional. For users, they are required.
    if (user?.role !== 'admin') {
      if (!files.rcBook || !files.registrationCertificate) {
        toast.error('RC Book and Registration Certificate are required');
        return false;
      }
    }

    if (files.images.length === 0) {
      toast.error('Please upload at least one vehicle image');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      const submitData = new FormData();
      
      // Append form data
      Object.keys(formData).forEach(key => {
        if (key === 'location' || key === 'insuranceDetails') {
          Object.keys(formData[key]).forEach(subKey => {
            submitData.append(`${key}.${subKey}`, formData[key][subKey]);
          });
        } else if (key === 'features') {
          formData[key].forEach(feature => {
            submitData.append('features[]', feature);
          });
        } else {
          submitData.append(key, formData[key]);
        }
      });

      // Append files
      files.images.forEach(image => {
        submitData.append('images', image);
      });

      if (files.rcBook) submitData.append('rcBook', files.rcBook);
      if (files.registrationCertificate) submitData.append('registrationCertificate', files.registrationCertificate);
      if (files.insuranceCertificate) submitData.append('insuranceCertificate', files.insuranceCertificate);
      if (files.pollutionCertificate) submitData.append('pollutionCertificate', files.pollutionCertificate);

      await axios.post('/api/cars', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const successMessage = user?.role === 'admin' 
        ? 'Vehicle added successfully and is now live! 🎉'
        : 'Vehicle submitted successfully! It will be reviewed by admin before going live. 🎉';
      
      toast.success(successMessage);
      
      // Navigate to appropriate page based on user role
      if (user?.role === 'admin') {
        navigate('/admin/cars');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Add vehicle error:', error);
      toast.error(error.response?.data?.message || 'Failed to submit vehicle. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-vehicle-page">
      <div className="container">
        <div className="add-vehicle-header">
          <h1>🚗 Add Your Vehicle</h1>
          <p>List your vehicle and start earning ₹200 per booking!</p>
        </div>

        <form onSubmit={handleSubmit} className="add-vehicle-form">
          <div className="form-sections-grid">
            {/* Basic Details */}
            <div className="form-section">
              <h3>🔧 Vehicle Details</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Vehicle Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., Innova Crysta"
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Brand *</label>
                  <input
                    type="text"
                    name="brand"
                    value={formData.brand}
                    onChange={handleChange}
                    placeholder="e.g., Toyota"
                    className="form-control"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Model *</label>
                  <input
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleChange}
                    placeholder="e.g., Crysta"
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Year *</label>
                  <input
                    type="number"
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    min="2000"
                    max={new Date().getFullYear()}
                    className="form-control"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Vehicle Type *</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="form-control"
                    required
                  >
                    {carTypes.map(type => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Seating Capacity *</label>
                  <input
                    type="number"
                    name="seats"
                    value={formData.seats}
                    onChange={handleChange}
                    min="2"
                    max="12"
                    className="form-control"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Transmission *</label>
                  <select
                    name="transmission"
                    value={formData.transmission}
                    onChange={handleChange}
                    className="form-control"
                    required
                  >
                    <option value="manual">Manual</option>
                    <option value="automatic">Automatic</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Fuel Type *</label>
                  <select
                    name="fuelType"
                    value={formData.fuelType}
                    onChange={handleChange}
                    className="form-control"
                    required
                  >
                    {fuelTypes.map(fuel => (
                      <option key={fuel} value={fuel}>
                        {fuel.charAt(0).toUpperCase() + fuel.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Registration Number *</label>
                <input
                  type="text"
                  name="registrationNumber"
                  value={formData.registrationNumber}
                  onChange={handleChange}
                  placeholder="e.g., TN01AB1234"
                  className="form-control"
                  required
                />
              </div>
            </div>

            {/* Pricing & Location */}
            <div className="form-section">
              <h3>💰 Pricing & Location</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Price Per Day (₹) *</label>
                  <input
                    type="number"
                    name="pricePerDay"
                    value={formData.pricePerDay}
                    onChange={handleChange}
                    min="500"
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Price Per KM (₹) *</label>
                  <input
                    type="number"
                    name="pricePerKm"
                    value={formData.pricePerKm}
                    onChange={handleChange}
                    min="5"
                    className="form-control"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>State *</label>
                  <select
                    name="location.state"
                    value={formData.location.state}
                    onChange={handleChange}
                    className="form-control"
                    required
                  >
                    <option value="">Select State</option>
                    {southIndianStates.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>City *</label>
                  <input
                    type="text"
                    name="location.city"
                    value={formData.location.city}
                    onChange={handleChange}
                    placeholder="Enter city"
                    className="form-control"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>District</label>
                  <input
                    type="text"
                    name="location.district"
                    value={formData.location.district}
                    onChange={handleChange}
                    placeholder="Enter district"
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>Address</label>
                  <input
                    type="text"
                    name="location.address"
                    value={formData.location.address}
                    onChange={handleChange}
                    placeholder="Full address"
                    className="form-control"
                  />
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="form-section">
              <h3>⭐ Features</h3>
              <div className="features-grid">
                {commonFeatures.map(feature => (
                  <label key={feature} className="feature-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.features.includes(feature)}
                      onChange={() => handleFeatureChange(feature)}
                    />
                    <span>{feature}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Insurance Details */}
            <div className="form-section">
              <h3>🛡️ Insurance Details</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Insurance Provider</label>
                  <input
                    type="text"
                    name="insuranceDetails.provider"
                    value={formData.insuranceDetails.provider}
                    onChange={handleChange}
                    placeholder="e.g., HDFC ERGO"
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>Policy Number</label>
                  <input
                    type="text"
                    name="insuranceDetails.policyNumber"
                    value={formData.insuranceDetails.policyNumber}
                    onChange={handleChange}
                    placeholder="Policy number"
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Insurance Expiry Date</label>
                <input
                  type="date"
                  name="insuranceDetails.expiryDate"
                  value={formData.insuranceDetails.expiryDate}
                  onChange={handleChange}
                  className="form-control"
                />
              </div>
            </div>

            {/* Documents & Images */}
            <div className="form-section form-section-full">
              <div>
                <h3>📄 Documents</h3>
                <div className="documents-grid">
                  <div className="form-group">
                    <label>RC Book {user?.role === 'admin' ? '(Image)' : '* (Image)'}</label>
                    <input
                      type="file"
                      name="rcBook"
                      onChange={handleFileChange}
                      accept="image/*"
                      className="form-control"
                      required={user?.role !== 'admin'}
                    />
                  </div>

                  <div className="form-group">
                    <label>Registration Certificate {user?.role === 'admin' ? '(Image)' : '* (Image)'}</label>
                    <input
                      type="file"
                      name="registrationCertificate"
                      onChange={handleFileChange}
                      accept="image/*"
                      className="form-control"
                      required={user?.role !== 'admin'}
                    />
                  </div>

                  <div className="form-group">
                    <label>Insurance Certificate (Image)</label>
                    <input
                      type="file"
                      name="insuranceCertificate"
                      onChange={handleFileChange}
                      accept="image/*"
                      className="form-control"
                    />
                  </div>

                  <div className="form-group">
                    <label>Pollution Certificate (Image)</label>
                    <input
                      type="file"
                      name="pollutionCertificate"
                      onChange={handleFileChange}
                      accept="image/*"
                      className="form-control"
                    />
                  </div>
                </div>
              </div>

              <div className="images-section">
                <h3>📸 Vehicle Images</h3>
                <div className="form-group">
                  <label>Upload Vehicle Photos * (Multiple images allowed)</label>
                  <input
                    type="file"
                    name="images"
                    onChange={handleFileChange}
                    accept="image/*"
                    multiple
                    className="form-control"
                    required
                  />
                  <small>Upload clear photos of your vehicle from different angles</small>
                </div>
              </div>
            </div>
          </div>



          <button 
            type="submit" 
            className="btn btn-primary btn-lg w-100"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Submitting Vehicle...
              </>
            ) : (
              '🚗 ' + (user?.role === 'admin' ? 'Add Vehicle' : 'Submit Vehicle for Approval')
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddVehicle;