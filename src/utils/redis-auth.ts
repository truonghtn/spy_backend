import * as randomstring from 'randomstring';
import { IAuthenticator, IAuthUser, IAuth } from "./auth";
import { RedisKey } from "redis-ts";
import { hera } from './hera';

export class RedisAuth implements IAuthenticator {
    readonly accessTokenExpires: number;
    readonly refreshTokenExpires: number;

    constructor(private redisKey: RedisKey,
        accessTokenExpires: number, refreshTokenExpires: number) {
        this.accessTokenExpires = accessTokenExpires;
        this.refreshTokenExpires = refreshTokenExpires;
    }

    async genTokens(user: IAuthUser): Promise<IAuth> {
        const refreshToken = await this.genRefreshToken(user);
        const now = new Date();
        const accessToken = await this.genAccessToken(refreshToken);
        const accessTokenExpiresIn = (now.valueOf() / 1000) + this.accessTokenExpires;
        return <IAuth>{
            access_token: accessToken,
            expires_in: accessTokenExpiresIn,
            refresh_token: refreshToken,
            token_type: 'bearer',
            scope: user.scope
        }
    }

    async genRefreshToken(user: IAuthUser): Promise<string> {
        const token = randomstring.generate({ length: 48 });
        const expired = new Date().valueOf() + 1000 * this.refreshTokenExpires;
        await this.redisKey.child(token).hmsetDict({
            id: user.id,
            scope: user.scope,
            type: 'REFRESH',
            expired: expired
        });
        await this.redisKey.child(token).expire(1 + this.refreshTokenExpires);
        return token;
    }

    async genAccessToken(refreshToken: string): Promise<string> {
        const data: any = await this.redisKey.child(refreshToken).hgetall();
        if (data && data.type === 'REFRESH' && hera.parseInt(data.expired, 10, Number.MIN_SAFE_INTEGER) >= new Date().valueOf()) {
            const token = randomstring.generate({ length: 48 });
            const expired = new Date().valueOf() + 1000 * this.accessTokenExpires;
            await this.redisKey.child(token).hmsetDict({
                id: data.id,
                scope: data.scope,
                type: 'ACCESS',
                expired: expired
            });
            await this.redisKey.child(token).expire(1 + this.accessTokenExpires);
            return token;
        }

        return null;
    }

    async renewToken(accessToken: string): Promise<void> {
        const data: any = await this.redisKey.child(accessToken).hgetall();
        if (data && data.type == 'ACCESS' && hera.parseInt(data.expired, 10, Number.MIN_SAFE_INTEGER) >= new Date().valueOf()) {
            const expired = new Date().valueOf() + 1000 * this.accessTokenExpires;
            await Promise.all([
                this.redisKey.child(accessToken).hset('expired', expired),
                this.redisKey.child(accessToken).expire(1 + this.accessTokenExpires)
            ]);
        }
    }

    revokeToken(token: string): Promise<void> {
        return this.redisKey.child(token).del();
    }

    async getUser(accessToken: string): Promise<IAuthUser> {
        const data: any = await this.redisKey.child(accessToken).hgetall();
        if (data && data.type == 'ACCESS' && hera.parseInt(data.expired, 10, Number.MIN_SAFE_INTEGER) >= new Date().valueOf()) {
            return {
                id: data.id,
                scope: data.scope
            }
        }

        throw new Error(`Invalid access token`);
    }
}