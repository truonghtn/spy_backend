import { ajv2 } from '../utils/ajv2';
import { addMiddlewareDecor } from 'express-router-ts';
import { AppLogicError } from './hera';

const ajv = ajv2();

export function ValidBody(schema: any, log = false) {
    const validator = ajv(schema, log);

    return addMiddlewareDecor(async req => {
        if (!validator(req.body)) throw new AppLogicError('Invalid request body!', 400, validator.errors);
    })
}