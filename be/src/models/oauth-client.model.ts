import { Schema, model, type InferSchemaType } from 'mongoose';

export const TOKEN_AUTH_METHODS = ['none', 'client_secret_post', 'client_secret_basic'] as const;

/**
 * An application allowed to ask users for access, such as claude.ai's
 * connector. Registered dynamically (RFC 7591), so a client is only a promise
 * of where codes may be sent — access itself is granted per user on consent.
 */
const oauthClientSchema = new Schema(
  {
    clientId: { type: String, required: true, unique: true },
    /** SHA-256 of the secret, for confidential clients. Empty for public ones. */
    clientSecretHash: { type: String, default: '' },
    clientName: { type: String, trim: true, default: '' },
    redirectUris: { type: [String], required: true },
    tokenEndpointAuthMethod: { type: String, enum: TOKEN_AUTH_METHODS, default: 'none' },
  },
  { timestamps: true }
);

export type OAuthClient = InferSchemaType<typeof oauthClientSchema>;
export const OAuthClientModel = model('OAuthClient', oauthClientSchema);
