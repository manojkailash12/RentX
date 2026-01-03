import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import './Cars.css';

const CarDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchCarDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/cars/${id}`);
        setCar(response.data);
      } catch (error) {
        console.error('Error fetching car details:', error);
        toast.error('Failed to load car details');
        navigate('/cars');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCarDetails();
    }
  }, [id, navigate]);

  const nextImage = () => {
    if (car?.images?.length > 1) {
      setCurrentImageIndex((prev) => 
        prev === car.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (car?.images?.length > 1) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? car.images.length - 1 : prev - 1
      );
    }
  };

  if (loading) {
    return (
      <div className="cars-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading car details...</p>
        </div>
      </div>
    );
  }

  if (!car) {
    return (
      <div className="cars-page">
        <div className="container">
          <div style={{ textAlign: 'center', padding: '100px 20px' }}>
            <h2>Car not found</h2>
            <p>The car you're looking for doesn't exist or has been removed.</p>
            <Link to="/cars" className="btn btn-primary">
              Back to Cars
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cars-page">
      <div className="cars-header">
        <div className="container">
          <h1>🚗 {car.brand} {car.name}</h1>
          <p>{car.model} ({car.year}) - Premium Car Rental</p>
        </div>
      </div>

      <div className="container">
        <div className="car-details-content">
          {/* Back Button */}
          <div className="back-button-container">
            <Link to="/cars" className="btn btn-secondary">
              ← Back to Cars
            </Link>
          </div>

          <div className="car-details-grid">
            {/* Car Images */}
            <div className="car-images-section">
              <div className="main-image-container">
                {car.images && car.images.length > 0 ? (
                  <>
                    <img 
                      src={car.images[currentImageIndex]} 
                      alt={`${car.brand} ${car.name}`}
                      className="main-car-image"
                    />
                    {car.images.length > 1 && (
                      <>
                        <button className="image-nav prev" onClick={prevImage}>
                          ‹
                        </button>
                        <button className="image-nav next" onClick={nextImage}>
                          ›
                        </button>
                        <div className="image-indicators">
                          {car.images.map((_, index) => (
                            <button
                              key={index}
                              className={`indicator ${index === currentImageIndex ? 'active' : ''}`}
                              onClick={() => setCurrentImageIndex(index)}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="no-image-placeholder">
                    <span>🚗</span>
                    <p>No images available</p>
                  </div>
                )}
              </div>

              {/* Thumbnail Images */}
              {car.images && car.images.length > 1 && (
                <div className="thumbnail-images">
                  {car.images.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`${car.brand} ${car.name} ${index + 1}`}
                      className={`thumbnail ${index === currentImageIndex ? 'active' : ''}`}
                      onClick={() => setCurrentImageIndex(index)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Car Information */}
            <div className="car-info-section">
              <div className="car-header-info">
                <h2>{car.brand} {car.name}</h2>
                <p className="car-model">{car.model} ({car.year})</p>
                <div className="car-type-badge">
                  {car.type?.charAt(0).toUpperCase() + car.type?.slice(1)}
                </div>
              </div>

              {/* Car Specifications */}
              <div className="car-specs-detailed">
                <h3>🔧 Specifications</h3>
                <div className="specs-grid">
                  <div className="spec-item">
                    <span className="spec-icon">👥</span>
                    <div>
                      <strong>Seating</strong>
                      <p>{car.seats} Passengers</p>
                    </div>
                  </div>
                  <div className="spec-item">
                    <span className="spec-icon">⚙️</span>
                    <div>
                      <strong>Transmission</strong>
                      <p>{car.transmission}</p>
                    </div>
                  </div>
                  <div className="spec-item">
                    <span className="spec-icon">⛽</span>
                    <div>
                      <strong>Fuel Type</strong>
                      <p>{car.fuelType}</p>
                    </div>
                  </div>
                  <div className="spec-item">
                    <span className="spec-icon">🏷️</span>
                    <div>
                      <strong>Registration</strong>
                      <p>{car.registrationNumber || car.registeration_number || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="car-location-detailed">
                <h3>📍 Location</h3>
                <p>{car.location?.city}, {car.location?.state}</p>
                <p className="location-address">{car.location?.address}</p>
              </div>

              {/* Pricing */}
              <div className="car-pricing-detailed">
                <h3>💰 Pricing</h3>
                <div className="pricing-grid">
                  <div className="price-card">
                    <span className="price-label">Per Day</span>
                    <span className="price-value">
                      ₹{Number(car.pricePerDay || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="price-card">
                    <span className="price-label">Per KM</span>
                    <span className="price-value">
                      ₹{Number(car.pricePerKm || 0)}
                    </span>
                  </div>
                </div>
                {(!car.pricePerDay && !car.pricePerKm) && (
                  <p style={{ marginTop: '10px', color: '#e74c3c', fontSize: '14px', fontWeight: 'bold' }}>
                    ⚠️ Pricing information not available. Please contact us for rates.
                  </p>
                )}
              </div>

              {/* Features */}
              {car.features && car.features.length > 0 && (
                <div className="car-features">
                  <h3>✨ Features</h3>
                  <div className="features-list">
                    {car.features.map((feature, index) => (
                      <span key={index} className="feature-tag">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Availability Status */}
              <div className="availability-status">
                <h3>📅 Availability</h3>
                <div className={`status-badge ${car.availability ? 'available' : 'unavailable'}`}>
                  {car.availability ? '✅ Available' : '❌ Currently Unavailable'}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="car-actions-detailed">
                {car.availability ? (
                  <Link 
                    to={`/booking/${car._id}`} 
                    className="btn btn-primary btn-large"
                  >
                    🚗 Book This Car
                  </Link>
                ) : (
                  <button className="btn btn-disabled btn-large" disabled>
                    Currently Unavailable
                  </button>
                )}
                <Link 
                  to="/cars" 
                  className="btn btn-secondary btn-large"
                >
                  Browse Other Cars
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarDetails;