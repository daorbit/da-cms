import { Schema, model } from 'mongoose';

/** A long-lived grant, rotated on every use and removed on revocation. */
const oauthRefreshTokenSchema = new Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    clientId: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    scope: { type: String, default: '' },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: true }
);

export const OAuthRefreshTokenModel = model('OAuthRefreshToken', oauthRefreshTokenSchema);
