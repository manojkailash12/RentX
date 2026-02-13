const Training = require('../models/training');
const TrainingEnrollment = require('../models/trainingEnrollment');
const Employee = require('../models/employee');

// Create training
exports.createTraining = async (req, res) => {
  try {
    const adminId = req.user._id;
    const trainingData = {
      ...req.body,
      createdBy: adminId
    };

    const training = await Training.create(trainingData);

    res.status(201).json({
      success: true,
      message: 'Training created successfully',
      training
    });
  } catch (error) {
    console.error('Create training error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all trainings
exports.getTrainings = async (req, res) => {
  try {
    const { category, status } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;

    const trainings = await Training.find(filter)
      .populate('createdBy', 'name email')
      .sort({ 'schedule.startDate': -1 });

    res.json({
      success: true,
      trainings,
      count: trainings.length
    });
  } catch (error) {
    console.error('Get trainings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update training
exports.updateTraining = async (req, res) => {
  try {
    const { trainingId } = req.params;
    const updates = req.body;

    const training = await Training.findByIdAndUpdate(
      trainingId,
      updates,
      { new: true }
    ).populate('createdBy', 'name email');

    if (!training) {
      return res.status(404).json({
        success: false,
        message: 'Training not found'
      });
    }

    res.json({
      success: true,
      message: 'Training updated successfully',
      training
    });
  } catch (error) {
    console.error('Update training error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Enroll employee in training
exports.enrollEmployee = async (req, res) => {
  try {
    const { trainingId, employeeId } = req.body;

    const training = await Training.findById(trainingId);
    if (!training) {
      return res.status(404).json({
        success: false,
        message: 'Training not found'
      });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Check if already enrolled
    const existingEnrollment = await TrainingEnrollment.findOne({
      trainingId,
      employeeId
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'Employee already enrolled in this training'
      });
    }

    // Check max participants
    if (training.maxParticipants) {
      const enrollmentCount = await TrainingEnrollment.countDocuments({
        trainingId,
        status: { $in: ['enrolled', 'in-progress'] }
      });

      if (enrollmentCount >= training.maxParticipants) {
        return res.status(400).json({
          success: false,
          message: 'Training is full'
        });
      }
    }

    const enrollment = await TrainingEnrollment.create({
      trainingId,
      employeeId
    });

    const populatedEnrollment = await TrainingEnrollment.findById(enrollment._id)
      .populate('trainingId')
      .populate({
        path: 'employeeId',
        populate: { path: 'userId', select: 'name email' }
      });

    res.status(201).json({
      success: true,
      message: 'Employee enrolled successfully',
      enrollment: populatedEnrollment
    });
  } catch (error) {
    console.error('Enroll employee error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get enrollments
exports.getEnrollments = async (req, res) => {
  try {
    const { trainingId, employeeId, status } = req.query;

    const filter = {};
    if (trainingId) filter.trainingId = trainingId;
    if (status) filter.status = status;

    if (employeeId) {
      const employee = await Employee.findOne({ employeeId });
      if (employee) {
        filter.employeeId = employee._id;
      }
    }

    const enrollments = await TrainingEnrollment.find(filter)
      .populate('trainingId')
      .populate({
        path: 'employeeId',
        populate: { path: 'userId', select: 'name email' }
      })
      .sort({ enrolledAt: -1 });

    res.json({
      success: true,
      enrollments,
      count: enrollments.length
    });
  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark attendance
exports.markAttendance = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { sessionDate, present, remarks } = req.body;

    const enrollment = await TrainingEnrollment.findById(enrollmentId);
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    enrollment.attendance.push({
      sessionDate: new Date(sessionDate),
      present,
      remarks
    });

    if (enrollment.status === 'enrolled') {
      enrollment.status = 'in-progress';
    }

    await enrollment.save();

    res.json({
      success: true,
      message: 'Attendance marked successfully',
      enrollment
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Submit assessment
exports.submitAssessment = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { score, maxScore, feedback } = req.body;

    const enrollment = await TrainingEnrollment.findById(enrollmentId)
      .populate('trainingId');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    const passed = (score / maxScore) >= 0.7; // 70% passing score

    enrollment.assessment = {
      score,
      maxScore,
      passed,
      attemptDate: new Date(),
      feedback
    };

    if (passed) {
      enrollment.status = 'completed';
      enrollment.completedAt = new Date();

      // Issue certification if applicable
      if (enrollment.trainingId.certification.provided) {
        const certNumber = `CERT-${Date.now()}-${enrollment.employeeId}`;
        const issuedDate = new Date();
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + enrollment.trainingId.certification.validityPeriod);

        enrollment.certification = {
          issued: true,
          certificateNumber: certNumber,
          issuedDate,
          expiryDate
        };
      }
    } else {
      enrollment.status = 'failed';
    }

    await enrollment.save();

    res.json({
      success: true,
      message: passed ? 'Assessment passed' : 'Assessment failed',
      enrollment
    });
  } catch (error) {
    console.error('Submit assessment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Submit feedback
exports.submitFeedback = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { rating, comments } = req.body;

    const enrollment = await TrainingEnrollment.findById(enrollmentId);
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    enrollment.feedback = {
      rating,
      comments,
      submittedAt: new Date()
    };

    await enrollment.save();

    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      enrollment
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get employee certifications
exports.getEmployeeCertifications = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const certifications = await TrainingEnrollment.find({
      employeeId: employee._id,
      'certification.issued': true
    })
      .populate('trainingId')
      .sort({ 'certification.issuedDate': -1 });

    res.json({
      success: true,
      certifications,
      count: certifications.length
    });
  } catch (error) {
    console.error('Get certifications error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get training analytics
exports.getTrainingAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.enrolledAt = {};
      if (startDate) filter.enrolledAt.$gte = new Date(startDate);
      if (endDate) filter.enrolledAt.$lte = new Date(endDate);
    }

    const enrollments = await TrainingEnrollment.find(filter)
      .populate('trainingId');

    const analytics = {
      totalEnrollments: enrollments.length,
      completed: enrollments.filter(e => e.status === 'completed').length,
      inProgress: enrollments.filter(e => e.status === 'in-progress').length,
      failed: enrollments.filter(e => e.status === 'failed').length,
      dropped: enrollments.filter(e => e.status === 'dropped').length,
      certificationIssued: enrollments.filter(e => e.certification.issued).length,
      averageScore: 0,
      categoryBreakdown: {},
      completionRate: 0
    };

    // Calculate average score
    const assessedEnrollments = enrollments.filter(e => e.assessment.score);
    if (assessedEnrollments.length > 0) {
      const totalScore = assessedEnrollments.reduce((sum, e) => {
        return sum + (e.assessment.score / e.assessment.maxScore) * 100;
      }, 0);
      analytics.averageScore = Math.round(totalScore / assessedEnrollments.length);
    }

    // Category breakdown
    enrollments.forEach(e => {
      if (e.trainingId) {
        const category = e.trainingId.category;
        if (!analytics.categoryBreakdown[category]) {
          analytics.categoryBreakdown[category] = 0;
        }
        analytics.categoryBreakdown[category]++;
      }
    });

    // Completion rate
    if (enrollments.length > 0) {
      analytics.completionRate = Math.round((analytics.completed / enrollments.length) * 100);
    }

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('Get training analytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = exports;
