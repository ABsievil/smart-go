import { CloudinaryResourceType } from '@common/upload/enums/upload.enum';

export interface IUploadFileDecoratorOptions {
    fieldName?: string;
    maxSizeInBytes?: number;
    allowedMimeTypes?: string[];
    skipMagicNumbersValidation?: boolean;
}

export interface ICloudinaryUploadOptions {
    folder?: string;
    publicId?: string;
    resourceType?: CloudinaryResourceType;
    overwrite?: boolean;
    allowedMimeTypes?: readonly string[];
}

export interface ICloudinaryUploadedFile {
    publicId: string;
    secureUrl: string;
    width?: number;
    height?: number;
    format?: string;
    resourceType?: string;
    bytes?: number;
}
