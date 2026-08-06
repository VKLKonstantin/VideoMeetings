import { randomUUID } from 'crypto';
import { extname } from 'path';
import { diskStorage } from 'multer';
import {
  ALLOWED_RECORDING_MIME_TYPES,
  MAX_RECORDING_SIZE_BYTES,
  RECORDINGS_TMP_DIR,
} from './recordings.constants';
import { ensureTmpDirSync } from './recordings.storage';

ensureTmpDirSync();

export const recordingsMulterOptions = {
  storage: diskStorage({
    destination: RECORDINGS_TMP_DIR,
    filename: (_req, file, cb) => {
      cb(null, `${randomUUID()}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: MAX_RECORDING_SIZE_BYTES },
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    cb: (error: null, acceptFile: boolean) => void,
  ) => {
    cb(null, ALLOWED_RECORDING_MIME_TYPES.includes(file.mimetype));
  },
};
