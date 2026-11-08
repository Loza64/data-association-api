import { model, PaginateModel, Schema, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface UserDocument {
  _id: Types.ObjectId;
  name: string;
  username: string;
  password?: string;
  failedLoginAttempts?: number;
  lastAttemptAt?: Date | null;
  lockedUntil?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, minlength: 3, maxlength: 30 },
    password: { type: String, required: true, select: false },
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lastAttemptAt: { type: Date, default: null, select: false },
    lockedUntil: { type: Date, default: null, select: false },
  },
  { timestamps: true, versionKey: false },
);

userSchema.plugin(mongoosePaginate);

export const UserModel = model<UserDocument, PaginateModel<UserDocument>>('User', userSchema);
