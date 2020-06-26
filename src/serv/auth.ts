import * as express from 'express';
import * as _ from 'lodash';
import { ObjectID } from 'mongodb';

import hera, { AppLogicError } from '../utils/hera';
import ERR from '../glob/err';
import { JWTAuth, IAuthUser, IAuthenticator } from '../utils/auth';
import { HC } from '../glob/hc';
import { ENV } from '../glob/env';

import { IUser, User } from '../models';
import { RedisAuth } from '../utils/redis-auth';
import CONN from '../glob/conn';
import { addMiddlewareDecor, ExpressRouter } from 'express-router-ts';

export interface IAuthUserModel {
    getUser(uid: string): Promise<IUser>;
}

export class AuthServ {
    // static readonly authenticator: IAuthenticator = new JWTAuth(ENV.AUTH.SECRECT_KEY, ENV.AUTH.ACCESS_TOKEN_EXPIRES, ENV.AUTH.REFRESH_TOKEN_EXPIRES);
    static authenticator: IAuthenticator;
    static MODEL: IAuthUserModel;

    static init() {
        this.authenticator = new RedisAuth(CONN.BASE_REDIS_KEY.child('token'), ENV.AUTH.ACCESS_TOKEN_EXPIRES, ENV.AUTH.REFRESH_TOKEN_EXPIRES);
    }


    static authRole(...roles: string[]) {
        return addMiddlewareDecor(async req => {
            if (!req.session.user) {
                const accessToken = req.header('Authorization');
                if (hera.isEmpty(accessToken)) {
                    throw new AppLogicError(`Unauthorized! Invalid access token`, 403);
                }

                let authUser: IAuthUser = null;
                try {
                    authUser = await this.authenticator.getUser(accessToken);
                }
                catch (err) {
                    throw new AppLogicError(`Unauthorized! ${err}`, 401);
                }

                const user = await this.MODEL.getUser(authUser.id as string);
                if (hera.isEmpty(user)) {
                    throw new AppLogicError(`Unauthorized! Invalid user`, 401);
                }

                this.authenticator.renewToken(accessToken);
                user.roles = [authUser.scope];
                req.session.user = user;
            }

            const user = req.session.user;
            if (user.isBlocked || !user.roles.find(r => !!roles.find(rr => rr == r))) throw ExpressRouter.NEXT;
        })
    }
}

export default AuthServ;