module.exports = {
  apps: [
    {
      name: "maybeoneday-public",
      script: "./app.js",
      watch: false,
      time: true,
      env_development: {
        NODE_ENV: "development",
        OPENAI_API_KEY: "YOUR_OPENAI_API_KEY",
        OPENAI_ORG: "YOUR_OPENAI_ORG",
        OPENAI_PROJECT: "YOUR_OPENAI_PROJECT",
        DATABASE_PATH: "YOUR_DATABASE_PATH",
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
        OPENAI_API_KEY: "YOUR_OPENAI_API_KEY",
        OPENAI_ORG: "YOUR_OPENAI_ORG",
        OPENAI_PROJECT: "YOUR_OPENAI_PROJECT",
        DATABASE_PATH: "YOUR_DATABASE_PATH",
        PORT: 3000,
      },
    },
  ],
};
