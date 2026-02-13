const MaintenanceAlert = require('../models/maintenance.js');
const Car = require('../models/car.js');

// Predict maintenance based on mileage and usage
exports.predictMaintenance = async (req, res) => {
  try {
    const { carId } = req.params;
    const car = await Car.findById(carId);
    
    if (!car) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    const predictions = [];
    const currentMileage = car.mileage || 0;

    // Oil change every 5000 miles
    if (currentMileage % 5000 > 4000) {
      predictions.push({
        alertType: 'oil_change',
        severity: 'medium',
        predictedDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        mileage: Math.ceil(currentMileage / 5000) * 5000,
        description: 'Oil change recommended'
      });
    }

    // Tire rotation every 7500 miles
    if (currentMileage % 7500 > 6500) {
      predictions.push({
        alertType: 'tire_rotation',
        severity: 'low',
        predictedDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        mileage: Math.ceil(currentMileage / 7500) * 7500,
        description: 'Tire rotation recommended'
      });
    }

    res.json({ success: true, predictions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get maintenance alerts for owner
exports.getMaintenanceAlerts = async (req, res) => {
  try {
    const alerts = await MaintenanceAlert.find({ ownerId: req.user._id })
      .populate('carId', 'brand model year')
      .sort({ predictedDate: 1 });

    res.json({ success: true, alerts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create maintenance alert
exports.createMaintenanceAlert = async (req, res) => {
  try {
    const alert = await MaintenanceAlert.create({
      ...req.body,
      ownerId: req.user._id
    });

    res.json({ success: true, alert });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update maintenance alert status
exports.updateMaintenanceStatus = async (req, res) => {
  try {
    const { alertId } = req.params;
    const { status, notes } = req.body;

    const alert = await MaintenanceAlert.findByIdAndUpdate(
      alertId,
      { 
        status, 
        notes,
        ...(status === 'completed' && { completedAt: new Date() })
      },
      { new: true }
    );

    res.json({ success: true, alert });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
