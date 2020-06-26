import { IMongoModel, ObjectID } from './mongo-model';

export interface IUserAuth extends IMongoModel {
    user: ObjectID;

    passwordSHA1: string;
    passwordSalt: string;
}