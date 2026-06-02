const config = require("../../config");

// Faster lookups than repeated array.find()
const JOBS = Object.create(null);

// Build validated immutable job registry
for (const job of config.JOBS) {
  // =========================
  // VALIDATION
  // =========================

  if (!job.id || typeof job.id !== "string") {
    throw new Error("Job is missing a valid string id");
  }

  if (JOBS[job.id]) {
    throw new Error(`Duplicate job id detected: ${job.id}`);
  }

  if (typeof job.coinsMin !== "number" || typeof job.coinsMax !== "number") {
    throw new Error(`Invalid coin range for job: ${job.id}`);
  }

  if (job.coinsMin > job.coinsMax) {
    throw new Error(`coinsMin cannot exceed coinsMax for job: ${job.id}`);
  }

  // Freeze prevents accidental mutation
  JOBS[job.id] = Object.freeze({
    ...job,
  });
}

/**
 * Returns all available jobs
 */
function listJobs() {
  return Object.values(JOBS);
}

/**
 * Get a job by ID
 */
function getJob(id) {
  if (!id) return null;

  return JOBS[id] || null;
}

/**
 * Check if a job exists
 */
function hasJob(id) {
  return Boolean(JOBS[id]);
}

module.exports = {
  listJobs,
  getJob,
  hasJob,
};
