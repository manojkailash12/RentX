const SmartContract = require('../models/smartContract.js');
const Booking = require('../models/booking.js');
const crypto = require('crypto');

// Create smart contract for booking
exports.createSmartContract = async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId)
      .populate('carId')
      .populate('userId');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Check if contract already exists
    const existingContract = await SmartContract.findOne({ bookingId });
    if (existingContract) {
      return res.json({ success: true, contract: existingContract });
    }

    // Generate mock contract address and transaction hash
    const contractAddress = '0x' + crypto.randomBytes(20).toString('hex');
    const transactionHash = '0x' + crypto.randomBytes(32).toString('hex');
    const blockNumber = Math.floor(Math.random() * 1000000) + 15000000;

    const contract = await SmartContract.create({
      bookingId,
      contractAddress,
      transactionHash,
      blockNumber,
      network: 'polygon',
      terms: {
        rentalPeriod: {
          start: booking.startDate,
          end: booking.endDate
        },
        totalAmount: booking.totalAmount,
        deposit: booking.totalAmount * 0.2, // 20% deposit
        penalties: {
          lateFee: 50,
          damageFee: 0,
          cancellationFee: booking.totalAmount * 0.1
        },
        conditions: [
          'Vehicle must be returned on time',
          'Vehicle must be returned in same condition',
          'No smoking in vehicle',
          'Mileage limit: 200 miles per day',
          'Fuel tank must be full on return'
        ]
      },
      status: 'active',
      milestones: [
        {
          name: 'Contract Created',
          completed: true,
          timestamp: new Date(),
          transactionHash
        },
        {
          name: 'Deposit Paid',
          completed: false,
          timestamp: null,
          transactionHash: null
        },
        {
          name: 'Vehicle Picked Up',
          completed: false,
          timestamp: null,
          transactionHash: null
        },
        {
          name: 'Vehicle Returned',
          completed: false,
          timestamp: null,
          transactionHash: null
        },
        {
          name: 'Final Payment',
          completed: false,
          timestamp: null,
          transactionHash: null
        }
      ]
    });

    res.json({ success: true, contract });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get smart contract details
exports.getSmartContract = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const contract = await SmartContract.findOne({ bookingId })
      .populate({
        path: 'bookingId',
        populate: { path: 'carId userId' }
      });

    if (!contract) {
      return res.status(404).json({ success: false, message: 'Contract not found' });
    }

    res.json({ success: true, contract });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update milestone
exports.updateMilestone = async (req, res) => {
  try {
    const { contractId, milestoneName } = req.body;

    const contract = await SmartContract.findById(contractId);

    if (!contract) {
      return res.status(404).json({ success: false, message: 'Contract not found' });
    }

    const milestone = contract.milestones.find(m => m.name === milestoneName);

    if (milestone) {
      milestone.completed = true;
      milestone.timestamp = new Date();
      milestone.transactionHash = '0x' + crypto.randomBytes(32).toString('hex');
      await contract.save();
    }

    res.json({ success: true, contract });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add payment to contract
exports.addPayment = async (req, res) => {
  try {
    const { contractId, amount, type } = req.body;

    const contract = await SmartContract.findById(contractId);

    if (!contract) {
      return res.status(404).json({ success: false, message: 'Contract not found' });
    }

    contract.payments.push({
      amount,
      type,
      status: 'completed',
      transactionHash: '0x' + crypto.randomBytes(32).toString('hex'),
      timestamp: new Date()
    });

    await contract.save();

    res.json({ success: true, contract });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// File dispute
exports.fileDispute = async (req, res) => {
  try {
    const { contractId, reason } = req.body;

    const contract = await SmartContract.findById(contractId);

    if (!contract) {
      return res.status(404).json({ success: false, message: 'Contract not found' });
    }

    contract.disputes.push({
      reason,
      filedBy: req.user._id,
      status: 'pending',
      resolution: null,
      resolvedAt: null
    });

    contract.status = 'disputed';
    await contract.save();

    res.json({ success: true, contract });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Resolve dispute (Admin)
exports.resolveDispute = async (req, res) => {
  try {
    const { contractId, disputeIndex, resolution } = req.body;

    const contract = await SmartContract.findById(contractId);

    if (!contract) {
      return res.status(404).json({ success: false, message: 'Contract not found' });
    }

    if (contract.disputes[disputeIndex]) {
      contract.disputes[disputeIndex].status = 'resolved';
      contract.disputes[disputeIndex].resolution = resolution;
      contract.disputes[disputeIndex].resolvedAt = new Date();
      
      // Check if all disputes are resolved
      const allResolved = contract.disputes.every(d => d.status === 'resolved');
      if (allResolved) {
        contract.status = 'completed';
      }

      await contract.save();
    }

    res.json({ success: true, contract });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Complete contract
exports.completeContract = async (req, res) => {
  try {
    const { contractId } = req.params;

    const contract = await SmartContract.findById(contractId);

    if (!contract) {
      return res.status(404).json({ success: false, message: 'Contract not found' });
    }

    contract.status = 'completed';
    await contract.save();

    res.json({ success: true, contract });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all contracts (Admin)
exports.getAllContracts = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status) filter.status = status;

    const contracts = await SmartContract.find(filter)
      .populate({
        path: 'bookingId',
        populate: { path: 'carId userId' }
      })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, contracts, count: contracts.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get contract statistics
exports.getContractStatistics = async (req, res) => {
  try {
    const stats = await SmartContract.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$terms.totalAmount' }
        }
      }
    ]);

    const disputeStats = await SmartContract.aggregate([
      { $unwind: '$disputes' },
      {
        $group: {
          _id: '$disputes.status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({ success: true, stats, disputeStats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
