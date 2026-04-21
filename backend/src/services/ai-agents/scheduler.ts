import cron from 'node-cron';
import reconciliationAgent from './reconciliation.agent';
import anomalyAgent from './anomaly.agent';
import insightAgent from './insight.agent';
import cashierScoringAgent from './cashier-scoring.agent';
import autoSaveAgent from './auto-save.agent';
import creditScoringAgent from './credit-scoring.agent';

/**
 * AI Agent Scheduler
 * All Node.js cron jobs run inside Railway deployment
 * No extra infrastructure needed
 */

interface JobConfig {
  name: string;
  schedule: string;
  timezone: string;
  runOnStartup: boolean;
  agent: () => Promise<any>;
}

const JOBS: JobConfig[] = [
  {
    name: 'Reconciliation Agent',
    schedule: '0 21 * * *', // Nightly 9pm
    timezone: 'Africa/Nairobi',
    runOnStartup: false,
    agent: () => reconciliationAgent.run(),
  },
  {
    name: 'Anomaly Detection Agent',
    schedule: '0 * * * *', // Hourly
    timezone: 'Africa/Nairobi',
    runOnStartup: false,
    agent: () => anomalyAgent.run(),
  },
  {
    name: 'Business Insight Agent',
    schedule: '0 7 * * 1', // Weekly Monday 7am
    timezone: 'Africa/Nairobi',
    runOnStartup: false,
    agent: () => insightAgent.run(),
  },
  {
    name: 'Cashier Scoring Agent',
    schedule: '30 2 * * *', // Nightly 2:30am
    timezone: 'Africa/Nairobi',
    runOnStartup: false,
    agent: () => cashierScoringAgent.run(),
  },
  {
    name: 'Auto-Save Optimizer',
    schedule: '0 6 * * *', // Daily 6am
    timezone: 'Africa/Nairobi',
    runOnStartup: false,
    agent: () => autoSaveAgent.run(),
  },
  {
    name: 'Credit Scoring Agent',
    schedule: '0 3 * * 1', // Weekly Monday 3am
    timezone: 'Africa/Nairobi',
    runOnStartup: false,
    agent: () => creditScoringAgent.run(),
  },
];

export class AgentScheduler {
  private tasks: Map<string, cron.ScheduledTask> = new Map();
  private isRunning: boolean = false;

  /**
   * Start all scheduled jobs
   */
  start(): void {
    if (this.isRunning) {
      console.log('[AgentScheduler] Already running');
      return;
    }

    console.log('[AgentScheduler] Starting all agents...');

    for (const job of JOBS) {
      try {
        // Validate cron expression
        if (!cron.validate(job.schedule)) {
          console.error(`[AgentScheduler] Invalid schedule for ${job.name}: ${job.schedule}`);
          continue;
        }

        // Create scheduled task
        const task = cron.schedule(
          job.schedule,
          async () => {
            console.log(`[AgentScheduler] Running ${job.name}...`);
            const startTime = Date.now();
            
            try {
              const result = await job.agent();
              const duration = Date.now() - startTime;
              console.log(`[AgentScheduler] ${job.name} completed in ${duration}ms`, result);
            } catch (error) {
              console.error(`[AgentScheduler] ${job.name} failed:`, error);
            }
          },
          {
            scheduled: true,
            timezone: job.timezone,
          }
        );

        this.tasks.set(job.name, task);
        console.log(`[AgentScheduler] Scheduled ${job.name} (${job.schedule})`);

        // Run on startup if configured
        if (job.runOnStartup) {
          console.log(`[AgentScheduler] Running ${job.name} on startup...`);
          job.agent().catch(error => {
            console.error(`[AgentScheduler] ${job.name} startup run failed:`, error);
          });
        }
      } catch (error) {
        console.error(`[AgentScheduler] Failed to schedule ${job.name}:`, error);
      }
    }

    this.isRunning = true;
    console.log('[AgentScheduler] All agents scheduled');
  }

  /**
   * Stop all scheduled jobs
   */
  stop(): void {
    console.log('[AgentScheduler] Stopping all agents...');
    
    for (const [name, task] of this.tasks) {
      task.stop();
      console.log(`[AgentScheduler] Stopped ${name}`);
    }
    
    this.tasks.clear();
    this.isRunning = false;
    console.log('[AgentScheduler] All agents stopped');
  }

  /**
   * Run a specific agent immediately (for testing)
   */
  async runNow(jobName: string): Promise<any> {
    const job = JOBS.find(j => j.name === jobName);
    if (!job) {
      throw new Error(`Unknown job: ${jobName}`);
    }

    console.log(`[AgentScheduler] Manually running ${jobName}...`);
    return await job.agent();
  }

  /**
   * Get status of all jobs
   */
  getStatus(): Array<{
    name: string;
    schedule: string;
    nextRun: string | null;
    running: boolean;
  }> {
    return JOBS.map(job => {
      const task = this.tasks.get(job.name);
      return {
        name: job.name,
        schedule: job.schedule,
        nextRun: this.getNextRunTime(job.schedule, job.timezone),
        running: !!task,
      };
    });
  }

  /**
   * Calculate next run time
   */
  private getNextRunTime(schedule: string, timezone: string): string | null {
    try {
      // This is a simplified version - in production use a proper cron parser
      return 'See cron schedule: ' + schedule;
    } catch {
      return null;
    }
  }
}

// Export singleton instance
export const agentScheduler = new AgentScheduler();

// Export individual agents for manual testing
export {
  reconciliationAgent,
  anomalyAgent,
  insightAgent,
  cashierScoringAgent,
  autoSaveAgent,
  creditScoringAgent,
};

// Default export for convenience
export default agentScheduler;
