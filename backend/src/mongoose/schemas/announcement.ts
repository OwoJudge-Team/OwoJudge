/**
 * Announcement schema module.
 *
 * Defines the Mongoose schema and model for announcements.
 *
 * @module AnnouncementSchema
 */

import mongoose, { ObjectId } from 'mongoose';

/**
 * Represents an announcement document in MongoDB.
 *
 * @property topic - The announcement title / topic. Must be unique.
 * @property content - The announcement body text.
 * @property timestamp - When the announcement was created or last updated.
 */
interface IAnnouncement extends mongoose.Document {
  topic: string;
  content: string;
  timestamp: Date;
}

/**
 * Mongoose schema for {@link IAnnouncement}.
 *
 * Collection: `announcements`
 *
 * | Field       | Type     | Required | Unique | Notes                     |
 * |-------------|----------|----------|--------|---------------------------|
 * | `topic`     | `String` | Yes      | Yes    | Announcement title        |
 * | `content`   | `String` | Yes      | No     | Announcement body         |
 * | `timestamp` | `Date`   | Yes      | No     | Creation / update time    |
 */
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

/** Mongoose model for the `announcements` collection. */
export const Announcement = mongoose.model<IAnnouncement>('announcement', announcementSchema);
export { IAnnouncement, announcementSchema };
