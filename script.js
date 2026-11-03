
"use strict";

/* =====================================
   CYBERBUDDY - CHAT APPLICATION
   Cloudflare Worker + Groq
   ===================================== */

const API_URL =
    "https://cyberbuddy-api.jeslinj444.workers.dev/api/chat";

const STORAGE_KEY = "cyberbuddy_conversations_v1";

let conversations = [];
let activeConversationId = null;
let isSending = false;

const elements = {
    form: document.getElementById("chatForm"),
    input: document.getElementById("messageInput"),
    send: document.getElementById("sendBtn"),
    messages: document.getElementById("messages"),
    welcome: document.getElementById("welcomeScreen"),
    list: document.getElementById("conversationList"),
    newChat: document.getElementById("newChatBtn"),
    toast: document.getElementById("toast")
};

function createId() {
    return crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(36) +
          Math.random().toString(36).slice(2);
}

function getActiveConversation() {
    return conversations.find(
        item => item.id === activeConversationId
    );
}

function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.style.display = "block";

    clearTimeout(showToast.timer);

    showToast.timer = setTimeout(() => {
        elements.toast.style.display = "none";
    }, 3500);
}

function saveConversations() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(conversations)
        );
    } catch (error) {
        console.error("Could not save conversations:", error);
        showToast("Conversation storage is unavailable.");
    }
}

function loadConversations() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const parsed = stored ? JSON.parse(stored) : [];

        conversations = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("Could not load history:", error);
        conversations = [];
    }
}

function createNewConversation() {
    const conversation = {
        id: createId(),
        title: "New investigation",
        messages: [],
        updatedAt: new Date().toISOString()
    };

    conversations.unshift(conversation);
    activeConversationId = conversation.id;

    saveConversations();
    renderConversationList();
    renderMessages();

    elements.input.focus();
}

function openConversation(id) {
    activeConversationId = id;
    renderConversationList();
    renderMessages();
}

function renderConversationList() {
    elements.list.replaceChildren();

    conversations.forEach(conversation => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "conversation-item";

        if (conversation.id === activeConversationId) {
            button.classList.add("active");
        }

        button.textContent = conversation.title;

        button.addEventListener("click", () => {
            openConversation(conversation.id);
        });

        elements.list.appendChild(button);
    });
}

function renderAssistantContent(container, content) {
    const text = String(content || "");

    if (
        typeof marked !== "undefined" &&
        typeof DOMPurify !== "undefined"
    ) {
        const html = marked.parse(text);

        container.innerHTML = DOMPurify.sanitize(html);
    } else {
        container.textContent = text;
    }
}

function createMessageElement(role, content) {
    const wrapper = document.createElement("div");
    wrapper.className = `message ${role}`;

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    if (role === "assistant") {
        renderAssistantContent(bubble, content);
    } else {
        bubble.textContent = content;
    }

    wrapper.appendChild(bubble);

    return wrapper;
}

function renderMessages() {
    elements.messages.replaceChildren();

    const conversation = getActiveConversation();

    const hasMessages =
        conversation &&
        Array.isArray(conversation.messages) &&
        conversation.messages.length > 0;

    elements.welcome.style.display =
        hasMessages ? "none" : "block";

    if (!hasMessages) return;

    conversation.messages.forEach(message => {
        const element = createMessageElement(
            message.role,
            message.content
        );

        elements.messages.appendChild(element);
    });

    elements.messages.scrollTop =
        elements.messages.scrollHeight;
}

function showTypingIndicator() {
    const indicator = document.createElement("div");

    indicator.id = "typingIndicator";
    indicator.className = "typing";
    indicator.textContent = "CyberBuddy is thinking...";

    elements.messages.appendChild(indicator);

    elements.messages.scrollTop =
        elements.messages.scrollHeight;
}

function removeTypingIndicator() {
    document.getElementById("typingIndicator")?.remove();
}

function addMessageToConversation(role, content) {
    const conversation = getActiveConversation();

    if (!conversation) return;

    conversation.messages.push({
        role,
        content,
        timestamp: new Date().toISOString()
    });

    conversation.updatedAt = new Date().toISOString();

    if (
        role === "user" &&
        conversation.messages.length === 1
    ) {
        conversation.title =
            content.length > 35
                ? content.slice(0, 35) + "..."
                : content;
    }

    saveConversations();
}

async function sendMessage(rawMessage) {
    const message = String(rawMessage || "").trim();

    if (!message || isSending) return;

    if (message.length > 10000) {
        showToast("Message is too long.");
        return;
    }

    if (!activeConversationId) {
        createNewConversation();
    }

    isSending = true;
    elements.send.disabled = true;

    elements.welcome.style.display = "none";

    addMessageToConversation("user", message);

    elements.input.value = "";
    elements.input.style.height = "auto";

    renderMessages();
    renderConversationList();
    showTypingIndicator();

    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
        controller.abort();
    }, 60000);

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: message
            }),
            signal: controller.signal
        });

        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error("The server returned invalid JSON.");
        }

        if (!response.ok) {
            throw new Error(
                data.error || `Server error: ${response.status}`
            );
        }

        if (data.success === false) {
            throw new Error(data.error || "The API request failed.");
        }

        const reply =
            data.reply ||
            data.response ||
            data.message;

        if (typeof reply !== "string" || !reply.trim()) {
            throw new Error("The AI returned an empty response.");
        }

        removeTypingIndicator();

        addMessageToConversation("assistant", reply);

        renderMessages();
        renderConversationList();

    } catch (error) {
        console.error("CyberBuddy request failed:", error);

        removeTypingIndicator();

        let messageToShow;

        if (error.name === "AbortError") {
            messageToShow =
                "The request timed out. Please try again.";
        } else if (error instanceof TypeError) {
            messageToShow =
                "Network or CORS error. Check your Cloudflare Worker settings.";
        } else {
            messageToShow = error.message;
        }

        addMessageToConversation(
            "assistant",
            "**Connection error:** " + messageToShow
        );

        renderMessages();

        showToast("CyberBuddy could not complete the request.");
    } finally {
        clearTimeout(timeoutId);

        isSending = false;
        elements.send.disabled = false;
        elements.input.focus();
    }
}

/* Form submission */
elements.form.addEventListener("submit", event => {
    event.preventDefault();

    sendMessage(elements.input.value);
});

/* Enter to send, Shift + Enter for new line */
elements.input.addEventListener("keydown", event => {
    if (
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.isComposing
    ) {
        event.preventDefault();
        elements.form.requestSubmit();
    }
});

/* Auto resize input */
elements.input.addEventListener("input", () => {
    elements.input.style.height = "auto";

    elements.input.style.height =
        Math.min(elements.input.scrollHeight, 150) + "px";
});

/* New conversation */
elements.newChat.addEventListener("click", () => {
    createNewConversation();
});

/* Suggested prompts */
document.querySelectorAll("[data-prompt]").forEach(button => {
    button.addEventListener("click", () => {
        sendMessage(button.dataset.prompt);
    });
});

/* Navigation placeholders */
document.getElementById("dashboardBtn")
    .addEventListener("click", () => {
        showToast("Dashboard module is coming soon.");
    });

document.getElementById("clientsBtn")
    .addEventListener("click", () => {
        showToast("Client workspace module is coming soon.");
    });

document.getElementById("reportsBtn")
    .addEventListener("click", () => {
        showToast("Investigation reports module is coming soon.");
    });

/* Initialise */
function initialiseCyberBuddy() {
    console.log("CyberBuddy initialising...");

    loadConversations();

    if (conversations.length > 0) {
        activeConversationId = conversations[0].id;
        renderConversationList();
        renderMessages();
    } else {
        createNewConversation();
    }

    console.log("CyberBuddy frontend ready.");
}

initialiseCyberBuddy();
