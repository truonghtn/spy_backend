import * as rmq from 'amqplib'
import * as moment from 'moment';
import * as schedule from 'node-schedule';
import { IJob } from "./job";
import { Page } from '../../models';
import CONN from '../../glob/conn';


export class UpdatePageJob implements IJob {
    scheduleJob: schedule.Job
    rmqChannel: rmq.Channel;
    readonly scrapeQueue = 'scraper_reqs'
    readonly replyQueue = 'scraper_resp'

    get rule() {
        return '0 */30 * * * *' // every 30 mins
    }

    async init() {
        this.rmqChannel = await CONN.RMQ.createChannel();
        this.rmqChannel.checkQueue(this.scrapeQueue)
    }

    async doJob(time: moment.Moment) {
        const pages = await Page.find({ last_update: { $lt: time.clone().subtract(4, 'h').valueOf() }, status: 'UPDATED' }, { fields: ['pid'] }).toArray();
        if (pages.length <= 0) return;

        pages.forEach(p => {
            const msg = {
                type: "ad_api",
                pageId: p.pid,
                country_code: p.country_code
            };
            this.rmqChannel.sendToQueue(this.scrapeQueue, Buffer.from(JSON.stringify(msg)), { replyTo: this.replyQueue });
            console.log('====>', `Emit event ${this.scrapeQueue} with data ${JSON.stringify(msg)}`)
        })

        await Page.updateMany({ _id: { $in: pages.map(p => p._id) } }, { '$set': { status: 'UPDATING', last_update: new Date().valueOf() } })
    }
}