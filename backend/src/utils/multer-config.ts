import { Request } from 'express';
import multer, { FileFilterCallback } from 'multer';

type DestinationCallback = (error: Error | null, destination: string) => void;
type FileNameCallback = (error: Error | null, filename: string) => void;

const multerConfig = multer.diskStorage({
  destination: (request: Request, file: Express.Multer.File, cb: DestinationCallback) => {
    cb(null, 'uploads/');
  },
  filename: (request: Request, file: Express.Multer.File, cb: FileNameCallback) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const fileFilter = (request: Request, file: Express.Multer.File, callback: FileFilterCallback): void => {
  if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg') {
    callback(null, true);
  } else {
    callback(null, false);
  }
};

const upload = multer({
  storage: multerConfig,
  limits: { fileSize: 512 * 1000000 } // 512MB file size limit
}).single('myFile');

export default multerConfig;
export { fileFilter };
export { upload };