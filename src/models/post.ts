import { IMongoModel } from './mongo-model';
import { ObjectId } from 'bson';

export type POST_STATUS = 'UPDATED' | 'UPDATING' | 'DISABLED'

export interface IPost extends IMongoModel {
    scrapeId: ObjectId;

    pid: string;
    url?: string;

    url_photo?: string;
    content?: string;

    page: ObjectId;
    page_pid: string;

    last_update: number;
    status: POST_STATUS;

    n_like: number;
    n_comment: number;

    created_at: number;
}