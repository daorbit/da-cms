import { Schema, model, type InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },

    // Collected during onboarding. Optional so an account created before the
    // flow existed — or one that skipped the step — stays valid.
    jobRole: { type: String, trim: true, default: '' },
    teamSize: { type: String, trim: true, default: '' },
    /** Set once the flow completes, so it is never shown twice. */
    onboardedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export type User = InferSchemaType<typeof userSchema> & { _id: Schema.Types.ObjectId };
export const UserModel = model('User', userSchema);
