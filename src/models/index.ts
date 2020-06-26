import * as mongodb from 'mongodb';
import { IUser } from './user';
import { IUserAuth } from './user-auth';
import { IPage } from './page';
import { IPost } from './post';

export * from './user';
export * from './user-auth';
export * from './page';
export * from './post';

export let User: mongodb.Collection<IUser>;
export let UserAuth: mongodb.Collection<IUserAuth>;
export let Page: mongodb.Collection<IPage>;
export let Post: mongodb.Collection<IPost>;

export function init(db: mongodb.Db) {
    User = db.collection<IUser>('user');
    UserAuth = db.collection<IUserAuth>('user_auth');
    Page = db.collection<IPage>('page');
    Post = db.collection<IPost>('post');
    migrate(db);
}

const MIGRATIONS = [migrateV1, migrateV2];

async function migrate(db: mongodb.Db) {
    const dbConfig = await db.collection('config').findOne({ type: 'db' });
    const dbVersion = (dbConfig && dbConfig.version) || 0;
    for (let i = dbVersion; i < MIGRATIONS.length; ++i) {
        await MIGRATIONS[i]();
        await db.collection('config').updateOne({ type: 'db' }, { $set: { version: i + 1 } }, { upsert: true });
    }
}

async function migrateV1() {
    UserAuth.createIndex({ user: 'hashed' });
}

async function migrateV2() {
    User.createIndex({ ext: 1 });
}