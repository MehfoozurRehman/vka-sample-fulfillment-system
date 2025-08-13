import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

crons.interval('retry pending emails', { minutes: 1 }, internal.email.retryPendingEmails, { limit: 50 });

crons.daily('daily email summary 8am UTC', { hourUTC: 8, minuteUTC: 0 }, internal.email.sendDailySummary);

export default crons;
