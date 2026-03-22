import {
    applyDecorators,
    ParseFilePipeBuilder,
    UploadedFile as NestUploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import {
    UPLOAD_DEFAULT_ALLOWED_MIME_TYPES,
    UPLOAD_FIELD,
    UPLOAD_LIMIT,
} from '@common/upload/constants/upload.constants';
import { IUploadFileDecoratorOptions } from '@common/upload/interfaces/upload.interface';

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildMimeWhitelistRegExp(mimeTypes: string[]): RegExp {
    const escaped = mimeTypes.map(escapeRegExp);
    return new RegExp(`^(${escaped.join('|')})(;|$)`);
}

export const UploadSingleFile = (options?: IUploadFileDecoratorOptions) => {
    const fieldName = options?.fieldName ?? UPLOAD_FIELD.FILE;

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

export const UploadedFile = (options?: IUploadFileDecoratorOptions) => {
    const maxSizeInBytes =
        options?.maxSizeInBytes ?? UPLOAD_LIMIT.DEFAULT_MAX_FILE_SIZE;
    const allowedMimeTypes = options?.allowedMimeTypes ?? [
        ...UPLOAD_DEFAULT_ALLOWED_MIME_TYPES,
    ];
    const skipMagicNumbersValidation =
        options?.skipMagicNumbersValidation ?? true;

    return NestUploadedFile(
        new ParseFilePipeBuilder()
            .addMaxSizeValidator({
                maxSize: maxSizeInBytes,
            })
            .addFileTypeValidator({
                fileType: buildMimeWhitelistRegExp(allowedMimeTypes),
                skipMagicNumbersValidation,
            })
            .build({
                fileIsRequired: true,
            }),
    );
};
