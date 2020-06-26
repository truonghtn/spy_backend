import * as bodyParser from 'body-parser';
import * as express from 'express';
import CONN from './glob/conn';
import { ENV } from './glob/env';
import * as MODELS from './models';
import { JobManager } from './serv/job/job';

// Import routers
import LoginRoute from './routes/auth';
import PageRoute from './routes/page';

// Import services
import { AuthServ } from './serv/auth';
import SessionServ from './serv/sess';
import { UserServ } from './serv/user';
import { UpdatePageJob } from './serv/job/update_page';
import { CollectorManager } from './serv/collectors/collector';
import { ExpressRouter } from 'express-router-ts';
import hera, { AppLogicError, AppApiResponse } from './utils/hera';
import _ = require('lodash');

class Program {
    public static async main(): Promise<number> {
        await CONN.configureConnections(ENV.CONN);

        MODELS.init(CONN.MONGO);

        AuthServ.MODEL = UserServ;

        const server = express();
        server.use(bodyParser.json());

        // create session object
        server.use(SessionServ());

        // CORS
        server.all('*', function (req, res, next) {
            res.header('Access-Control-Allow-Origin', '*');
            res.header(
                'Access-Control-Allow-Methods',
                'OPTIONS, POST, GET, PUT, DELETE',
            );
            res.header('Access-Control-Allow-Credentials', 'true');
            res.header('Access-Control-Max-Age', '86400');
            res.header(
                'Access-Control-Allow-Headers',
                'X-Requested-With, X-HTTP-Method-Override, ' +
                'Content-Type, Accept, Authentication, Authorization, X-Consumer-Username, sess',
            );

            if (req.method.toUpperCase() == 'OPTIONS') {
                res.statusCode = 204;
                res.send();
                return;
            }

            next();
        });

        // Configure routes
        await ExpressRouter.loadDir(server, `${__dirname}/routes`)

        ExpressRouter.ResponseHandler = this.expressRouterResponse.bind(this)
        ExpressRouter.ErrorHandler = this.expressRouterError.bind(this)

        server.all('*', (req, resp) => {
            if (req.session.user || req.session.system) this.expressRouterError(new AppLogicError(`Permission denied!`, 403), req, resp);
            else this.expressRouterError(new AppLogicError(`Cannot ${req.method} ${req.url}! API not found`, 404), req, resp);
        })

        server.listen(ENV.HTTP_PORT, function () {
            console.log(`Listen on port ${ENV.HTTP_PORT} ...`);
        });

        JobManager.jobs.push(new UpdatePageJob());
        JobManager.start(true);

        CollectorManager.start();

        return 0;
    }

    static expressRouterResponse(data: any, req: express.Request, resp: express.Response) {
        let appResp = new AppApiResponse();
        if (data instanceof AppApiResponse) {
            appResp = data;
        }
        else {
            appResp.success = true;
            appResp.httpCode = 200;
            appResp.data = data;
        }

        this.doResponse(appResp, resp);
    }

    static expressRouterError(err: any, req: express.Request, resp: express.Response) {
        let appResp = new AppApiResponse();
        appResp.success = false;
        appResp.err = {
            message: err.message || 'Unknown error',
            code: err.code,
            params: err.params
        }
        appResp.httpCode = _.isNumber(err.httpCode) ? err.httpCode : 500;

        this.doResponse(appResp, resp);
    }

    static doResponse(appResp: AppApiResponse, resp: express.Response) {
        // Remove http code from response body
        if (_.isNumber(appResp.httpCode)) {
            resp.statusCode = appResp.httpCode;
        }
        delete appResp.httpCode;

        // Remove headers from response body
        if (!_.isEmpty(appResp.headers)) {
            _.keys(appResp.headers).forEach(h => resp.setHeader(h, appResp.headers[h]));
        }
        delete appResp.headers;

        resp.send(appResp);
    }
}

Program.main();
