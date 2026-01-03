import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import './Cars.css';

const Cars = () => {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    city: '',
    state: '',
    type: '',
    minPrice: '',
    maxPrice: ''
  });

  const carsPerPage = 4;
  const carTypes = ['sedan', 'suv', 'hatchback', 'luxury', 'economy'];
  const southIndianStates = ['Tamil Nadu', 'Karnataka', 'Kerala', 'Andhra Pradesh', 'Telangana'];

  useEffect(() => {
    const loadCars = async () => {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams();
        
        Object.entries(filters).forEach(([key, value]) => {
          if (value) queryParams.append(key, value);
        });

        const response = await axios.get(`/.netlify/functions/cars?${queryParams}`);
        setCars(response.data);
        setCurrentPage(1); // Reset to first page when filters change
      } catch (error) {
        console.error('Error fetching cars:', error);
        toast.error('Failed to load cars. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadCars();
  }, [filters]);

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const clearFilters = () => {
    setFilters({
      city: '',
      state: '',
      type: '',
      minPrice: '',
      maxPrice: ''
    });
  };

  // Pagination logic
  const totalPages = Math.ceil(cars.length / carsPerPage);
  const startIndex = (currentPage - 1) * carsPerPage;
  const endIndex = startIndex + carsPerPage;
  const currentCars = cars.slice(startIndex, endIndex);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Scroll to top of cars section
    document.querySelector('.cars-section')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Previous button
    if (currentPage > 1) {
      pages.push(
        <button
          key="prev"
          onClick={() => handlePageChange(currentPage - 1)}
          className="pagination-btn pagination-prev"
        >
          ← Previous
        </button>
      );
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`pagination-btn ${currentPage === i ? 'active' : ''}`}
        >
          {i}
        </button>
      );
    }

    // Next button
    if (currentPage < totalPages) {
      pages.push(
        <button
          key="next"
          onClick={() => handlePageChange(currentPage + 1)}
          className="pagination-btn pagination-next"
        >
          Next →
        </button>
      );
    }

    return <div className="pagination">{pages}</div>;
  };

  if (loading) {
    return (
      <div className="cars-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading amazing cars for you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cars-page">
      <div className="cars-header">
        <div className="container">
          <h1>🚗 Choose Your Perfect Ride</h1>
        </div>
      </div>

      <div className="container">
        <div className="cars-content">
          {/* Filters */}
          <div className="filters-section">
            <div className="filters-header">
              <h3>🔍 Find Your Car</h3>
              <button onClick={clearFilters} className="btn btn-secondary btn-sm">
                Clear All
              </button>
            </div>
            
            <div className="filters-grid">
              <div className="filter-group">
                <label>🌴 State</label>
                <select
                  name="state"
                  value={filters.state}
                  onChange={handleFilterChange}
                  className="form-control"
                >
                  <option value="">All States</option>
                  {southIndianStates.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>🏙️ City</label>
                <input
                  type="text"
                  name="city"
                  value={filters.city}
                  onChange={handleFilterChange}
                  placeholder="Enter city name"
                  className="form-control"
                />
              </div>

              <div className="filter-group">
                <label>🚙 Car Type</label>
                <select
                  name="type"
                  value={filters.type}
                  onChange={handleFilterChange}
                  className="form-control"
                >
                  <option value="">All Types</option>
                  {carTypes.map(type => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>💰 Min Price (₹/day)</label>
                <input
                  type="number"
                  name="minPrice"
                  value={filters.minPrice}
                  onChange={handleFilterChange}
                  placeholder="Min price"
                  className="form-control"
                />
              </div>

              <div className="filter-group">
                <label>💰 Max Price (₹/day)</label>
                <input
                  type="number"
                  name="maxPrice"
                  value={filters.maxPrice}
                  onChange={handleFilterChange}
                  placeholder="Max price"
                  className="form-control"
                />
              </div>
            </div>
          </div>

          {/* Cars Grid */}
          <div className="cars-section">
            <div className="cars-info">
              <h3>Available Cars ({cars.length})</h3>
              <p>
                Showing {startIndex + 1}-{Math.min(endIndex, cars.length)} of {cars.length} cars
                {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
              </p>
            </div>

            {cars.length === 0 ? (
              <div className="no-cars">
                <div className="no-cars-icon">🚗</div>
                <h3>No cars found</h3>
                <p>Try adjusting your filters to see more options</p>
                <button onClick={clearFilters} className="btn btn-primary">
                  Show All Cars
                </button>
              </div>
            ) : (
              <>
                <div className="cars-grid">
                  {currentCars.map((car) => (
                    <div key={car._id} className="car-card fade-in">
                      <div className="car-image">
                        {car.images && car.images.length > 0 ? (
                          <img src={car.images[0]} alt={car.name} />
                        ) : (
                          <div className="car-placeholder">🚗</div>
                        )}
                        <div className="car-badge">
                          {car.type.charAt(0).toUpperCase() + car.type.slice(1)}
                        </div>
                      </div>

                      <div className="car-content">
                        <div className="car-header">
                          <h3>{car.brand} {car.name}</h3>
                          <p className="car-model">{car.model} ({car.year})</p>
                        </div>

                        <div className="car-specs">
                          <div className="spec">
                            <span className="spec-icon">👥</span>
                            <span>{car.seats} Seats</span>
                          </div>
                          <div className="spec">
                            <span className="spec-icon">⚙️</span>
                            <span>{car.transmission}</span>
                          </div>
                          <div className="spec">
                            <span className="spec-icon">⛽</span>
                            <span>{car.fuelType}</span>
                          </div>
                        </div>

                        <div className="car-location">
                          <span className="location-icon">📍</span>
                          <span>{car.location.city}, {car.location.state}</span>
                        </div>

                        <div className="car-pricing">
                          <div className="price-item">
                            <span className="price-label">Per Day:</span>
                            <span className="price-value">₹{car.pricePerDay.toLocaleString()}</span>
                          </div>
                          <div className="price-item">
                            <span className="price-label">Per KM:</span>
                            <span className="price-value">₹{car.pricePerKm}</span>
                          </div>
                        </div>

                        <div className="car-actions">
                          <Link 
                            to={`/cars/${car._id}`} 
                            className="btn btn-secondary"
                          >
                            View Details
                          </Link>
                          <Link 
                            to={`/booking/${car._id}`} 
                            className="btn btn-primary"
                          >
                            Book Now
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {renderPagination()}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cars;