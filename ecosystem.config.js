module.exports = {
  apps: [
    {
      name: "SlugBot",
      script: "./index.js",
      instances: 1, // Use 1 instance for stability
      watch: false, // Disable file watching to prevent unnecessary restarts
      ignore_watch: ["logs", "node_modules"], // Exclude logs and node_modules from watch
      max_memory_restart: "200M", // Restart if memory exceeds 200M
      env: {
        NODE_ENV: "production",
      },
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log", // Combine stdout and stderr into a single log
      merge_logs: true, // Merge stdout and stderr into a single file
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      time: true, // Display timestamp in logs
      env_production: {
        NODE_ENV: "production",
      },
      post_update: ["npm install --production"], // Run npm install after updating
      min_uptime: 5000, // Wait for 5 seconds before considering start successful
      listen_timeout: 10000, // Give the app 10 seconds to start listening for connections
    },
  ],
};
