import { DB_CONNECTION_NAME } from '../constants/database.constant';
import { InjectModel } from '@nestjs/mongoose';

export function InjectDatabaseModel(
    entity: any,
    connectionName?: string,
): ParameterDecorator {
    return InjectModel(entity, connectionName ?? DB_CONNECTION_NAME);
}
