import { ICollector } from './collector';
import _ = require('lodash');
import { Page, Post } from '../../models';
import CONN from '../../glob/conn';

export class PageAdsCollector implements ICollector {
    isMatched(msg: any): boolean {
        return msg.type == 'ad_api' && _.isString(msg.pageId)
    }

    async process(msg: any): Promise<any> {
        const pageId: string = msg.pageId;

        const page = await Page.findOne({ pid: pageId });

        const scraperCollection = CONN.SCRAPER_MONGO.collection('ad_posts')
        const q = { page_id: pageId }
        if (page.last_post_id) q['_id'] = { $gt: page.last_post_id }
        const newPostData = await scraperCollection.find(q).sort({ _id: 1 }).toArray();

        if (newPostData && newPostData.length > 0) {
            const newPosts = newPostData.map(d => ({
                scrapeId: d._id,
                pid: d.pid,
                url: d.url,

                img_urls: d.img_urls,
                content: d.content,

                page: page._id,
                page_pid: pageId,

                last_update: 0,
                status: 'UPDATED',

                n_like: 0,
                n_comment: 0,

                created_at: new Date().valueOf()
            }));

            await Post.insertMany(newPosts, { ordered: false });
        }

        const pageUpdate = { status: 'UPDATED' }
        const lastPost = _.last(newPostData);
        if (lastPost) {
            pageUpdate['last_post_id'] = lastPost._id;
        }
        await Page.updateOne({ _id: page._id }, { $set: pageUpdate });
    }

}