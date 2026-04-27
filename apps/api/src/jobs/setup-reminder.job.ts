import { Queue, Worker } from "bullmq";
import { and, isNull, eq } from "drizzle-orm";
import { db } from "../db/drizzle.js";
import { organizations, users, roles } from "@apex-ia/database/schema/public";
import { logger } from "../utils/logger.js";

const REDIS_URL = process.env["REDIS_URL"] ?? "redis://localhost:6379";
const QUEUE_NAME = "setup-reminders";

let _queue: Queue | null = null;

export function getSetupReminderQueue(): Queue {
  if (!_queue) {
    _queue = new Queue(QUEUE_NAME, {
      connection: { url: REDIS_URL },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });
  }
  return _queue;
}

const REMINDER_DAYS = [1, 3, 7]; // days after createdAt

export async function sendSetupReminders(): Promise<void> {
  const now = new Date();

  const remindOrgs = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      createdAt: organizations.createdAt,
    })
    .from(organizations)
    .where(isNull(organizations.setupCompletedAt));

  for (const org of remindOrgs) {
    if (!org.createdAt) continue;

    const daysSince = Math.floor(
      (now.getTime() - org.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (!REMINDER_DAYS.includes(daysSince)) continue;

    const [admin] = await db
      .select({ email: users.email })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(
        and(eq(users.organizationId, org.id), eq(roles.name, "admin"))
      )
      .limit(1);

    if (!admin) continue;

    logger.info(
      { orgId: org.id, daysSince, email: admin.email },
      "Setup reminder queued"
    );

    await getSetupReminderQueue().add(
      "send-reminder",
      {
        orgId: org.id,
        orgName: org.name,
        email: admin.email,
        daysSince,
        setupUrl: `${process.env["NEXT_PUBLIC_APP_URL"]}/setup`,
      },
      { jobId: `setup-reminder:${org.id}:day${daysSince}` }
    );
  }
}

export function startSetupReminderWorker(): Worker {
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { orgName, email, daysSince, setupUrl } = job.data as {
        orgId: string;
        orgName: string;
        email: string;
        daysSince: number;
        setupUrl: string;
      };

      // TODO: integrate with EmailService when implemented in Fase 5
      logger.info(
        { email, orgName, daysSince },
        `[REMINDER] day ${daysSince} — setup pending, would send email to ${email}`
      );

      // Placeholder: replace with actual email sending
      // await emailService.sendSetupReminder({ to: email, orgName, daysSince, setupUrl });
    },
    { connection: { url: REDIS_URL }, concurrency: 5 }
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, "Setup reminder job failed");
  });

  return worker;
}

// Cron: run every hour (register with BullMQ repeat when app starts)
export async function scheduleSetupReminderCron(): Promise<void> {
  const queue = getSetupReminderQueue();

  await queue.add(
    "cron-tick",
    {},
    {
      repeat: { pattern: "0 * * * *" }, // every hour
      jobId: "setup-reminder-cron",
    }
  );

  // Wire cron tick to actually run reminders
  new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name === "cron-tick") {
        await sendSetupReminders();
      }
    },
    { connection: { url: REDIS_URL } }
  );

  logger.info("Setup reminder cron scheduled (every hour)");
}
