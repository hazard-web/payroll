const mongoose = require('mongoose');

const assignedTaskSchema = new mongoose.Schema(
  {
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    projectUrl: {
      type: String,
      default: ''
    },
    attachment: {
      fileName: { type: String, default: '' },
      originalName: { type: String, default: '' },
      url: { type: String, default: '' }
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium'
    },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'In Progress', 'Completed'],
      default: 'Pending',
      index: true
    },
    dueDate: {
      type: Date
    },
    assignedDate: {
      type: Date,
      default: Date.now
    },
    acceptedAt: {
      type: Date
    },
    startedAt: {
      type: Date
    },
    completedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

assignedTaskSchema.index({ staff: 1, status: 1 });

module.exports = mongoose.model('AssignedTask', assignedTaskSchema);
