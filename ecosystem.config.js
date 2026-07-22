module.exports = {
  apps: [
    {
      name: "pos-api",
      script: "dist/main.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3010,
        // Fill in with the real production database, secrets, and Omise live keys before
        // deploying - the values below are dev-only placeholders, not safe to run as-is.
        DATABASE_URL: "postgresql://postgres:postgres@localhost:5433/pos_services?schema=public",
        CORS_ORIGINS: "https://pos-admin.beautyup-enterprise.com,https://pos-sales.beautyup-enterprise.com",
        BACKEND_PUBLIC_URL: "https://pos-api.beautyup-enterprise.com",
        JWT_SECRET: "CHANGE_ME",
        JWT_EXPIRES_IN: "7d",
        PLATFORM_JWT_SECRET: "CHANGE_ME",
        PLATFORM_JWT_EXPIRES_IN: "7d",
        CUSTOMER_JWT_SECRET: "CHANGE_ME",
        CUSTOMER_JWT_EXPIRES_IN: "30d",
        OMISE_PUBLIC_KEY: "CHANGE_ME",
        OMISE_SECRET_KEY: "CHANGE_ME",
      },
    },
  ],
};
