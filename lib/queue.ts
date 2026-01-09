import PQueue from 'p-queue';
import { env } from './config';

const queue = new PQueue({ concurrency: env.concurrency });

export async function queueTask<T>(
  task: () => Promise<T>,
  priority = 0
): Promise<T> {
  return queue.add(task, { priority }) as Promise<T>;
}

export function getQueueStatus() {
  return {
    size: queue.size + queue.pending,
    pending: queue.size,
    running: queue.pending,
    concurrency: queue.concurrency,
    eventMode: env.eventMode
  };
}
