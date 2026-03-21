import {
    applyDecorators,
    ParseFilePipeBuilder,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import {
    UPLOAD_ALLOWED_MIME_TYPES,
    UPLOAD_FIELD,
    UPLOAD_LIMIT,
} from '@common/upload/constants/upload.constants';
import { IUploadFileDecoratorOptions } from '@common/upload/interfaces/upload.interface';

export const UploadSingleFile = (options?: IUploadFileDecoratorOptions) => {
    const fieldName = options?.fieldName ?? UPLOAD_FIELD.FILE;
    const maxSizeInBytes =
        options?.maxSizeInBytes ?? UPLOAD_LIMIT.DEFAULT_MAX_FILE_SIZE;
    const allowedMimeTypes =
        options?.allowedMimeTypes ?? UPLOAD_ALLOWED_MIME_TYPES.IMAGE;

    return applyDecorators(
        ApiConsumes('multipart/form-data'),
        ApiBody({
            schema: {
                type: 'object',
                properties: {
                    [fieldName]: {
                        type: 'string',
                        format: 'binary',
                    },
                },
                required: [fieldName],
            },
        }),
        UseInterceptors(FileInterceptor(fieldName)),
    );
};

export const UploadedFilePipe = (options?: IUploadFileDecoratorOptions) => {
    const maxSizeInBytes =
        options?.maxSizeInBytes ?? UPLOAD_LIMIT.DEFAULT_MAX_FILE_SIZE;
    const allowedMimeTypes =
        options?.allowedMimeTypes ?? UPLOAD_ALLOWED_MIME_TYPES.IMAGE;

    return UploadedFile(
        new ParseFilePipeBuilder()
            .addMaxSizeValidator({
                maxSize: maxSizeInBytes,
            })
            .addFileTypeValidator({
                fileType: new RegExp(
                    `(${allowedMimeTypes
                        .map((mimeType) => mimeType.replace('/', '\\/'))
                        .join('|')})`,
                ),
            })
            .build({
                fileIsRequired: true,
            }),
    );
};
