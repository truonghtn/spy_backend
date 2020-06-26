import * as rmq from 'amqplib'
import CONN from '../../glob/conn';
import { PageAdsCollector } from './page_ad';
import { PostCommentCollector } from './post_comment';
import { PostLikeCollector } from './post_like';

export interface ICollector {
    isMatched(msg: any): boolean;
    process(msg: any): Promise<any>;
}

export class CollectorServ {
    readonly listenQueue = 'scraper_resp'
    channel: rmq.Channel;

    collectors: ICollector[] = [
        new PageAdsCollector(),
        new PostCommentCollector(),
        new PostLikeCollector()
    ];

    async start() {
        if (!this.channel) {
            this.channel = await CONN.RMQ.createChannel();
            await this.channel.assertQueue(this.listenQueue);
        }

        await this.channel.consume(this.listenQueue, async (_msg) => {
            const msg = JSON.parse(_msg.content.toString())
            const matchedCollectors = this.collectors.filter(c => c.isMatched(msg));
            if (matchedCollectors.length > 0) {
                await Promise.all(matchedCollectors.map(c => c.process(msg)));
            }

            await this.channel.ack(_msg);
        });
    }
}

export const CollectorManager = new CollectorServ();