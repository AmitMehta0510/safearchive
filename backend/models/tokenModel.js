const mongoose = require('mongoose');
const { Schema } = mongoose;

const PersonalAccessTokenSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    tokenHash: {
      type: String,
      required: true,
    },
    tokenPrefix: {
      type: String,
      required: true,
    },
    scopes: {
      type: [String],
      default: ['repo', 'read', 'write'],
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const PersonalAccessToken = mongoose.model('PersonalAccessToken', PersonalAccessTokenSchema);
module.exports = PersonalAccessToken;
