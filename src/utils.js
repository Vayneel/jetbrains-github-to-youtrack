import "dotenv/config";

export function getEnvVar(name) {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value.trim();
}

export function getEnvVarOptional(name) {
  const value = process.env[name];
  return value ? value.trim() : undefined;
}

export const logger = {
  info: (...args) => console.log("[INFO]", ...args),
  warn: (...args) => console.warn("[WARN]", ...args),
  error: (...args) => console.error("[ERROR]", ...args),
  debug: (...args) => {
    if (process.env.DEBUG === "1" || process.env.DEBUG === "true") {
      console.debug("[DEBUG]", ...args);
    }
  },
};
