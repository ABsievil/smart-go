import { Injectable } from "@nestjs/common";
import { Model } from "mongoose";
import { UserEntity } from "src/modules/users/repositories/entities/user.entity";
import { InjectModel } from "@nestjs/mongoose";

@Injectable()
export class UserRepository {
    constructor(
        @InjectModel(UserEntity.name) private readonly userModel: Model<UserEntity>,
    ) {}
}