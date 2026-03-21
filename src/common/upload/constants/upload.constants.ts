import { CloudinaryResourceType, UploadMimeType } from '@common/upload/enums/upload.enum';

export const UPLOAD_FIELD = {
    FILE: 'file',
} as const;

export const UPLOAD_LIMIT = {
    DEFAULT_MAX_FILE_SIZE: 5 * 1024 * 1024,
} as const;

export const UPLOAD_ALLOWED_MIME_TYPES = {
    IMAGE: [UploadMimeType.JPG, UploadMimeType.PNG, UploadMimeType.WEBP],
} as const;

export const CLOUDINARY_DEFAULT = {
    RESOURCE_TYPE: CloudinaryResourceType.IMAGE,
} as const;
