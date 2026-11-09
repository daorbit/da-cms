import { Schema, model } from 'mongoose';

/** A single-use authorization code, redeemed at the token endpoint within minutes. */
const oauthCodeSchema = new Schema({
  codeHash: { type: String, required: true, unique: true },
  clientId: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  redirectUri: { type: String, required: true },
  codeChallenge: { type: String, required: true },
  scope: { type: String, default: '' },
  expiresAt: { type: Date, required: true, expires: 0 },
});

export const OAuthCodeModel = model('OAuthCode', oauthCodeSchema);
