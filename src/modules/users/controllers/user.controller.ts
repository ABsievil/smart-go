import {
    Body,
    Controller,
    DefaultValuePipe,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Post,
    Put,
    Query,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { LanguageResponse } from '@common/language/decorators/language-response.decorator';
import {
    UploadSingleFile,
    UploadedFile,
} from '@common/upload/decorators/upload-file.decorator';
import { UPLOAD_ALLOWED_MIME_TYPES } from '@common/upload/constants/upload.constants';
import { UploadService } from '@common/upload/services/upload.service';
import { UserService } from '@modules/users/services/user.service';
import { UserUpdateRequestDto } from '@modules/users/dtos/request/user-update.request.dto';
import { UserGetResponseDto } from '@modules/users/dtos/response/user-get.response.dto';
import { UserListResponseDto } from '@modules/users/dtos/response/user-list.response.dto';
import { UserCreateRequestDto } from '../dtos/request/user-create.request.dto';
import { UserRole } from '../enums/user-role.enum';
import { Roles } from '@modules/auth/decorators/auth.decorator';
import { USER_CONSTANTS } from '../constants/user.constant';

@ApiTags('Users')
@Controller('users')
export class UserController {
    constructor(
        private readonly userService: UserService,
        private readonly uploadService: UploadService,
    ) {}

    @Get()
    @ApiBearerAuth()
    @LanguageResponse({
        module: 'users',
        successKey: 'findAll',
    })
    @ApiOperation({ summary: 'Get all users' })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiResponse({
        status: 200,
        description: 'List of users',
        type: UserListResponseDto,
    })
    async findAll(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
        @Query() query: Record<string, any>,
    ): Promise<UserListResponseDto> {
        const { page: _, limit: __, ...filter } = query;
        const { data, total } = await this.userService.findAll(
            filter,
            page,
            limit,
        );

        return {
            total,
            page,
            limit,
            data: this.userService.mapList(data),
        };
    }

    @Get(':id')
    @ApiBearerAuth()
    @LanguageResponse({
        module: 'users',
        successKey: 'findOne',
    })
    @ApiOperation({ summary: 'Get user by ID' })
    @ApiResponse({
        status: 200,
        description: 'User found',
        type: UserGetResponseDto,
    })
    @ApiResponse({ status: 404, description: 'User not found' })
    async findOne(@Param('id') id: string): Promise<UserGetResponseDto> {
        const user = await this.userService.findOne(id);
        return this.userService.mapGet(user);
    }

    @Post()
    @ApiBearerAuth()
    @LanguageResponse({
        module: 'users',
        successKey: 'create',
    })
    @ApiOperation({ summary: 'Create a new user (Only for admin)' })
    @ApiResponse({
        status: 201,
        description: 'User created successfully',
        type: UserGetResponseDto,
    })
    @UploadSingleFile({ fieldName: 'avatar' })
    @HttpCode(HttpStatus.CREATED)
    @Roles(UserRole.ADMIN)
    async create(
        @Body() createDto: UserCreateRequestDto,
        @UploadedFile({
            allowedMimeTypes: [...UPLOAD_ALLOWED_MIME_TYPES.IMAGE],
            skipMagicNumbersValidation: false,
        })
        file: Express.Multer.File,
    ): Promise<UserGetResponseDto> {
        const user = await this.userService.create({
            ...createDto,
        });

        const uploaded = await this.uploadService.uploadBuffer(file, {
            folder: `${USER_CONSTANTS.UPLOAD_FOLDER}/${user._id}/${USER_CONSTANTS.AVATAR}`,
            allowedMimeTypes: [...UPLOAD_ALLOWED_MIME_TYPES.IMAGE],
        });

        let updatedUser = user;
        if (uploaded) {
            updatedUser = await this.userService.update(user._id, {
                avatar: uploaded.secureUrl,
            });
        }
        return this.userService.mapGet(updatedUser);
    }

    @Put(':id')
    @ApiBearerAuth()
    @LanguageResponse({
        module: 'users',
        successKey: 'update',
    })
    @ApiOperation({ summary: 'Update user by ID' })
    @ApiResponse({
        status: 200,
        description: 'User updated successfully',
        type: UserGetResponseDto,
    })
    @ApiResponse({ status: 404, description: 'User not found' })
    @UploadSingleFile({ fieldName: 'avatar' })
    async update(
        @Param('id') id: string,
        @Body() updateDto: UserUpdateRequestDto,
        @UploadedFile({
            allowedMimeTypes: [...UPLOAD_ALLOWED_MIME_TYPES.IMAGE],
            skipMagicNumbersValidation: false,
        })
        file: Express.Multer.File,
    ): Promise<UserGetResponseDto> {
        const uploaded = await this.uploadService.uploadBuffer(file, {
            folder: `${USER_CONSTANTS.UPLOAD_FOLDER}/${id}/${USER_CONSTANTS.AVATAR}`,
            allowedMimeTypes: [...UPLOAD_ALLOWED_MIME_TYPES.IMAGE],
        });
        const user = await this.userService.update(id, {
            ...updateDto,
            avatar: uploaded.secureUrl,
        });
        return this.userService.mapGet(user);
    }

    @Delete(':id')
    @ApiBearerAuth()
    @LanguageResponse({
        module: 'users',
        successKey: 'remove',
    })
    @ApiOperation({ summary: 'Delete user by ID' })
    @ApiResponse({ status: 200, description: 'User deleted successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @HttpCode(HttpStatus.OK)
    async remove(@Param('id') id: string): Promise<void> {
        return this.userService.delete(id);
    }
}
