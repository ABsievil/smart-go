import {
    CloudinaryResourceType,
    UploadMimeType,
    UploadTextMimeType,
} from '@common/upload/enums/upload.enum';

export const UPLOAD_FIELD = {
    FILE: 'file',
} as const;

export const UPLOAD_LIMIT = {
    DEFAULT_MAX_FILE_SIZE: 10 * 1024 * 1024,
} as const;

export const UPLOAD_ALLOWED_MIME_TYPES = {
    IMAGE: [UploadMimeType.JPG, UploadMimeType.PNG, UploadMimeType.WEBP],
    TEXT_AND_DOCUMENT: Object.values(UploadTextMimeType),
} as const;

export function buildUploadDefaultAllowedMimeTypes(): string[] {
    return [
        ...UPLOAD_ALLOWED_MIME_TYPES.IMAGE,
        ...UPLOAD_ALLOWED_MIME_TYPES.TEXT_AND_DOCUMENT,
    ];
}

export const UPLOAD_DEFAULT_ALLOWED_MIME_TYPES: readonly string[] =
    buildUploadDefaultAllowedMimeTypes();

export const CLOUDINARY_DEFAULT = {
    RESOURCE_TYPE: CloudinaryResourceType.IMAGE,
} as const;
