const STORAGE_KEY = "my-todo-list";

const addForm = document.querySelector("#add-form");
const taskInput = document.querySelector("#task-input");
const taskList = document.querySelector("#task-list");
const taskCount = document.querySelector("#task-count");
const clearCompletedButton = document.querySelector("#clear-completed");
const storageMessage = document.querySelector("#storage-message");
const filterButtons = document.querySelectorAll("[data-filter]");

let tasks = loadTasks();
let currentFilter = "all";
let editingTaskId = null;

function loadTasks() {
  try {
    const savedTasks = localStorage.getItem(STORAGE_KEY);
    if (!savedTasks) return [];

    const savedList = JSON.parse(savedTasks);
    if (!Array.isArray(savedList)) {
      throw new Error("Saved tasks are not a list.");
    }

    // Older saved tasks may have an id. We only need the task text and status.
    return savedList
      .filter((task) => task && typeof task.text === "string")
      .map((task) => ({
        text: task.text,
        completed: task.completed === true
      }));
  } catch (error) {
    console.error("Could not load saved tasks:", error);
    showStorageMessage("Saved tasks could not be loaded. You can still add tasks for now.");
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    showStorageMessage("");
  } catch (error) {
    console.error("Could not save tasks:", error);
    showStorageMessage("Your changes could not be saved. Check your browser's storage settings.");
  }
}

function showStorageMessage(message) {
  storageMessage.textContent = message;
  storageMessage.hidden = message === "";
}

function renderTasks() {
  taskList.replaceChildren();

  let tasksLeft = 0;
  let visibleTasks = 0;

  for (let index = 0; index < tasks.length; index += 1) {
    const task = tasks[index];
    const taskId = index + 1;

    if (!task.completed) tasksLeft += 1;

    const isVisible =
      currentFilter === "all" ||
      (currentFilter === "active" && !task.completed) ||
      (currentFilter === "completed" && task.completed);

    if (isVisible) {
      taskList.append(createTaskElement(task, taskId));
      visibleTasks += 1;
    }
  }

  taskCount.textContent = `${tasksLeft} ${tasksLeft === 1 ? "task" : "tasks"} left`;
  clearCompletedButton.hidden = tasksLeft === tasks.length;

  if (visibleTasks === 0) {
    const emptyMessage = document.createElement("li");
    emptyMessage.className = "empty-state";

    if (tasks.length === 0) {
      emptyMessage.textContent = "Nothing on your list yet. Add a task to get started.";
    } else if (currentFilter === "active") {
      emptyMessage.textContent = "No active tasks right now.";
    } else {
      emptyMessage.textContent = "No completed tasks right now.";
    }

    taskList.append(emptyMessage);
  }
}

function createTaskElement(task, taskId) {
  const item = document.createElement("li");
  item.className = task.completed ? "task-item is-completed" : "task-item";
  // The id is the task's current position in the list, starting at 1.
  item.dataset.id = taskId;

  if (editingTaskId === taskId) {
    const editForm = document.createElement("form");
    editForm.className = "edit-form";
    editForm.dataset.action = "edit";

    const editInput = document.createElement("input");
    editInput.className = "edit-input";
    editInput.name = "task";
    editInput.type = "text";
    editInput.maxLength = 100;
    editInput.value = task.text;
    editInput.setAttribute("aria-label", "Edit task");
    editInput.required = true;

    const saveButton = document.createElement("button");
    saveButton.className = "task-action";
    saveButton.type = "button";
    saveButton.dataset.action = "save-edit";
    saveButton.textContent = "Save";

    const cancelButton = document.createElement("button");
    cancelButton.className = "task-action";
    cancelButton.type = "button";
    cancelButton.dataset.action = "cancel-edit";
    cancelButton.textContent = "Cancel";

    editForm.append(editInput, saveButton, cancelButton);
    item.append(editForm);
    requestAnimationFrame(() => editInput.focus());
    return item;
  }

  const checkbox = document.createElement("input");
  checkbox.className = "task-check";
  checkbox.type = "checkbox";
  checkbox.checked = task.completed;
  checkbox.dataset.action = "toggle";
  checkbox.setAttribute(
    "aria-label",
    `Mark "${task.text}" as ${task.completed ? "active" : "completed"}`
  );

  const text = document.createElement("span");
  text.className = "task-text";
  text.textContent = task.text;

  const actions = document.createElement("div");
  actions.className = "task-actions";

  const editButton = document.createElement("button");
  editButton.className = "task-action";
  editButton.type = "button";
  editButton.dataset.action = "edit";
  editButton.textContent = "Edit";
  editButton.setAttribute("aria-label", `Edit "${task.text}"`);

  const deleteButton = document.createElement("button");
  deleteButton.className = "task-action delete-button";
  deleteButton.type = "button";
  deleteButton.dataset.action = "delete";
  deleteButton.textContent = "Delete";
  deleteButton.setAttribute("aria-label", `Delete "${task.text}"`);

  actions.append(editButton, deleteButton);
  item.append(checkbox, text, actions);
  return item;
}

addForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = taskInput.value.trim();
  if (text === "") {
    taskInput.focus();
    return;
  }

  tasks.unshift({ text: text, completed: false });
  editingTaskId = null;
  taskInput.value = "";
  saveTasks();
  renderTasks();
  taskInput.focus();
});

taskList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  const item = event.target.closest(".task-item");
  if (!button || !item) return;

  const taskId = Number(item.dataset.id);
  const taskIndex = taskId - 1;

  if (button.dataset.action === "edit") {
    editingTaskId = taskId;
    renderTasks();
  } else if (button.dataset.action === "save-edit") {
    saveEditedTask(item);
  } else if (button.dataset.action === "cancel-edit") {
    editingTaskId = null;
    renderTasks();
  } else if (button.dataset.action === "delete") {
    tasks.splice(taskIndex, 1);
    editingTaskId = null;
    saveTasks();
    renderTasks();
  }
});

taskList.addEventListener("change", (event) => {
  if (event.target.dataset.action !== "toggle") return;

  const item = event.target.closest(".task-item");
  const taskIndex = Number(item.dataset.id) - 1;
  tasks[taskIndex].completed = event.target.checked;

  saveTasks();
  renderTasks();
});

taskList.addEventListener("submit", (event) => {
  if (event.target.dataset.action !== "edit") return;
  event.preventDefault();

  saveEditedTask(event.target.closest(".task-item"));
});

function saveEditedTask(item) {
  const taskIndex = Number(item.dataset.id) - 1;
  const editInput = item.querySelector(".edit-input");
  const text = editInput.value.trim();
  if (text === "") {
    editInput.focus();
    return;
  }

  tasks[taskIndex].text = text;
  editingTaskId = null;
  saveTasks();
  renderTasks();
}

taskList.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && event.target.matches(".edit-input")) {
    editingTaskId = null;
    renderTasks();
  }
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;

    filterButtons.forEach((filterButton) => {
      const isSelected = filterButton === button;
      filterButton.classList.toggle("is-active", isSelected);
      filterButton.setAttribute("aria-pressed", isSelected);
    });

    renderTasks();
  });
});

clearCompletedButton.addEventListener("click", () => {
  tasks = tasks.filter((task) => !task.completed);
  saveTasks();
  renderTasks();
});

renderTasks();
