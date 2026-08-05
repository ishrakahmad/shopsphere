import { BadRequestException } from '@nestjs/common';
import { cloudinaryStorage } from './cloudinary.config';

export const multerProductImageOptions = {
  storage: cloudinaryStorage,
  fileFilter: (req: any, file: any, callback: any) => {
    if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|gif)$/)) {
      return callback(new BadRequestException('Only image files (jpg, jpeg, png, webp, gif) are allowed'), false);
    }
    callback(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per image
};