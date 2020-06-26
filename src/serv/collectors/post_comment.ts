import { ICollector } from './collector';
import _ = require('lodash');
import { Post } from '../../models';

export class PostCommentCollector implements ICollector {
    isMatched(msg: any): boolean {
        return msg.type == 'n_comment_api' && _.isString(msg.postId)
    }

    async process(msg: any): Promise<any> {
        const postId: string = msg.postId;
        const nComment: number = msg.nComment;
        const result = await Post.updateOne({ pid: postId }, { $set: { n_comment: nComment } })
        // TODO: insert n comment history
        return result;
    }

}