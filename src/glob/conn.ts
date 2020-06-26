import * as rmq from 'amqplib';
import * as mongodb from 'mongodb';
import { RedisClient } from 'redis-ts';
import ENV, { ENV_CONN_CONFIG } from './env';
import HC from './hc';


// ************ CONFIGS ************

export class AppConnections {
    private redis: RedisClient;
    private mongo: mongodb.Db;
    private scraperMongo: mongodb.Db;
    private rmqConn: rmq.Connection;

    get REDIS() { return this.redis; }
    get MONGO() { return this.mongo }
    get SCRAPER_MONGO() { return this.scraperMongo }
    get RMQ() { return this.rmqConn }

    constructor() {

    }

    async configureConnections(connConfig: ENV_CONN_CONFIG) {
        this.redis = new RedisClient(connConfig.REDIS);
        this.mongo = await mongodb.connect(connConfig.MONGO.CONNECTION_STRING, connConfig.MONGO.OPTIONS);
        this.scraperMongo = await mongodb.connect(connConfig.SCRAPER_MONGO.CONNECTION_STRING, connConfig.SCRAPER_MONGO.OPTIONS);
        this.rmqConn = await rmq.connect(connConfig.RMQ.CONNECTION_STRING, connConfig.RMQ.OPTIONS)
    }

    get BASE_REDIS_KEY() {
        return CONN.REDIS.child(HC.APP_NAME).child(ENV.NAME)
    }
}

const CONN = new AppConnections();
export default CONN;
