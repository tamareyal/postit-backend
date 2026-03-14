import mongoose, { Schema, Document, Model } from 'mongoose';

export interface Post extends Document {
    title: string;
    content: string;
    sender_id: mongoose.Schema.Types.ObjectId;
    image?: string;
    createdAt: Date;
    updatedAt: Date;
}

const postSchema = new Schema<Post>({
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    sender_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: true
    },
    image: {
        type: String,
        required: false
    }
}, { timestamps: true });

// We create a Model which controls the 'Posts' collection in MongoDB consisting of Post documents defined by postSchema
const PostModel: Model<Post> = mongoose.model<Post>('Posts', postSchema);

export default PostModel;