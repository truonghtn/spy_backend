import * as moment from 'moment';
import * as schedule from 'node-schedule';
import { UpdatePageJob } from './update_page';
import { UpdatePostJob } from './update_post';

export interface IJob {
    init?(): Promise<void>;
    scheduleJob?: schedule.Job;
    rule: string;
    doJob(time: moment.Moment): Promise<void>
}

export class JobServ {
    jobs: IJob[] = [
        new UpdatePageJob,
        new UpdatePostJob
    ];

    async start(startup = false) {
        for (const job of this.jobs) {
            job.init && await job.init()

            if (startup) {
                job.doJob(moment());
            }

            job.scheduleJob = schedule.scheduleJob(job.rule, () => {
                job.doJob(moment());
            })
        }
    }
}

export const JobManager = new JobServ();