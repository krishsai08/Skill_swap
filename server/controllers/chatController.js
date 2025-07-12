const Chat = require('../models/Chat');
const User = require('../models/User');

// @desc    Get all chats for user
// @route   GET /api/chat
// @access  Private
const getUserChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user._id
    })
    .populate('participants', 'name profilePhoto')
    .populate('swapId')
    .sort({ updatedAt: -1 });

    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get specific chat
// @route   GET /api/chat/:id
// @access  Private
const getChat = async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      participants: req.user._id
    })
    .populate('participants', 'name profilePhoto')
    .populate('swapId')
    .populate('messages.sender', 'name profilePhoto');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Send message in chat
// @route   POST /api/chat/:id/message
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const { content } = req.body;

    const chat = await Chat.findOne({
      _id: req.params.id,
      participants: req.user._id
    });

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const newMessage = {
      sender: req.user._id,
      content
    };

    chat.messages.push(newMessage);
    await chat.save();

    // Emit socket event to all participants
    req.app.get('io').to(chat._id.toString()).emit('newMessage', {
      ...newMessage,
      _id: chat.messages[chat.messages.length - 1]._id,
      sender: {
        _id: req.user._id,
        name: req.user.name,
        profilePhoto: req.user.profilePhoto
      }
    });

    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getUserChats,
  getChat,
  sendMessage
};