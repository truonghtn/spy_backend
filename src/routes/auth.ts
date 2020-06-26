import * as express from 'express';
import ERR from '../glob/err';
import HC from '../glob/hc';
import { User } from '../models/index';
import { UserServ } from '../serv/user';
import { ajv2 } from '../utils/ajv2';
import { ExpressRouter, Body, POST, PUT } from 'express-router-ts'
import _ from '../utils/_';
import { ValidBody } from '../utils/decors';
import hera, { AppLogicError } from '../utils/hera';
import AuthServ from '../serv/auth';


class AuthRouter extends ExpressRouter {

    @POST({ path: '/login' })
    @ValidBody({
        '+@phone': 'string',
        '+@password': 'string',
        '++': false
    })
    async login(@Body() body: ILoginBody) {
        const stdPhone = hera.standardlizePhoneNumber(body.phone)
        const user = await User.findOne({ phone: stdPhone }, { fields: ['_id', 'roles', 'isBlocked'] });

        if (!user || user.isBlocked) {
            throw new AppLogicError('Cannot login! Invalid user or user is blocked', 400);
        }

        const isPasswordCorrect = user && await UserServ.isValidPassword(user._id, body.password)
        if (!isPasswordCorrect) {
            throw new AppLogicError('Cannot login! Invalid username or password', 400);
        }

        const token = await AuthServ.authenticator.genTokens({
            id: user._id.toHexString(),
            scope: '*'
        });

        return token;
    }

    @POST({ path: '/token' })
    @ValidBody({
        '+@refresh_token': 'string',
        '++': false
    })
    async issueToken(@Body('refresh_token') refreshToken: string) {
        const expires = new Date().valueOf() / 1000 + AuthServ.authenticator.accessTokenExpires;
        const accessToken = AuthServ.authenticator.genAccessToken(refreshToken);

        const tokens = {
            access_token: accessToken,
            expires_in: expires,
            refresh_token: refreshToken,
            token_type: 'bearer'
        }

        return tokens;
    }

    @PUT({ path: '/logout' })
    @ValidBody({
        '+@access_token': 'string',
        '+@refresh_token': 'string',
        '++': false
    })
    async logout(@Body('access_token') accessToken: string, @Body('refresh_token') refreshToken: string) {
        const auth = await AuthServ.authenticator.getUser(accessToken);
        const uid = hera.mObjId(auth.id as string);

        AuthServ.authenticator.revokeToken(accessToken);
        AuthServ.authenticator.revokeToken(refreshToken);

        return {};
    }
}

interface ILoginBody {
    phone: string;
    password: string;
}

export default new AuthRouter();