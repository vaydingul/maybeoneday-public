const chatter1 = {
  name: "X",
  model: "gpt-4o-mini",
  system: [
    {
      role: "system",
      content: "YOUR VERY CREATIVE AND AWESOME SYSTEM PROMPT HERE",
    },
  ],
};

const chatter2 = {
  name: "Y",
  model: "gpt-4o-mini",
  system: [
    {
      role: "system",
      content: "YOUR VERY CREATIVE AND AWESOME SYSTEM PROMPT HERE",
    },
  ],
};

const chatterList = [chatter1, chatter2];

const MIN_INTERVAL = 30000; // 30 seconds in milliseconds
const MAX_INTERVAL = 600000; // 600 seconds in milliseconds
const BASE_INTERVAL = 300000; // 300 seconds (5 minutes) as a base

const LAST_N_ROWS = 1000;

const CHAT_HISTORY_UPPER_LIMIT = 10;
const CHAT_HISTORY_LOWER_LIMIT = 0;

export {
  chatterList,
  MIN_INTERVAL,
  MAX_INTERVAL,
  BASE_INTERVAL,
  LAST_N_ROWS,
  CHAT_HISTORY_UPPER_LIMIT,
  CHAT_HISTORY_LOWER_LIMIT,
};
