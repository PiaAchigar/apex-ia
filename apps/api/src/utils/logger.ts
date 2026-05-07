import pino from "pino";

const pinoConfig = {
  level: process.env["NODE_ENV"] === "production" ? "info" : "debug",
  formatters: {
    level(label: string) {
      return { level: label };
    },
  },
  base: {
    env: process.env["NODE_ENV"],
  },
};

if (process.env["NODE_ENV"] !== "production") {
  (pinoConfig as any).transport = {
    target: "pino-pretty",
    options: { colorize: true },
  };
}

export const logger = pino(pinoConfig);
