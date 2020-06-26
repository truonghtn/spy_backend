import * as moment from 'moment';
import * as schedule from 'node-schedule';
import { IJob } from "./job";
import * as rmq from 'amqplib'
import CONN from '../../glob/conn';
import { Post } from '../../models';


export class UpdatePostJob implements IJob {
    scheduleJob: schedule.Job
    rmqChannel: rmq.Channel;
    readonly scrapeQueue = 'scraper_reqs'
    readonly replyQueue = 'scraper_resp'

    get rule() {
        return '0 */5 * * * *' // every 5 mins
    }

    async init() {
        this.rmqChannel = await CONN.RMQ.createChannel();
        this.rmqChannel.checkQueue(this.scrapeQueue)
    }

    async doJob(time: moment.Moment) {
        const posts = await Post.find({ last_update: { $lt: time.clone().subtract(2, 'h').valueOf() }, status: 'UPDATED' }, { fields: ['pid'] }).limit(50).toArray();
        if (posts.length <= 0) return;

        posts.forEach(p => {
            const msgs = [{
                type: "n_like_api",
                postId: p.pid
            }, {
                type: "n_comment_api",
                postId: p.pid
            }];

            msgs.forEach(msg => this.rmqChannel.sendToQueue(this.scrapeQueue, Buffer.from(JSON.stringify(msg)), { replyTo: this.replyQueue }));
        })

        await Post.updateMany({ _id: { $in: posts.map(p => p._id) } }, { $set: { status: 'UPDATING', last_update: new Date().valueOf() } })
    }
}