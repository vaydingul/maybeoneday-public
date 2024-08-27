const BLINK_INTERVAL = 10;
const CONVERSATION_ANIMATE_COUNT = 0;
let socket;
let nextMessageCountdown; // Declare this at the top of the file
let serverTimeDiff = 0;

function addMessage(name, message, timestamp, animation = true) {
  const chatWindow = document.getElementById("chat-window");
  const oldCursor = document.getElementById(
    `${name === "X" ? "Y" : "X"}-cursor`
  );
  if (oldCursor) oldCursor.remove();

  // Create message bubble container
  const messageBubble = document.createElement("div");

  if (name === "X") {
    messageBubble.classList.add(
      "message-bubble",
      "p-2",
      "mb-2",
      "rounded",
      "max-w-md",
      "text-left",
      "bg-green-500",
      "self-start"
    );
  } else {
    messageBubble.classList.add(
      "message-bubble",
      "p-2",
      "mb-2",
      "rounded",
      "max-w-md",
      "text-left",
      "bg-pink-500",
      "self-end"
    );
  }

  const messageElement = document.createElement("div");
  messageElement.classList.add(
    "message",
    "message-text",
    "whitespace-pre-wrap",
    "text-left",
    "mb-2",
    "text-black"
  );

  const timestampElement = document.createElement("div");
  timestampElement.classList.add("message-timestamp");
  timestampElement.textContent = timestamp;

  const cursor = document.createElement("span");
  cursor.id = `${name}-cursor`;
  cursor.innerHTML = "&nbsp;";

  messageBubble.appendChild(messageElement);
  messageBubble.appendChild(timestampElement);
  chatWindow.appendChild(messageBubble);

  if (animation) {
    typeMessage(message, messageElement, cursor);
  } else {
    messageElement.textContent = message;
    messageElement.appendChild(cursor);
  }

  scrollToBottom();
}

function typeMessage(content, element, cursor, index = 0) {
  if (index < content.length) {
    if (cursor.parentNode === element) {
      element.removeChild(cursor);
    }
    element.textContent += content[index];
    element.appendChild(cursor);
    setTimeout(
      () => typeMessage(content, element, cursor, index + 1),
      BLINK_INTERVAL
    );
  }
  scrollToBottom();
}

function scrollToBottom() {
  const chatWindow = document.getElementById("chat-window");
  chatWindow.scrollTop = chatWindow.scrollHeight;
  updateScrollButtonVisibility();
}

function scrollToTop() {
  const chatWindow = document.getElementById("chat-window");
  chatWindow.scrollTop = 0;
  updateScrollButtonVisibility();
}

function updateScrollButtonVisibility() {
  const chatWindow = document.getElementById("chat-window");
  const scrollToTopBtn = document.getElementById("scroll-to-top");
  const scrollToBottomBtn = document.getElementById("scroll-to-bottom");

  // Show/hide scroll to top button
  if (chatWindow.scrollTop > 100) {
    scrollToTopBtn.style.opacity = "1";
  } else {
    scrollToTopBtn.style.opacity = "0";
  }

  // Show/hide scroll to bottom button
  if (
    chatWindow.scrollHeight - chatWindow.scrollTop - chatWindow.clientHeight >
    100
  ) {
    scrollToBottomBtn.style.opacity = "1";
  } else {
    scrollToBottomBtn.style.opacity = "0";
  }
}

function initializeSocket() {
  socket = io();
  socket.on("connect", () => {
    console.log("Connected to server");
    socket.emit("getInitialMessages");
  });

  socket.on("initialMessages", (rows) => {
    rows.reverse();
    for (const row of rows.slice(0, rows.length - CONVERSATION_ANIMATE_COUNT)) {
      addMessage(row.name, row.message, row.timestamp, false);
    }
    for (const row of rows.slice(
      rows.length - CONVERSATION_ANIMATE_COUNT,
      rows.length
    )) {
      addMessage(row.name, row.message, row.timestamp);
    }
  });

  socket.on("newMessage", (data) => {
    addMessage(data.name, data.message, data.timestamp);
  });

  socket.on("userCount", (count) => {
    document.getElementById(
      "active-users"
    ).textContent = `Active Users: ${count}`;
  });

  socket.on("currentMessageInterval", (time) => {
    const currentMessageInterval = Math.floor(time / 60);
    if (currentMessageInterval > 0) {
      document.getElementById(
        "current-message-interval"
      ).textContent = `Message Interval: ${currentMessageInterval} minutes`;
    } else {
      document.getElementById(
        "current-message-interval"
      ).textContent = `Message Interval: ${time} seconds`;
    }
  });

  socket.on("disconnect", () => {
    console.log("Disconnected from server");
  });

  socket.on("timeUntilNextMessage", (timeUntilNext) => {
    updateNextMessageCountdown(timeUntilNext);
  });
}

function updateNextMessageCountdown(timeUntilNext) {
  if (nextMessageCountdown) {
    clearInterval(nextMessageCountdown);
  }
  
  const updateCountdown = () => {
    if (timeUntilNext <= 0) {
      document.getElementById("current-message-interval").textContent = 
        `Next Message: 0m 0s`;
      clearInterval(nextMessageCountdown);
      return;
    }

    const minutes = Math.floor(timeUntilNext / 60000);
    const seconds = Math.floor((timeUntilNext % 60000) / 1000);
    
    document.getElementById("current-message-interval").textContent = 
      `Next Message: ${minutes}m ${seconds}s`;
    
    timeUntilNext -= 1000;
  };

  updateCountdown();
  nextMessageCountdown = setInterval(updateCountdown, 1000);
}

function initializeScrollButtons() {
  const chatWindow = document.getElementById("chat-window");
  const scrollToBottomBtn = document.getElementById("scroll-to-bottom");
  const scrollToTopBtn = document.getElementById("scroll-to-top");

  scrollToBottomBtn.addEventListener("click", scrollToBottom);
  scrollToTopBtn.addEventListener("click", scrollToTop);

  // Add scroll event listener to update button visibility
  chatWindow.addEventListener("scroll", updateScrollButtonVisibility);

  // Initial update of button visibility
  updateScrollButtonVisibility();
}

async function main() {
  initializeSocket();
  initializeScrollButtons();
}

window.onload = main;
