import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import {
    CLOUDINARY_DEFAULT,
    UPLOAD_ALLOWED_MIME_TYPES,
    UPLOAD_DEFAULT_ALLOWED_MIME_TYPES,
} from '@common/upload/constants/upload.constants';
import { CloudinaryResourceType } from '@common/upload/enums/upload.enum';
import {
    ICloudinaryUploadOptions,
    ICloudinaryUploadedFile,
} from '@common/upload/interfaces/upload.interface';

@Injectable()
export class UploadService implements OnModuleInit {
    constructor(private readonly configService: ConfigService) {}

    onModuleInit(): void {
        cloudinary.config({
            cloud_name: this.configService.get<string>('cloudinary.cloudName'),
            api_key: this.configService.get<string>('cloudinary.apiKey'),
            api_secret: this.configService.get<string>('cloudinary.apiSecret'),
            secure: this.configService.get<boolean>('cloudinary.secure'),
        });
    }

    async uploadBuffer(
        file: Express.Multer.File,
        options?: ICloudinaryUploadOptions,
    ): Promise<ICloudinaryUploadedFile> {
        this.validateFile(file, options);

        const uploaded = await this.uploadToCloudinary(file, options);
        return this.mapUploadResponse(uploaded);
    }

    async deleteByPublicId(publicId: string): Promise<void> {
        if (!publicId) {
            throw new BadRequestException('publicId is required');
        }

        await cloudinary.uploader.destroy(publicId);
    }

    private async uploadToCloudinary(
        file: Express.Multer.File,
        options?: ICloudinaryUploadOptions,
    ): Promise<UploadApiResponse> {
        return await new Promise<UploadApiResponse>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: options?.folder,
                    public_id: options?.publicId,
                    resource_type:
                        options?.resourceType ??
                        this.resolveResourceType(file, options),
                    overwrite: options?.overwrite ?? false,
                },
                (error, result) => {
                    if (error || !result) {
                        reject(
                            new InternalServerErrorException(
                                error?.message ?? 'Cloudinary upload failed',
                            ),
                        );
                        return;
                    }

                    resolve(result);
                },
            );

            Readable.from(file.buffer).pipe(uploadStream);
        });
    }

    private validateFile(
        file: Express.Multer.File,
        options?: ICloudinaryUploadOptions,
    ): void {
        if (!file) {
            throw new BadRequestException('File is required');
        }

        const allowed = options?.allowedMimeTypes?.length
            ? [...options.allowedMimeTypes]
            : [...UPLOAD_DEFAULT_ALLOWED_MIME_TYPES];

        if (!allowed.includes(file.mimetype)) {
            throw new BadRequestException('Invalid file type');
        }
    }

    private resolveResourceType(
        file: Express.Multer.File,
        _options?: ICloudinaryUploadOptions,
    ): CloudinaryResourceType {
        const imageMimes = UPLOAD_ALLOWED_MIME_TYPES.IMAGE as readonly string[];
        if (imageMimes.includes(file.mimetype)) {
            return CLOUDINARY_DEFAULT.RESOURCE_TYPE;
        }
        return CloudinaryResourceType.RAW;
    }

    private mapUploadResponse(
        uploadResult: UploadApiResponse,
    ): ICloudinaryUploadedFile {
        return {
            publicId: uploadResult.public_id,
            secureUrl: uploadResult.secure_url,
            width: uploadResult.width,
            height: uploadResult.height,
            format: uploadResult.format,
            resourceType: uploadResult.resource_type,
            bytes: uploadResult.bytes,
        };
    }
}
