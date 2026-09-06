import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * A signup that has been started but not verified.
 *
 * The account itself is not created until the emailed code comes back, so an
 * address someone does not control can never become a usable login. The record
 * holds the already-hashed password: hashing on the way in means a request that
 * is abandoned, or a record read later, never carries a plaintext one.
 */
const pendingSignupSchema = new Schema(
  {
    // One pending signup per address — starting again replaces the last.
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },

    /** The verification code, hashed the way a password is. */
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },

    /** Guards against walking the code space with repeated guesses. */
    attempts: { type: Number, default: 0 },
    /** Rate-limits resends, which are otherwise a way to send mail on demand. */
    lastSentAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Mongo drops the record once it expires, so an abandoned signup does not hold
// its address hostage and nothing has to sweep the collection.
pendingSignupSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type PendingSignup = InferSchemaType<typeof pendingSignupSchema> & {
  _id: Schema.Types.ObjectId;
};
export const PendingSignupModel = model('PendingSignup', pendingSignupSchema);
