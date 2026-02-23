import mongoose, { ObjectId } from 'mongoose';

interface IAnnouncement extends mongoose.Document {
  topic: string;
  content: string;
  timestamp: Date;
}

const announcementSchema = new mongoose.Schema<IAnnouncement>({
  topic: {
    type: mongoose.Schema.Types.String,
    required: true,
    unique: true
  },
  content: {
    type: mongoose.Schema.Types.String,
    required: true
  },
  timestamp: {
    type: mongoose.Schema.Types.Date,
    required: true
  },
});

export const Announcement = mongoose.model<IAnnouncement>('announcement', announcementSchema);
export { IAnnouncement };
