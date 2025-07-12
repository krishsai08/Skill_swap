const User = require('../models/User');
const SwapRequest = require('../models/SwapRequest');

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Public/Private
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -isAdmin -isBanned')
      .populate('skillsOffered skillsWanted');

    if (!user || (user.isPublic === false && req.user._id.toString() !== user._id.toString())) {
      return res.status(404).json({ message: 'User not found or profile is private' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/:id
// @access  Private
const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the user is updating their own profile
    if (user._id.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const { name, location, isPublic, availability } = req.body;

    user.name = name || user.name;
    user.location = location || user.location;
    user.isPublic = isPublic !== undefined ? isPublic : user.isPublic;
    
    if (availability) {
      user.availability = {
        weekdays: availability.weekdays || user.availability.weekdays,
        weekends: availability.weekends || user.availability.weekends,
        evenings: availability.evenings || user.availability.evenings,
        custom: availability.custom || user.availability.custom
      };
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      location: updatedUser.location,
      isPublic: updatedUser.isPublic,
      availability: updatedUser.availability
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add a skill to offered skills
// @route   POST /api/users/skills/offered
// @access  Private
const addOfferedSkill = async (req, res) => {
  try {
    const { name, description, category } = req.body;

    const user = await User.findById(req.user._id);

    // Check if skill already exists
    const skillExists = user.skillsOffered.some(
      skill => skill.name.toLowerCase() === name.toLowerCase()
    );

    if (skillExists) {
      return res.status(400).json({ message: 'Skill already exists' });
    }

    user.skillsOffered.push({ name, description, category });
    await user.save();

    res.status(201).json(user.skillsOffered);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Remove a skill from offered skills
// @route   DELETE /api/users/skills/offered/:skillId
// @access  Private
const removeOfferedSkill = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Find the index of the skill to remove
    const skillIndex = user.skillsOffered.findIndex(
      skill => skill._id.toString() === req.params.skillId
    );

    if (skillIndex === -1) {
      return res.status(404).json({ message: 'Skill not found' });
    }

    user.skillsOffered.splice(skillIndex, 1);
    await user.save();

    res.json(user.skillsOffered);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Similar methods for wanted skills (addWantedSkill, removeWantedSkill)

module.exports = {
  getUserById,
  updateUser,
  addOfferedSkill,
  removeOfferedSkill,
  // addWantedSkill,
  // removeWantedSkill
};