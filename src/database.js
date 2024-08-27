import sqlite3 from "sqlite3";
import fs from "fs";
function configureDatabase() {
  if (process.env.DATABASE_PATH === undefined) {
    console.error("DATABASE_PATH is not defined.");
    process.exit(1);
  }

  console.log("Configuring database at", process.env.DATABASE_PATH);

  const db = new sqlite3.Database(process.env.DATABASE_PATH);

  db.serialize(() => {
    db.run(
      "CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, message TEXT, model TEXT, chatHistoryLimit INTEGER, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)"
    );
  });

  db.close();
}

// configureDatabase();

function getDatabase() {

  if (process.env.DATABASE_PATH === undefined) {
    console.error("DATABASE_PATH is not defined.");
    process.exit(1);
  } else {
    // Check if the dataset exists
    // If it does not exists, configure a new database
    if (!fs.existsSync(process.env.DATABASE_PATH)) {
      console.log("Database does not exist. Creating a new one...");
      configureDatabase();
    } else {
      console.log("Database exists.");
    }
  }

  return new sqlite3.Database(process.env.DATABASE_PATH);
}

export { configureDatabase, getDatabase };
