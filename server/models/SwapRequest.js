const mongoose = require('mongoose');

const swapRequestSchema = new mongoose.Schema({
  requester: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  recipient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  offeredSkill: { 
    type: String, 
    required: true 
  },
  requestedSkill: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected', 'cancelled', 'completed'], 
    default: 'pending' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  message: { 
    type: String 
  },
  chat: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Chat' 
  }
}, {
  timestamps: true
});

// Update the updatedAt field before saving
swapRequestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('SwapRequest', swapRequestSchema);