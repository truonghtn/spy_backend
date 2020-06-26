import { ExpressRouter, POST, PUT, GET, Body, Params } from 'express-router-ts';
import CONN from '../glob/conn';
import { IPage, Page, Post } from '../models/index';
import { ValidBody } from '../utils/decors';
import hera, { AppLogicError } from '../utils/hera';
import { ObjectID } from 'bson';

class PostRouter extends ExpressRouter {

    @POST({ path: '/search' })
    @ValidBody({
        '@created_at': {
            '@from': 'integer|>=0',
            '@to': 'integer|>=0',
            '++': false
        },
        '@min_likes': 'integer|>=0',
        '@min_comments': 'integer|>=0',

        '@from_id': 'string',
        '@limit': 'integer|>0',
        
        '++': false
    })
    async searchPosts(@Body() body: ISearchBody) {
        const query: any = {};
        if (!hera.isEmpty(body.created_at)) {
            if (body.created_at.from > 0) {
                query['created_at'] = {$gt: body.created_at.from}
            }
            
            if (body.created_at.to > 0) {
                if (body.created_at.to < body.created_at.from) throw new AppLogicError(`Invalid created_at query`);
                query['created_at'] = {$lt: body.created_at.to}
            }
        }

        if (body.min_likes > 0) {
            query['n_like'] = {$gte: body.min_likes}
        }

        if (body.min_comments > 0) {
            query['n_comment'] = {$gte: body.min_comments}
        }

        if (ObjectID.isValid(body.from_id)) {
            query['_id'] = {$gt: ObjectID.createFromHexString(body.from_id) }
        }

        const limit = Math.min(body.limit || 50, 1000);

        return await Post.find(query).sort({_id: 1}).limit(limit).toArray();
    }

    @PUT({ path: '/:id' })
    async getDetailPost(@Params('id') pid: string) {
        const post = await Post.findOne({ pid: pid });

        const scrapeQueue = "scraper_reqs";
        const replyQueue = "scraper_resp"
        const rmqChannel = await CONN.RMQ.createChannel();
        rmqChannel.checkQueue('scraper_reqs');

        const msgs = [{
            type: "n_like_api",
            postId: post.pid
        }, {
            type: "n_comment_api",
            postId: post.pid
        }];

        msgs.forEach(msg => rmqChannel.sendToQueue(scrapeQueue, Buffer.from(JSON.stringify(msg)), { replyTo: replyQueue }));
        console.log('====>', `Emit event ${scrapeQueue} with data ${JSON.stringify(msgs)}`)

        await Post.updateMany({ _id: post.pid }, { $set: { status: 'UPDATING', last_update: new Date().valueOf() } })
    }

    @GET({ path: '/:id' })
    async getPage(@Params('id') pid: string) {
        const pages = await Post.findOne({ pid: pid });

        return pages;
    }
}

interface ISearchBody {
    created_at?: {
        from?: number;
        to?: number;
    };

    min_likes?: number;
    min_comments?: number;

    from_id?: string;
    limit?: number;
}

export default new PostRouter;
