import { IMongoModel } from './mongo-model';

export interface IUser extends IMongoModel {
    fullName: string;
    birthDay: number;

    phone: string;
    email: string;
    avatar?: string

    roles: string[];

    isBlocked: boolean;
}