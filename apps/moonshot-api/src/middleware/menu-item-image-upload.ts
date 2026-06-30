import type { RequestHandler } from 'express';
import multer from 'multer';
import { MENU_IMAGE_MAX_UPLOAD_BYTES } from '@moonshot/types';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MENU_IMAGE_MAX_UPLOAD_BYTES, files: 1 },
});

/** Single file field `image` for menu item thumbnail uploads. */
export const menuItemImageUpload: RequestHandler = upload.single('image');
