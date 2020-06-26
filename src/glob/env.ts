import * as path from 'path';

export interface ENV_CONN_CONFIG {
    REDIS: any;
    MONGO: {
        CONNECTION_STRING: string;
        OPTIONS: any;
    },
    SCRAPER_MONGO: {
        CONNECTION_STRING: string;
        OPTIONS: any;
    },
    RMQ: {
        CONNECTION_STRING: string;
        OPTIONS: any;
    }
}

export interface ENV_CONFIG {
    NAME: string;
    HTTP_PORT: number;
    CONN: ENV_CONN_CONFIG;
    AUTH: {
        SECRECT_KEY: string;
        ACCESS_TOKEN_EXPIRES: number;
        REFRESH_TOKEN_EXPIRES: number;
    }
}

export const ENV: ENV_CONFIG = require(process.env.config || path.resolve(process.cwd(), 'env.json'));
console.log(ENV);
export default ENV;