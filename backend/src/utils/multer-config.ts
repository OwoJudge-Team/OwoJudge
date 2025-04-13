import { Request } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import fs from 'fs';

type DestinationCallback = (error: Error | null, destination: string) => void;
type FileNameCallback = (error: Error | null, filename: string) => void;

const storage = multer.diskStorage({
  destination: (request: Request, file: Express.Multer.File, next: DestinationCallback) => {
    next(null, 'uploads/');
  },
  filename: (request: Request, file: Express.Multer.File, next: FileNameCallback) => {
    next(null, `${file.originalname}`);
  }
});

const uploadProblem = multer({
  storage: storage,
  limits: { fileSize: 512 * 1024 * 1024 },
  fileFilter: (req, file, next: any) => {
    if (file.mimetype === 'application/gzip' || file.originalname.endsWith('.tar.gz')) {
      next(null, true);
    } else {
      next(new Error('Only .tar.gz files are allowed'), false);
    }
  }
}).single('problem');

export { uploadProblem };