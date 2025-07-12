const SwapRequest = require('../models/SwapRequest');
const User = require('../models/User');
const Chat = require('../models/Chat');

// @desc    Create a new swap request
// @route   POST /api/swaps/request
// @access  Private
const createSwapRequest = async (req, res) => {
  try {
    const { recipient, offeredSkill, requestedSkill, message } = req.body;

    // Check if recipient exists
    const recipientUser = await User.findById(recipient);
    if (!recipientUser) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    // Check if requester has the offered skill
    const requester = await User.findById(req.user._id);
    const hasOfferedSkill = requester.skillsOffered.some(
      skill => skill.name === offeredSkill
    );
    
    if (!hasOfferedSkill) {
      return res.status(400).json({ message: 'You do not have this skill to offer' });
    }

    // Check if recipient has the requested skill
    const recipientHasSkill = recipientUser.skillsOffered.some(
      skill => skill.name === requestedSkill
    );
    
    if (!recipientHasSkill) {
      return res.status(400).json({ message: 'Recipient does not have this skill' });
    }

    // Check for existing pending swap between these users for these skills
    const existingSwap = await SwapRequest.findOne({
      requester: req.user._id,
      recipient,
      offeredSkill,
      requestedSkill,
      status: 'pending'
    });

    if (existingSwap) {
      return res.status(400).json({ message: 'You already have a pending request for this swap' });
    }

    const swapRequest = new SwapRequest({
      requester: req.user._id,
      recipient,
      offeredSkill,
      requestedSkill,
      message
    });

    await swapRequest.save();

    res.status(201).json(swapRequest);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Accept a swap request
// @route   PUT /api/swaps/:id/accept
// @access  Private
const acceptSwapRequest = async (req, res) => {
  try {
    const swapRequest = await SwapRequest.findById(req.params.id)
      .populate('requester recipient');

    if (!swapRequest) {
      return res.status(404).json({ message: 'Swap request not found' });
    }

    // Check if the current user is the recipient
    if (swapRequest.recipient._id.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (swapRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Swap request is not pending' });
    }

    // Create a chat for this swap
    const chat = new Chat({
      participants: [swapRequest.requester._id, swapRequest.recipient._id],
      swapId: swapRequest._id
    });

    await chat.save();

    // Update swap request
    swapRequest.status = 'accepted';
    swapRequest.chat = chat._id;
    await swapRequest.save();

    // Emit socket event to notify requester
    req.app.get('io').to(swapRequest.requester._id.toString()).emit('swapAccepted', {
      swapId: swapRequest._id,
      chatId: chat._id
    });

    res.json({
      message: 'Swap request accepted',
      swapRequest,
      chat
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Similar methods for reject, cancel, complete swaps

// @desc    Get user's pending swap requests
// @route   GET /api/swaps/pending
// @access  Private
const getPendingSwaps = async (req, res) => {
  try {
    const pendingSwaps = await SwapRequest.find({
      $or: [
        { requester: req.user._id, status: 'pending' },
        { recipient: req.user._id, status: 'pending' }
      ]
    })
    .populate('requester recipient', 'name profilePhoto')
    .sort({ createdAt: -1 });

    res.json(pendingSwaps);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Similar methods for active swaps, swap history

module.exports = {
  createSwapRequest,
  acceptSwapRequest,
  // rejectSwapRequest,
  // cancelSwapRequest,
  // completeSwap,
  getPendingSwaps,
  // getActiveSwaps,
  // getSwapHistory
};