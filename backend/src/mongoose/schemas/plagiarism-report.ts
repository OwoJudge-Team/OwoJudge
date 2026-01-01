import mongoose, { Schema, model, Document } from 'mongoose';

interface IPlagiarismReport extends Document {
  problemSerialNumber: number;
  createdAt: Date;
  lastSubmissionTime: Date;
  result: any; // Store the Dolos JSON output
}

const plagiarismReportSchema = new Schema<IPlagiarismReport>({
  problemSerialNumber: { type: Number, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  lastSubmissionTime: { type: Date, required: true },
  result: { type: Schema.Types.Mixed, required: true },
});

const PlagiarismReport = model<IPlagiarismReport>('PlagiarismReport', plagiarismReportSchema);

export { PlagiarismReport, IPlagiarismReport };
