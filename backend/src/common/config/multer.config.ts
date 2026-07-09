import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { BadRequestException } from '@nestjs/common';

export const multerProductImageOptions = {
  storage: diskStorage({
    destination: './uploads/products',
    filename: (req, file, callback) => {
      const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
      callback(null, uniqueName);
    },
  }),
  fileFilter: (req: any, file: any, callback: any) => {
    if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|gif)$/)) {
      return callback(new BadRequestException('Only image files (jpg, jpeg, png, webp, gif) are allowed'), false);
    }
    callback(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per image
};
