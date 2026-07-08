const STORAGE_KEY = "keeper-notes-v4";
const LEGACY_STORAGE_KEY = "keeper-notes-v2";
const THEME_KEY = "keeper-theme";

const body = document.body;
const menuToggle = document.querySelector("#menu-toggle");
const themeToggle = document.querySelector("#theme-toggle");
const notesGrid = document.querySelector("#notes-grid");
const noteForm = document.querySelector("#note-form");
const noteTitle = document.querySelector("#note-title");
const noteBody = document.querySelector("#note-body");
const emptyState = document.querySelector("#empty-state");
const notesHeading = document.querySelector("#notes-heading");
const navItems = document.querySelectorAll(".nav-item");
const searchInput = document.querySelector("#search-notes");
const refreshButton = document.querySelector("#refresh-button");
const densityButton = document.querySelector("#toggle-density");
const noteModal = document.querySelector("#note-modal");
const closeNoteModalButton = document.querySelector("#close-note-modal");
const modalTitle = document.querySelector("#modal-title");
const modalDate = document.querySelector("#modal-date");
const modalBody = document.querySelector("#modal-body");

let notes = loadNotes();
let currentView = "active";
let searchTerm = "";
let lastFocusedElement = null;

applySavedTheme();

function loadNotes() {
  const savedNotes = localStorage.getItem(STORAGE_KEY);
  const legacyNotes = localStorage.getItem(LEGACY_STORAGE_KEY);

  if (savedNotes) {
    try {
      return JSON.parse(savedNotes);
    } catch (error) {
      console.warn("Saved notes could not be read.", error);
    }
  }

  if (legacyNotes) {
    try {
      return JSON.parse(legacyNotes).map((note, index) => ({
        ...note,
        color: note.color || "default",
        label: note.label || "",
        pinned: index === 0,
        trashed: Boolean(note.trashed),
      }));
    } catch (error) {
      console.warn("Old saved notes could not be migrated.", error);
    }
  }

  return [
    {
      id: crypto.randomUUID(),
      title: "HTML semantics\nchecklist",
      body: "Use header, nav, main, section, article, and form elements where they describe the page structure.",
      color: "default",
      label: "",
      pinned: true,
      archived: false,
      trashed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      title: "CSS layout notes",
      body: "Keep spacing consistent, use responsive grids, and check that cards do not overlap on small screens.",
      color: "default",
      label: "",
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      title: "JavaScript tasks",
      body: "Create notes, archive notes, restore from Bin, search text, and save everything in localStorage.",
      color: "default",
      label: "",
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      title: "Testing before submit",
      body: "Check theme toggle, menu toggle, form validation, modal close button, and mobile layout.",
      color: "default",
      label: "",
      pinned: false,
      archived: false,
      trashed: false,
      createdAt: new Date().toISOString(),
    },
  ];
}

function saveNotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
}

function getVisibleNotes() {
  return notes.filter((note) => {
    const inView =
      currentView === "archived"
        ? note.archived && !note.trashed
        : currentView === "trash"
          ? note.trashed
        : currentView === "reminders" || currentView === "labels"
              ? false
              : !note.archived && !note.trashed;

    const matchesSearch = `${note.title} ${note.body}`
      .toLowerCase()
      .includes(searchTerm);

    return inView && matchesSearch;
  });
}

function renderNotes() {
  const visibleNotes = getVisibleNotes();
  notesGrid.innerHTML = "";

  if (visibleNotes.length > 0) {
    renderGroup("Pinned", visibleNotes.filter((note) => note.pinned));
    renderGroup("Others", visibleNotes.filter((note) => !note.pinned));
  }

  notesHeading.textContent = searchTerm ? "Search results" : getViewTitle();
  emptyState.hidden = visibleNotes.length > 0;
  emptyState.querySelector("h3").textContent = getEmptyTitle();
  emptyState.querySelector("p").textContent = getEmptyMessage();
  document.title = `Keep Clone - ${getViewTitle()}`;
}

function renderGroup(title, groupNotes) {
  if (groupNotes.length === 0) return;

  const group = document.createElement("section");
  group.className = "notes-group";

  const heading = document.createElement("h3");
  heading.className = "section-title";
  heading.textContent = title;

  const grid = document.createElement("div");
  grid.className = notesGrid.classList.contains("is-list-view")
    ? "notes-grid is-list-view"
    : "notes-grid";

  groupNotes.forEach((note) => {
    grid.appendChild(createNoteCard(note));
  });

  group.append(heading, grid);
  notesGrid.appendChild(group);
}

function getViewTitle() {
  if (currentView === "archived") return "Archive";
  if (currentView === "trash") return "Bin";
  if (currentView === "reminders") return "Reminders";
  if (currentView === "labels") return "Edit labels";
  return "Notes";
}

function getEmptyTitle() {
  if (searchTerm) return "No matching notes";
  if (currentView === "archived") return "No archived notes";
  if (currentView === "trash") return "No notes in Bin";
  if (currentView === "reminders") return "No reminders";
  if (currentView === "labels") return "No labels to edit";
  return "Notes you add appear here";
}

function getEmptyMessage() {
  if (searchTerm) return "Try another search term.";
  if (currentView === "archived") return "Archived notes appear here.";
  if (currentView === "trash") return "Notes moved to Bin appear here.";
  return "Click Take a note... to get started.";
}

function createNoteCard(note) {
  const article = document.createElement("article");
  article.className = "note-card";
  article.dataset.color = note.color;

  const content = document.createElement("div");
  content.className = "note-content";
  content.tabIndex = 0;
  content.addEventListener("click", () => openModal(note));
  content.addEventListener("keydown", (event) => {
    if (event.key === "Enter") openModal(note);
  });

  const title = document.createElement("h3");
  title.textContent = note.title || "Untitled";

  const bodyText = document.createElement("p");
  bodyText.textContent = note.body;

  const footer = document.createElement("footer");
  const date = document.createElement("span");
  date.className = "note-date";
  date.textContent = formatDate(note.createdAt);

  const actions = document.createElement("div");
  actions.className = "card-actions";
  actions.append(...getActionButtons(note));

  content.append(title, bodyText);
  footer.append(date, actions);
  article.append(content, footer);
  return article;
}

function getActionButtons(note) {
  if (currentView === "trash") {
    return [
      createActionButton("Restore note", "restore", () => restoreNote(note.id)),
      createActionButton("Delete forever", "delete", () => deleteNote(note.id)),
    ];
  }

  return [
    createActionButton(note.pinned ? "Unpin note" : "Pin note", "pin", () => togglePin(note.id)),
    createActionButton(note.archived ? "Unarchive note" : "Archive note", "archive", () => toggleArchive(note.id)),
    createActionButton("Move to Bin", "trash", () => trashNote(note.id)),
  ];
}

function createActionButton(label, iconName, onClick) {
  const button = document.createElement("button");
  button.className = "icon-button";
  button.type = "button";
  button.setAttribute("aria-label", label);
  button.innerHTML = `<span class="card-action-icon icon-${iconName}" aria-hidden="true"></span><span class="tooltip">${label}</span>`;
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    onClick();
  });
  return button;
}

function addNote(formData) {
  const title = formData.get("title").trim();
  const noteText = formData.get("body").trim();

  if (!title && !noteText) {
    collapseComposer();
    return;
  }

  notes.unshift({
    id: crypto.randomUUID(),
    title,
    body: noteText || "Empty note",
    color: formData.get("color"),
    label: "",
    pinned: false,
    archived: false,
    trashed: false,
    createdAt: new Date().toISOString(),
  });

  currentView = "active";
  searchTerm = "";
  searchInput.value = "";
  updateNavigation();
  saveNotes();
  renderNotes();
}

function togglePin(noteId) {
  notes = notes.map((note) =>
    note.id === noteId ? { ...note, pinned: !note.pinned } : note
  );
  saveNotes();
  renderNotes();
}

function toggleArchive(noteId) {
  notes = notes.map((note) =>
    note.id === noteId
      ? { ...note, archived: !note.archived, trashed: false, pinned: false }
      : note
  );
  saveNotes();
  renderNotes();
}

function trashNote(noteId) {
  notes = notes.map((note) =>
    note.id === noteId
      ? { ...note, trashed: true, archived: false, pinned: false }
      : note
  );
  saveNotes();
  renderNotes();
}

function restoreNote(noteId) {
  notes = notes.map((note) =>
    note.id === noteId ? { ...note, trashed: false, archived: false } : note
  );
  saveNotes();
  renderNotes();
}

function deleteNote(noteId) {
  notes = notes.filter((note) => note.id !== noteId);
  saveNotes();
  renderNotes();
}

function updateNavigation() {
  navItems.forEach((item) => {
    const isActive = item.dataset.view === currentView;
    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-current", isActive ? "page" : "false");
  });
}

function toggleSidebar() {
  const isCollapsed = body.classList.toggle("sidebar-collapsed");
  menuToggle.setAttribute("aria-expanded", String(!isCollapsed));
  menuToggle.setAttribute("aria-label", isCollapsed ? "Expand menu" : "Collapse menu");
}

function applySavedTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || "dark";
  setTheme(savedTheme);
}

function setTheme(theme) {
  const isLight = theme === "light";
  body.classList.toggle("light-theme", isLight);
  themeToggle.setAttribute("aria-label", isLight ? "Switch to dark mode" : "Switch to light mode");
  themeToggle.querySelector(".tooltip").textContent = isLight ? "Dark mode" : "Light mode";
  themeToggle.querySelector(".theme-icon").className = `theme-icon ${isLight ? "icon-moon" : "icon-sun"}`;
  localStorage.setItem(THEME_KEY, isLight ? "light" : "dark");
}

function toggleTheme() {
  setTheme(body.classList.contains("light-theme") ? "dark" : "light");
}

function expandComposer() {
  noteForm.classList.add("is-expanded");
  noteBody.rows = 3;
}

function collapseComposer() {
  if (!noteTitle.value.trim() && !noteBody.value.trim()) {
    noteForm.classList.remove("is-expanded");
    noteBody.rows = 1;
  }
}

function openModal(note) {
  lastFocusedElement = document.activeElement;
  modalTitle.textContent = note.title || "Untitled";
  modalDate.textContent = `Created ${formatDate(note.createdAt)}`;
  modalBody.textContent = note.body;
  noteModal.hidden = false;
  closeNoteModalButton.focus();
}

function closeModal() {
  noteModal.hidden = true;
  if (lastFocusedElement) lastFocusedElement.focus();
}

menuToggle.addEventListener("click", toggleSidebar);
themeToggle.addEventListener("click", toggleTheme);

noteForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addNote(new FormData(noteForm));
  noteForm.reset();
  collapseComposer();
  noteBody.focus();
});

noteForm.addEventListener("reset", () => {
  window.setTimeout(collapseComposer, 0);
});

noteTitle.addEventListener("focus", expandComposer);
noteBody.addEventListener("focus", expandComposer);

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    currentView = item.dataset.view;
    updateNavigation();
    renderNotes();
  });
});

searchInput.addEventListener("input", (event) => {
  searchTerm = event.target.value.trim().toLowerCase();
  renderNotes();
});

refreshButton.addEventListener("click", renderNotes);

densityButton.addEventListener("click", () => {
  notesGrid.classList.toggle("is-list-view");
  const isList = notesGrid.classList.contains("is-list-view");
  densityButton.setAttribute("aria-label", isList ? "Toggle grid view" : "Toggle list view");
  densityButton.querySelector(".tooltip").textContent = isList ? "Grid view" : "List view";
  renderNotes();
});

closeNoteModalButton.addEventListener("click", closeModal);

noteModal.addEventListener("click", (event) => {
  if (event.target === noteModal) closeModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !noteModal.hidden) closeModal();
});

updateNavigation();
renderNotes();
