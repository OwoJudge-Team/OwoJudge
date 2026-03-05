/**
 * Counter schema module.
 *
 * Provides an auto-increment counter collection used by other schemas
 * (e.g. {@link IProblem | Problem}) to generate sequential serial numbers.
 *
 * @module CounterSchema
 */

import mongoose, { Schema, Document } from 'mongoose';

/**
 * Represents a counter document used for auto-increment sequences.
 *
 * @property _id - The counter name (e.g. `"problemSerialNumber"`).
 * @property seq - The current sequence value.
 */
interface ICounter extends Document<string> {
  _id: string;
  seq: number;
}

/**
 * Mongoose schema for {@link ICounter}.
 *
 * Collection: `counters`
 *
 * | Field | Type     | Required | Default | Notes                          |
 * |-------|----------|----------|---------|--------------------------------|
 * | `_id` | `String` | Yes      | —       | Counter name (e.g. `"problemSerialNumber"`) |
 * | `seq` | `Number` | No       | `0`     | Current sequence value         |
 */
const counterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

/** Mongoose model for the `counters` collection. */
export const Counter = mongoose.model<ICounter>('Counter', counterSchema);
export { ICounter, counterSchema };
