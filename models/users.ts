import mongoose, { Schema, Document, Model } from 'mongoose';

export interface User extends Document {
    name: string;
    email: string;
    password: string;
    refreshTokens: string[];
    image?: string;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<User>({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    refreshTokens: {
        type: [String],
        default: []
    },
    image: {
        type: String,
        required: false
    }
}, { timestamps: true });

// We create a Model which controls the 'Users' collection in MongoDB consisting of User documents defined by userSchema
const UserModel: Model<User> = mongoose.model<User>('Users', userSchema);

export default UserModel;