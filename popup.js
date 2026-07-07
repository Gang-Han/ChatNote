const HIGHLIGHTS_KEY = "highlights";
const PINS_KEY = "pins";
const PIN_COLORS = ["yellow", "red", "green", "blue"];

const saveBtn = document.getElementById("saveBtn");
const copyBtn = document.getElementById("copyBtn");
const clearBtn = document.getElementById("clearBtn");
const statusEl = document.getElementById("status");
const listEl = document.getElementById("highlightList");

const pinInput = document.getElementById("pinInput");
const addPinBtn = document.getElementById("addPinBtn");
const pinColorPickerEl = document.getElementById("pinColorPicker");
const pinListEl = document.getElementById("pinList");

const editingHighlightIds = new Set();
const editingPinIds = new Set();

let composerColor = PIN_COLORS[0];

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

function buildColorPicker(selectedColor, onSelect) {
  const wrap = document.createElement("div");
  wrap.className = "color-picker";

  PIN_COLORS.forEach((color) => {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className =
      "color-swatch color-swatch-" + color + (color === selectedColor ? " selected" : "");
    swatch.setAttribute("aria-label", color);
    swatch.addEventListener("click", () => {
      wrap.querySelectorAll(".color-swatch").forEach((b) => b.classList.remove("selected"));
      swatch.classList.add("selected");
      onSelect(color);
    });
    wrap.appendChild(swatch);
  });

  return wrap;
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
      editingHighlightIds.delete(highlight.id);
      await setList(HIGHLIGHTS_KEY, updated);
      await refreshHighlights();
      showStatus("Highlight deleted.");
    });

    header.appendChild(quote);
    header.appendChild(deleteBtn);
    item.appendChild(header);

    if (editingHighlightIds.has(highlight.id)) {
      const noteInput = document.createElement("textarea");
      noteInput.className = "note-edit-input";
      noteInput.value = highlight.note || "";

      const actions = document.createElement("div");
      actions.className = "edit-actions";

      const saveBtn2 = document.createElement("button");
      saveBtn2.textContent = "Save";
      saveBtn2.addEventListener("click", async () => {
        const current = await getList(HIGHLIGHTS_KEY);
        const target = current.find((h) => h.id === highlight.id);
        if (target) target.note = noteInput.value;
        editingHighlightIds.delete(highlight.id);
        await setList(HIGHLIGHTS_KEY, current);
        await refreshHighlights();
      });

      const cancelBtn = document.createElement("button");
      cancelBtn.textContent = "Cancel";
      cancelBtn.addEventListener("click", async () => {
        editingHighlightIds.delete(highlight.id);
        await refreshHighlights();
      });

      actions.appendChild(saveBtn2);
      actions.appendChild(cancelBtn);

      item.appendChild(noteInput);
      item.appendChild(actions);
    } else {
      const noteDisplay = document.createElement("p");
      noteDisplay.className = "note-display";
      noteDisplay.textContent = highlight.note || "(no note)";

      const editBtn = document.createElement("button");
      editBtn.className = "edit-btn";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", async () => {
        editingHighlightIds.add(highlight.id);
        await refreshHighlights();
      });

      item.appendChild(noteDisplay);
      item.appendChild(editBtn);
    }

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
  editingHighlightIds.clear();
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
    item.className = "pin-item pin-color-" + (pin.color || "none");

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", async () => {
      const current = await getList(PINS_KEY);
      const updated = current.filter((p) => p.id !== pin.id);
      editingPinIds.delete(pin.id);
      await setList(PINS_KEY, updated);
      await refreshPins();
      showStatus("Pin deleted.");
    });

    if (editingPinIds.has(pin.id)) {
      let selectedColor = pin.color || PIN_COLORS[0];

      const textInput = document.createElement("textarea");
      textInput.className = "note-edit-input";
      textInput.value = pin.text;

      const picker = buildColorPicker(selectedColor, (color) => {
        selectedColor = color;
      });

      const actions = document.createElement("div");
      actions.className = "edit-actions";

      const saveBtn2 = document.createElement("button");
      saveBtn2.textContent = "Save";
      saveBtn2.addEventListener("click", async () => {
        const text = textInput.value.trim();
        if (!text) {
          showStatus("Pin note is empty.");
          return;
        }
        const current = await getList(PINS_KEY);
        const target = current.find((p) => p.id === pin.id);
        if (target) {
          target.text = text;
          target.color = selectedColor;
        }
        editingPinIds.delete(pin.id);
        await setList(PINS_KEY, current);
        await refreshPins();
      });

      const cancelBtn = document.createElement("button");
      cancelBtn.textContent = "Cancel";
      cancelBtn.addEventListener("click", async () => {
        editingPinIds.delete(pin.id);
        await refreshPins();
      });

      actions.appendChild(saveBtn2);
      actions.appendChild(cancelBtn);

      const formWrap = document.createElement("div");
      formWrap.className = "pin-edit-form";
      formWrap.appendChild(textInput);
      formWrap.appendChild(picker);
      formWrap.appendChild(actions);

      item.appendChild(formWrap);
      item.appendChild(deleteBtn);
    } else {
      const text = document.createElement("span");
      text.className = "pin-text";
      text.textContent = pin.text;

      const editBtn = document.createElement("button");
      editBtn.className = "edit-btn";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", async () => {
        editingPinIds.add(pin.id);
        await refreshPins();
      });

      const actions = document.createElement("div");
      actions.className = "pin-item-actions";
      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);

      item.appendChild(text);
      item.appendChild(actions);
    }

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
  pins.push({ id: Date.now().toString(), text, color: composerColor });
  await setList(PINS_KEY, pins);
  pinInput.value = "";
  await refreshPins();
  showStatus("Pin added.");
}

addPinBtn.addEventListener("click", addPin);

pinColorPickerEl.appendChild(
  buildColorPicker(composerColor, (color) => {
    composerColor = color;
  })
);

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
