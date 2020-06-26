import { IMongoModel } from './mongo-model';
import { ObjectID, ObjectId } from 'bson';

export type PAGE_STATUS = 'UPDATED' | 'UPDATING' | 'DISABLED'

export interface IPage extends IMongoModel {
    pid: string;
    url?: string;
    country_code: number;

    last_post_id?: ObjectId;

    last_update: number;
    status: PAGE_STATUS;

    created_at: number;
}