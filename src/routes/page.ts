import * as express from 'express';
import ERR from '../glob/err';
import HC from '../glob/hc';
import { User, Page, IPage, Post } from '../models/index';
import AuthServ from '../serv/auth';
import { UserServ } from '../serv/user';
import { ajv2 } from '../utils/ajv2';
import _ from '../utils/_';
import { ExpressRouter, POST, GET, PUT, Body, Params } from 'express-router-ts';
import { ValidBody } from '../utils/decors';
import CONN from '../glob/conn';

class PageRouter extends ExpressRouter {
    @POST({ path: '/' })
    @ValidBody({
        '+@pid': 'string',
        '+@url': 'string',
        '+@country_code': 'number',
        '++': false
    })
    async addNewPage(@Body('pid') pid: string, @Body('url')  url: string, @Body('country_code') country_code: number) {
        const page: IPage = {
            pid: pid,
            url: url,
            country_code: country_code,
            last_update: 0,
            status: 'UPDATED',

            created_at: new Date().valueOf()
        };

        console.log('===> Add page:', page);

        const result = await Page.insertOne(page);
        page._id = result.insertedId;

        return page;
    }

    @GET({ path: '/:id' })
    async getPage(@Params('id') pid: string) {
        const pages = await Post.find({ page_pid: pid }).limit(50).toArray();

        return pages;
    }

    @PUT({ path: '/:id/post' })
    async getPosts(@Params('id') pid: string) {
        const page = await Page.findOne({ pid: pid });

        const msg = {
            type: "ad_api",
            pageId: page.pid,
            country_code: page.country_code
        };

        const scrapeQueue = "scraper_reqs";
        const replyQueue = "scraper_resp"
        const rmqChannel = await CONN.RMQ.createChannel();
        rmqChannel.checkQueue('scraper_reqs');

        rmqChannel.sendToQueue(scrapeQueue, Buffer.from(JSON.stringify(msg)), { replyTo: replyQueue });
        console.log('====>', `Emit event ${scrapeQueue} with data ${JSON.stringify(msg)}`)

        await Page.updateMany({ _id: page.pid }, { $set: { status: 'UPDATING', last_update: new Date().valueOf() } })
    }
}

export default new PageRouter;
