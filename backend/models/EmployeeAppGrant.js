const mongoose = require('mongoose')

const employeeAppGrantSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    appId: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    color: { type: String, trim: true, default: '#1A5F4A' },
    iconUrl: { type: String, trim: true, default: '' },
    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    source: {
      type: String,
      enum: ['manual', 'google'],
      default: 'manual',
      index: true,
    },
    googleClientId: { type: String, trim: true, default: '' },
    googleScopes: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['active', 'revoked'],
      default: 'active',
    },
  },
  { timestamps: true },
)

employeeAppGrantSchema.index(
  { organizationId: 1, email: 1, appId: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } },
)

module.exports = mongoose.model('EmployeeAppGrant', employeeAppGrantSchema)
