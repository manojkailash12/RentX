const SupportTicket = require('../models/supportTicket');
const { getNextSequence } = require('../models/counter');
const { sendEmail } = require('../utils/emailService');

// Create support ticket from email
const createSupportTicket = async (req, res) => {
  try {
    const { email, subject, message, priority, category } = req.body;

    if (!email || !subject || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, subject, and message are required' 
      });
    }

    // Generate ticket ID
    const ticketNumber = await getNextSequence('supportTicket');
    const ticketId = `#RXCS${String(ticketNumber).padStart(4, '0')}`;

    // Create ticket
    const ticket = await SupportTicket.create({
      ticketId,
      email,
      subject,
      message,
      priority: priority || 'medium',
      category: category || 'other',
      status: 'open'
    });

    // Send auto-response email
    await sendEmail({
      to: email,
      subject: `Ticket Created: ${ticketId} - RentX Support`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Support Ticket Created - RentX</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background-color: #fff7ed;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: white;
              padding: 30px;
              border-radius: 15px;
              box-shadow: 0 4px 20px rgba(251, 146, 60, 0.15);
              border: 2px solid #fed7aa;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              background: linear-gradient(135deg, #f97316, #ea580c);
              padding: 20px;
              border-radius: 10px;
              margin: -30px -30px 30px -30px;
            }
            .logo {
              font-size: 32px;
              font-weight: bold;
              color: white;
              margin-bottom: 10px;
              text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }
            .ticket-box {
              background: linear-gradient(135deg, #fed7aa, #fdba74);
              padding: 25px;
              text-align: center;
              border-radius: 12px;
              margin: 20px 0;
              border: 2px solid #fb923c;
            }
            .ticket-id {
              font-size: 32px;
              font-weight: bold;
              color: #c2410c;
              margin: 10px 0;
            }
            .message {
              color: #9a3412;
              line-height: 1.6;
              margin-bottom: 20px;
              font-weight: 500;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 2px solid #fed7aa;
              color: #9a3412;
              font-size: 14px;
              background-color: #fff7ed;
              padding: 20px;
              border-radius: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🚗 RentX</div>
              <p style="color: white; margin: 0; font-size: 16px;">Customer Support</p>
            </div>
            
            <div class="ticket-box">
              <p style="margin: 0; color: #c2410c; font-weight: bold; font-size: 16px;">📋 Your Ticket Has Been Created</p>
              <div class="ticket-id">${ticketId}</div>
            </div>
            
            <div class="message">
              <p>Dear Customer,</p>
              <p>Thank you for contacting RentX support. Your ticket has been created successfully.</p>
              <p><strong>Subject:</strong> ${subject}</p>
              <p>Our support team will review your request and respond back to you shortly. You can expect a response via email or phone call.</p>
            </div>
            
            <div class="footer">
              <p style="font-weight: bold; color: #c2410c; font-size: 16px;">🙏 Thank You</p>
              <p><strong>RentX Customer Support</strong></p>
              <p style="margin-top: 15px; font-size: 12px;">📧 This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      ticket: {
        ticketId: ticket.ticketId,
        email: ticket.email,
        subject: ticket.subject,
        status: ticket.status
      }
    });
  } catch (error) {
    console.error('Create support ticket error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all support tickets (admin only)
const getAllSupportTickets = async (req, res) => {
  try {
    const { 
      status, 
      priority, 
      category, 
      assignedTo, 
      search, 
      startDate, 
      endDate,
      page = 1,
      limit = 50
    } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (assignedTo) filter.assignedTo = assignedTo;
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    // Search filter (ticket ID, subject, email, message)
    if (search) {
      filter.$or = [
        { ticketId: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await SupportTicket.countDocuments(filter);

    const tickets = await SupportTicket.find(filter)
      .populate('assignedTo', 'name email image')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      tickets,
      count: tickets.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Get support tickets error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single support ticket
const getSupportTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;

    const ticket = await SupportTicket.findOne({ ticketId })
      .populate('assignedTo', 'name email')
      .populate('responses.respondedBy', 'name email');

    if (!ticket) {
      return res.status(404).json({ 
        success: false, 
        message: 'Ticket not found' 
      });
    }

    res.json({
      success: true,
      ticket
    });
  } catch (error) {
    console.error('Get support ticket error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update support ticket status
const updateSupportTicketStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status, priority, assignedTo } = req.body;

    const updateData = { updatedAt: new Date() };
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (assignedTo) updateData.assignedTo = assignedTo;

    const ticket = await SupportTicket.findOneAndUpdate(
      { ticketId },
      updateData,
      { new: true }
    ).populate('assignedTo', 'name email');

    if (!ticket) {
      return res.status(404).json({ 
        success: false, 
        message: 'Ticket not found' 
      });
    }

    res.json({
      success: true,
      message: 'Ticket updated successfully',
      ticket
    });
  } catch (error) {
    console.error('Update support ticket error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add response to support ticket
const addSupportTicketResponse = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { message } = req.body;
    const adminId = req.user._id;

    if (!message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Response message is required' 
      });
    }

    const ticket = await SupportTicket.findOneAndUpdate(
      { ticketId },
      {
        $push: {
          responses: {
            respondedBy: adminId,
            message,
            timestamp: new Date()
          }
        },
        updatedAt: new Date()
      },
      { new: true }
    ).populate('responses.respondedBy', 'name email');

    if (!ticket) {
      return res.status(404).json({ 
        success: false, 
        message: 'Ticket not found' 
      });
    }

    // Send email notification to customer
    await sendEmail({
      to: ticket.email,
      subject: `Response to ${ticketId} - RentX Support`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; background-color: #fff7ed; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 15px; }
            .header { background: linear-gradient(135deg, #f97316, #ea580c); padding: 20px; border-radius: 10px; text-align: center; color: white; }
            .content { padding: 20px; color: #9a3412; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>🚗 RentX Support</h2>
              <p>Response to Ticket ${ticketId}</p>
            </div>
            <div class="content">
              <p>Dear Customer,</p>
              <p>Our support team has responded to your ticket:</p>
              <div style="background: #fff7ed; padding: 15px; border-left: 4px solid #f97316; margin: 20px 0;">
                <p><strong>Response:</strong></p>
                <p>${message}</p>
              </div>
              <p>If you have any further questions, please reply to this email or contact our support team.</p>
              <p style="margin-top: 20px;"><strong>Thank You,<br>RentX Support Team</strong></p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    res.json({
      success: true,
      message: 'Response added successfully',
      ticket
    });
  } catch (error) {
    console.error('Add support ticket response error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Assign ticket to admin
const assignSupportTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { assignedTo } = req.body;
    const adminId = req.user._id;

    const ticket = await SupportTicket.findOneAndUpdate(
      { ticketId },
      {
        assignedTo,
        assignedAt: new Date(),
        assignedBy: adminId,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('assignedTo', 'name email image')
     .populate('assignedBy', 'name email');

    if (!ticket) {
      return res.status(404).json({ 
        success: false, 
        message: 'Ticket not found' 
      });
    }

    res.json({
      success: true,
      message: 'Ticket assigned successfully',
      ticket
    });
  } catch (error) {
    console.error('Assign support ticket error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add attachment to ticket
const addSupportTicketAttachment = async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    const attachment = {
      filename: req.file.originalname,
      url: req.file.path, // Cloudinary URL
      size: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date()
    };

    const ticket = await SupportTicket.findOneAndUpdate(
      { ticketId },
      {
        $push: { attachments: attachment },
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({ 
        success: false, 
        message: 'Ticket not found' 
      });
    }

    res.json({
      success: true,
      message: 'Attachment added successfully',
      attachment
    });
  } catch (error) {
    console.error('Add attachment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get support ticket analytics
const getSupportTicketAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Total tickets
    const totalTickets = await SupportTicket.countDocuments(dateFilter);

    // Tickets by status
    const ticketsByStatus = await SupportTicket.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Tickets by priority
    const ticketsByPriority = await SupportTicket.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    // Tickets by category
    const ticketsByCategory = await SupportTicket.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    // Tickets by assigned admin
    const ticketsByAdmin = await SupportTicket.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$assignedTo',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'admin'
        }
      },
      { $unwind: { path: '$admin', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          adminName: '$admin.name',
          adminEmail: '$admin.email',
          count: 1
        }
      }
    ]);

    // Average response time (time from creation to first response)
    const ticketsWithResponses = await SupportTicket.find({
      ...dateFilter,
      'responses.0': { $exists: true }
    });

    let totalResponseTime = 0;
    let responseCount = 0;
    ticketsWithResponses.forEach(ticket => {
      if (ticket.responses && ticket.responses.length > 0) {
        const firstResponse = ticket.responses[0];
        const responseTime = new Date(firstResponse.timestamp) - new Date(ticket.createdAt);
        totalResponseTime += responseTime;
        responseCount++;
      }
    });

    const avgResponseTime = responseCount > 0 
      ? Math.round(totalResponseTime / responseCount / (1000 * 60 * 60)) // hours
      : 0;

    // Tickets over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const ticketsOverTime = await SupportTicket.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      analytics: {
        totalTickets,
        openTickets: ticketsByStatus.find(s => s._id === 'open')?.count || 0,
        avgResponseTimeHours: avgResponseTime,
        ticketsByStatus: ticketsByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        ticketsByPriority: ticketsByPriority.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        ticketsByCategory: ticketsByCategory.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        ticketsByAdmin,
        ticketsOverTime
      }
    });
  } catch (error) {
    console.error('Get support analytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createSupportTicket,
  getAllSupportTickets,
  getSupportTicket,
  updateSupportTicketStatus,
  addSupportTicketResponse,
  assignSupportTicket,
  addSupportTicketAttachment,
  getSupportTicketAnalytics
};
