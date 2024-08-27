import express from "express";
import OpenAI from "openai";
import { Server } from "socket.io";
import http, { get } from "http";
import {
  chatterList,
  MIN_INTERVAL,
  MAX_INTERVAL,
  BASE_INTERVAL,
  LAST_N_ROWS,
  CHAT_HISTORY_UPPER_LIMIT,
  CHAT_HISTORY_LOWER_LIMIT,
} from "./src/constants.js";
import { configureCORS } from "./src/cors.js";
import { getDatabase } from "./src/database.js";

// OpenAI credentials
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG,
  project: process.env.OPENAI_PROJECT,
});

// SQLite3 database
const db = getDatabase();

// Conversation rate
let activeUsers = 0;

let lastMessageTime = Date.now();
let lastMessageInterval = calculateConversationUpdateInterval();
/**
 * Takes a model and message history and returns the response from the model.
 *
 * @param {string} model - The model to use for generating the response.
 * @param {Array} messages - The message history to provide as input to the model.
 * @returns {string} - The response generated by the model.
 */
async function chat(model, messages) {
  try {
    console.log("Sending messages to OpenAI:", messages);
    console.log("Using model:", model);
    const completion = await openai.chat.completions.create({
      model: model,
      messages: messages,
    });
    // console.log("Received completion:", completion.choices[0].message);
    return completion.choices[0].message;
  } catch (error) {
    console.error("Error handling /chat request:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

/**
 * Creates a chat payload object based on the provided name, rows, and chatterList.
 * @param {string} name - The name of the chatter.
 * @param {Array} rows - An array of message rows.
 * @param {Array} chatterList - An array of chatter objects.
 * @returns {Object|null} The chat payload object containing model, system, and messages, or null if the chatter is not found.
 */
async function createChatPayload(name, rows, chatterList) {
  const chatterSelected = chatterList.find((chatter) => chatter.name === name);

  if (!chatterSelected) {
    console.error("Chatter not found:", name);
    return null;
  } else {
    const { model, system } = chatterSelected;

    // First invert the rows so that the earliest message is first
    rows = rows.reverse();

    const messages = rows.map((row) => {
      return {
        role: row.name === name ? "assistant" : "user",

        content: row.message,
      };
    });

    return { model, system, messages };
  }
}

/**
 * Sends a message to a chat system.
 * @param {string} name - The name of the sender.
 * @returns {Promise<void>} - A Promise that resolves when the message is sent.
 */
async function sendMessage(name) {
  // Random number between upper and lower limit
  const chatHistoryLimit = Math.floor(
    Math.random() * (CHAT_HISTORY_UPPER_LIMIT - CHAT_HISTORY_LOWER_LIMIT + 1) +
      CHAT_HISTORY_LOWER_LIMIT
  );
  const rows = await getLastNRows(chatHistoryLimit);

  const payload = await createChatPayload(name, rows, chatterList);

  if (!payload) {
    console.error("Error creating chat payload for:", person);
    return;
  }

  const { model, system, messages } = payload;

  let response;
  try {
    response = await chat(model, [...system, ...messages]);
  } catch (error) {
    console.error("Error handling /chat request:", error);
    // Wait for 10 seconds before trying again
    await new Promise((resolve) => setTimeout(resolve, 10000));
    response = await chat(model, [...system, ...messages]);
  }
  // console.log("Received response from OpenAI:", response);

  await insertMessage(name, response.content, model, chatHistoryLimit);

  const row = await getLastNRows(1).then((rows) => rows[0]);

  // Emit the new message to all connected clients
  console.log("Emitting new message:", row);
  io.emit("newMessage", {
    name: row.name,
    message: row.message,
    timestamp: row.timestamp,
  });
}

/**
 * Inserts a message into the database.
 *
 * @param {string} name - The name of the sender.
 * @param {string} message - The message content.
 * @param {string} model - The model of the message.
 * @returns {Promise<void>} - A promise that resolves when the message is inserted.
 */
async function insertMessage(name, message, model, chatHistoryLimit) {
  db.serialize(() => {
    const stmt = db.prepare(
      "INSERT INTO messages (name, message, model, chatHistoryLimit) VALUES (?, ?, ?, ?)"
    );
    stmt.run(name, message, model, chatHistoryLimit);
    stmt.finalize();
  });
}

// Function to retrieve messages
async function getLastNRows(n) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.all(
        "SELECT * FROM messages ORDER BY timestamp DESC LIMIT ?",
        n,
        (err, rows) => {
          if (err) {
            console.error("Error retrieving rows:", err);
            reject(err);
          } else {
            // console.log("Retrieved rows:", rows);
            resolve(rows);
          }
        }
      );
    });
  });
}

// Instantiate an express app, the main workhorse of this server
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

configureCORS(app);

// Set the view engine to EJS
app.set("view engine", "ejs");

// Serve static files from the public directory
app.use(express.static("public"));

// Middleware to parse JSON request bodies
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.render("index");
});

app.get("/chat", (req, res) => {
  res.render("chat");
});

io.on("connection", (socket) => {
  activeUsers++;
  io.emit("userCount", activeUsers);
  // Send the time until next message
  io.emit("timeUntilNextMessage", calculateTimeUntilNextMessage());

  socket.on("getInitialMessages", async () => {
    const rows = await getLastNRows(LAST_N_ROWS);
    socket.emit("initialMessages", rows);
  });

  socket.on("disconnect", () => {
    activeUsers--;
    io.emit("userCount", activeUsers);
    // Send updated time until next message on disconnect
    io.emit("timeUntilNextMessage", calculateTimeUntilNextMessage());
  });
});

app.post("/get-last-n-rows", async (req, res) => {
  try {
    const { n } = req.body;
    console.log("Received /get-last-n-rows request with n:", n);

    const rows = await getLastNRows(n);

    res.json({ rows });
  } catch (error) {
    console.error("Error handling /get-last-n-rows request:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/active-users", (req, res) => {
  res.json({ activeUsers });
});

function calculateConversationUpdateInterval() {
  // Calculate the interval based on the number of active users
  // We'll decrease the interval as more users join, but keep it within our limits
  const calculatedInterval = Math.max(
    MIN_INTERVAL,
    Math.min(MAX_INTERVAL, BASE_INTERVAL - activeUsers * 10000)
  );

  return calculatedInterval;
}

function calculateTimeUntilNextMessage() {
  const now = Date.now();
  const elapsedTime = now - lastMessageTime;
  const interval = lastMessageInterval;
  return Math.max(0, interval - elapsedTime);
}

async function main() {
  console.log("Chatter list:", chatterList);

  try {
    while (true) {
      const lastRow = await getLastNRows(1);
      const lastSender = lastRow.length > 0 ? lastRow[0].name : null;

      const currentSender = lastSender === 'Y' ? 'X' : 'Y';

      await sendMessage(currentSender);
      lastMessageTime = Date.now();
      lastMessageInterval = calculateConversationUpdateInterval();
      io.emit("timeUntilNextMessage", lastMessageInterval);
      await new Promise((resolve) =>
        setTimeout(resolve, lastMessageInterval)
      );
    }
  } catch (error) {
    console.error("Error in main loop:", error);
  }
}

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  main();
});
