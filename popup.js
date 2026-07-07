const HIGHLIGHTS_KEY = "highlights";
const PINS_KEY = "pins";

const saveBtn = document.getElementById("saveBtn");
const copyBtn = document.getElementById("copyBtn");
const clearBtn = document.getElementById("clearBtn");
const statusEl = document.getElementById("status");
const listEl = document.getElementById("highlightList");

const pinInput = document.getElementById("pinInput");
const addPinBtn = document.getElementById("addPinBtn");
const pinListEl = document.getElementById("pinList");

function showStatus(message) {
  statusEl.textContent = message;
  setTimeout(() => {
    if (statusEl.textContent === message) statusEl.textContent = "";
  }, 3000);
}

function getList(key) {
  return chrome.storage.local.get(key).then((data) => data[key] || []);
}

function setList(key, list) {
  return chrome.storage.local.set({ [key]: list });
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function toBlockquote(text) {
  return text
    .split("\n")
    .map((line) => "> " + line)
    .join("\n");
}

// ---- Highlights ----

function renderHighlights(highlights) {
  listEl.innerHTML = "";

  if (highlights.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No highlights saved yet.";
    listEl.appendChild(empty);
    return;
  }

  highlights.forEach((highlight) => {
    const item = document.createElement("div");
    item.className = "highlight-item";

    const header = document.createElement("div");
    header.className = "item-header";

    const quote = document.createElement("blockquote");
    quote.textContent = highlight.text;

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", async () => {
      const current = await getList(HIGHLIGHTS_KEY);
      const updated = current.filter((h) => h.id !== highlight.id);
      await setList(HIGHLIGHTS_KEY, updated);
      await refreshHighlights();
      showStatus("Highlight deleted.");
    });

    header.appendChild(quote);
    header.appendChild(deleteBtn);

    const noteInput = document.createElement("textarea");
    noteInput.placeholder = "Add a note...";
    noteInput.value = highlight.note || "";
    noteInput.addEventListener("change", async () => {
      const current = await getList(HIGHLIGHTS_KEY);
      const target = current.find((h) => h.id === highlight.id);
      if (target) target.note = noteInput.value;
      await setList(HIGHLIGHTS_KEY, current);
    });

    item.appendChild(header);
    item.appendChild(noteInput);
    listEl.appendChild(item);
  });
}

async function refreshHighlights() {
  renderHighlights(await getList(HIGHLIGHTS_KEY));
}

saveBtn.addEventListener("click", async () => {
  const tab = await getActiveTab();
  if (!tab || !tab.id) {
    showStatus("No active tab found.");
    return;
  }

  let results;
  try {
    results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection().toString(),
    });
  } catch (err) {
    showStatus("Can't access this page.");
    return;
  }

  const text = results?.[0]?.result?.trim();
  if (!text) {
    showStatus("No text selected on the page.");
    return;
  }

  const highlights = await getList(HIGHLIGHTS_KEY);
  highlights.push({ id: Date.now().toString(), text, note: "" });
  await setList(HIGHLIGHTS_KEY, highlights);
  await refreshHighlights();
  showStatus("Highlight saved.");
});

clearBtn.addEventListener("click", async () => {
  await setList(HIGHLIGHTS_KEY, []);
  await refreshHighlights();
  showStatus("All highlights cleared.");
});

// ---- Pinned Notes ----

function renderPins(pins) {
  pinListEl.innerHTML = "";

  if (pins.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No pinned notes yet.";
    pinListEl.appendChild(empty);
    return;
  }

  pins.forEach((pin) => {
    const item = document.createElement("div");
    item.className = "pin-item";

    const text = document.createElement("span");
    text.textContent = pin.text;

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", async () => {
      const current = await getList(PINS_KEY);
      const updated = current.filter((p) => p.id !== pin.id);
      await setList(PINS_KEY, updated);
      await refreshPins();
      showStatus("Pin deleted.");
    });

    item.appendChild(text);
    item.appendChild(deleteBtn);
    pinListEl.appendChild(item);
  });
}

async function refreshPins() {
  renderPins(await getList(PINS_KEY));
}

async function addPin() {
  const text = pinInput.value.trim();
  if (!text) {
    showStatus("Pin note is empty.");
    return;
  }

  const pins = await getList(PINS_KEY);
  pins.push({ id: Date.now().toString(), text });
  await setList(PINS_KEY, pins);
  pinInput.value = "";
  await refreshPins();
  showStatus("Pin added.");
}

addPinBtn.addEventListener("click", addPin);
pinInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addPin();
});

// ---- Copy as Markdown ----

copyBtn.addEventListener("click", async () => {
  const highlights = await getList(HIGHLIGHTS_KEY);

  if (highlights.length === 0) {
    showStatus("No highlights to copy.");
    return;
  }

  const tab = await getActiveTab();
  let markdown = `# ChatNote\n\nSource: ${tab?.title || ""}\n\nURL: ${tab?.url || ""}\n\n`;

  highlights.forEach((highlight, index) => {
    markdown += `## Highlight ${index + 1}\n\n${toBlockquote(highlight.text)}\n\nMy Note:\n\n${highlight.note || ""}\n\n`;
  });

  await navigator.clipboard.writeText(markdown.trim() + "\n");
  showStatus("Copied to clipboard.");
});

// ---- Init ----

refreshHighlights();
refreshPins();
