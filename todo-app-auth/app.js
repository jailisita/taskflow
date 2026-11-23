// Claves de almacenamiento en localStorage
const STORAGE_USERS = 'taskflow_users_v1';
const STORAGE_SESSION = 'taskflow_session_v1';
const STORAGE_TASKS_PREFIX = 'taskflow_tasks_';

// Estado global
let authMode = 'login'; // 'login' | 'register'
let currentUser = null;
let tasks = [];
let currentFilter = 'all';
let searchQuery = '';

// Elementos del DOM - Autenticación
const authView = document.getElementById('auth-view');
const appView = document.getElementById('app-view');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const authSubtitle = document.getElementById('auth-subtitle');
const authForm = document.getElementById('auth-form');
const nameGroup = document.getElementById('name-group');
const authNameInput = document.getElementById('auth-name');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const authError = document.getElementById('auth-error');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const demoLoginBtn = document.getElementById('demo-login-btn');

// Elementos del DOM - Aplicación
const userAvatar = document.getElementById('user-avatar');
const userDisplayName = document.getElementById('user-display-name');
const userDisplayEmail = document.getElementById('user-display-email');
const logoutBtn = document.getElementById('logout-btn');
const statTotal = document.getElementById('stat-total');
const statPending = document.getElementById('stat-pending');
const statCompleted = document.getElementById('stat-completed');
const taskForm = document.getElementById('task-form');
const taskTitleInput = document.getElementById('task-title');
const taskPriorityInput = document.getElementById('task-priority');
const taskDueInput = document.getElementById('task-due');
const filterBtns = document.querySelectorAll('.filter-btn');
const searchInput = document.getElementById('search-input');
const clearCompletedBtn = document.getElementById('clear-completed-btn');
const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');

// Utilidades de almacenamiento
function getUsers() {
  return JSON.parse(localStorage.getItem(STORAGE_USERS) || '[]');
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
}

function getTasksForUser(email) {
  return JSON.parse(localStorage.getItem(STORAGE_TASKS_PREFIX + email) || '[]');
}

function saveTasksForUser(email, userTasks) {
  localStorage.setItem(STORAGE_TASKS_PREFIX + email, JSON.stringify(userTasks));
}

// Alternar pestañas de Login / Registro
function setAuthMode(mode) {
  authMode = mode;
  authError.textContent = '';
  if (mode === 'login') {
    tabLogin.classList.add('active');
    tabLogin.setAttribute('aria-selected', 'true');
    tabRegister.classList.remove('active');
    tabRegister.setAttribute('aria-selected', 'false');
    nameGroup.classList.add('hidden');
    authSubtitle.textContent = 'Inicia sesión para gestionar tus tareas';
    authSubmitBtn.textContent = 'Entrar';
  } else {
    tabRegister.classList.add('active');
    tabRegister.setAttribute('aria-selected', 'true');
    tabLogin.classList.remove('active');
    tabLogin.setAttribute('aria-selected', 'false');
    nameGroup.classList.remove('hidden');
    authSubtitle.textContent = 'Crea tu cuenta gratuita en segundos';
    authSubmitBtn.textContent = 'Crear cuenta';
  }
}

tabLogin.addEventListener('click', () => setAuthMode('login'));
tabRegister.addEventListener('click', () => setAuthMode('register'));

// Procesar formulario de autenticación
authForm.addEventListener('submit', (e) => {
  e.preventDefault();
  authError.textContent = '';

  const name = authNameInput.value.trim();
  const email = authEmailInput.value.trim().toLowerCase();
  const password = authPasswordInput.value;

  if (!email || !email.includes('@')) {
    authError.textContent = 'Ingresa un correo electrónico válido.';
    return;
  }

  if (password.length < 6) {
    authError.textContent = 'La contraseña debe tener al menos 6 caracteres.';
    return;
  }

  const users = getUsers();

  if (authMode === 'register') {
    if (!name) {
      authError.textContent = 'Por favor ingresa tu nombre.';
      return;
    }
    if (users.some((u) => u.email === email)) {
      authError.textContent = 'Este correo ya está registrado. Inicia sesión.';
      return;
    }
    const newUser = { name, email, password };
    users.push(newUser);
    saveUsers(users);
    startSession(newUser);
  } else {
    const matched = users.find((u) => u.email === email && u.password === password);
    if (!matched) {
      authError.textContent = 'Correo o contraseña incorrectos.';
      return;
    }
    startSession(matched);
  }
});

// Inicio de sesión rápido con cuenta demo
demoLoginBtn.addEventListener('click', () => {
  const demoUser = {
    name: 'Usuario Demo',
    email: 'demo@taskflow.app',
  };
  const existing = getTasksForUser(demoUser.email);
  if (existing.length === 0) {
    const today = new Date().toISOString().split('T')[0];
    saveTasksForUser(demoUser.email, [
      {
        id: crypto.randomUUID(),
        title: 'Revisar pendientes de la semana',
        priority: 'alta',
        dueDate: today,
        completed: false,
      },
      {
        id: crypto.randomUUID(),
        title: 'Preparar presentación del proyecto',
        priority: 'media',
        dueDate: '',
        completed: false,
      },
      {
        id: crypto.randomUUID(),
        title: 'Configurar cuenta en TaskFlow',
        priority: 'baja',
        dueDate: today,
        completed: true,
      },
    ]);
  }
  startSession(demoUser);
});

function startSession(user) {
  currentUser = { name: user.name, email: user.email };
  localStorage.setItem(STORAGE_SESSION, JSON.stringify(currentUser));
  tasks = getTasksForUser(currentUser.email);

  userDisplayName.textContent = currentUser.name;
  userDisplayEmail.textContent = currentUser.email;
  userAvatar.textContent = currentUser.name.charAt(0).toUpperCase();

  authForm.reset();
  authError.textContent = '';
  authView.classList.add('hidden');
  appView.classList.remove('hidden');
  renderTasks();
}

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_SESSION);
  currentUser = null;
  tasks = [];
  appView.classList.add('hidden');
  authView.classList.remove('hidden');
  setAuthMode('login');
});

// Gestión de tareas
taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = taskTitleInput.value.trim();
  if (!title || !currentUser) return;

  const newTask = {
    id: crypto.randomUUID(),
    title,
    priority: taskPriorityInput.value,
    dueDate: taskDueInput.value,
    completed: false,
  };

  tasks.unshift(newTask);
  saveTasksForUser(currentUser.email, tasks);
  taskForm.reset();
  taskPriorityInput.value = 'media';
  renderTasks();
});

function toggleTask(id) {
  tasks = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
  saveTasksForUser(currentUser.email, tasks);
  renderTasks();
}

function editTask(id) {
  const target = tasks.find((t) => t.id === id);
  if (!target) return;
  const updated = prompt('Editar tarea:', target.title);
  if (updated !== null && updated.trim() !== '') {
    target.title = updated.trim();
    saveTasksForUser(currentUser.email, tasks);
    renderTasks();
  }
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasksForUser(currentUser.email, tasks);
  renderTasks();
}

clearCompletedBtn.addEventListener('click', () => {
  tasks = tasks.filter((t) => !t.completed);
  saveTasksForUser(currentUser.email, tasks);
  renderTasks();
});

filterBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    filterBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderTasks();
  });
});

searchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value.trim().toLowerCase();
  renderTasks();
});

function renderTasks() {
  // Actualizar contadores
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const pending = total - completed;

  statTotal.textContent = total;
  statPending.textContent = pending;
  statCompleted.textContent = completed;

  // Filtrar tareas
  const filtered = tasks.filter((task) => {
    const matchesFilter =
      currentFilter === 'all' ||
      (currentFilter === 'pending' && !task.completed) ||
      (currentFilter === 'completed' && task.completed);

    const matchesSearch = task.title.toLowerCase().includes(searchQuery);
    return matchesFilter && matchesSearch;
  });

  taskList.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  filtered.forEach((task) => {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;

    const left = document.createElement('div');
    left.className = 'task-left';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-checkbox';
    checkbox.checked = task.completed;
    checkbox.setAttribute('aria-label', `Marcar "${task.title}" como completada`);
    checkbox.addEventListener('change', () => toggleTask(task.id));

    const body = document.createElement('div');
    body.className = 'task-body';

    const titleEl = document.createElement('span');
    titleEl.className = 'task-title';
    titleEl.textContent = task.title;

    const meta = document.createElement('div');
    meta.className = 'task-meta';

    const badge = document.createElement('span');
    badge.className = `badge badge-${task.priority}`;
    badge.textContent = task.priority;
    meta.appendChild(badge);

    if (task.dueDate) {
      const dateSpan = document.createElement('span');
      dateSpan.textContent = `Vence: ${task.dueDate}`;
      meta.appendChild(dateSpan);
    }

    body.appendChild(titleEl);
    body.appendChild(meta);
    left.appendChild(checkbox);
    left.appendChild(body);

    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'icon-btn';
    editBtn.textContent = 'Editar';
    editBtn.addEventListener('click', () => editTask(task.id));

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'icon-btn delete';
    delBtn.textContent = 'Eliminar';
    delBtn.addEventListener('click', () => deleteTask(task.id));

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    li.appendChild(left);
    li.appendChild(actions);
    taskList.appendChild(li);
  });
}

// Restaurar sesión si ya existe
(function init() {
  const savedSession = localStorage.getItem(STORAGE_SESSION);
  if (savedSession) {
    try {
      const parsed = JSON.parse(savedSession);
      if (parsed && parsed.email) {
        startSession(parsed);
      }
    } catch {
      localStorage.removeItem(STORAGE_SESSION);
    }
  }
})();
