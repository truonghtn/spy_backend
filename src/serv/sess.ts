import * as express from 'express';

import { IUser } from '../models';

interface IReqSession {
    user?: IUser;
    system?: string;
}

declare module "express-serve-static-core" {
    interface Request {
        session: IReqSession
    }
}

export default function createSesssionObject(): express.RequestHandler {
    return (req, resp, next) => {
        req.session = {};
        next();
    };
}