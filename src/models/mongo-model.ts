import * as mongodb from 'mongodb';

export interface IMongoModel {
    _id?: mongodb.ObjectID;
    __v?: number;
}

export { ObjectID } from 'mongodb';
