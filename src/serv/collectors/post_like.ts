import { ICollector } from './collector';
import _ = require('lodash');
import { Post } from '../../models';

export class PostLikeCollector implements ICollector {
    isMatched(msg: any): boolean {
        return msg.type == 'n_like_api' && _.isString(msg.postId)
    }

    async process(msg: any): Promise<any> {
        const postId: string = msg.postId;
        const nLike: number = msg.nLike;
        const result = await Post.updateOne({ pid: postId }, { $set: { n_like: nLike } })
        // TODO: insert like history
        return result;
    }

}