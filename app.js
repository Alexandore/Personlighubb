const SUPABASE_URL = "https://qfpdwwzssqsgqryfejvv.supabase.co";
const SUPABASE_KEY = "sb_publishable_pmgmxS8zlaedPH-swX8rXg_-8ao49ww";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
supabaseClient.auth.onAuthStateChange(async (event) => {
    if (event === "PASSWORD_RECOVERY") {
        const newPassword = prompt("Skriv ditt nya lösenord:");

        if (!newPassword) return;

        const { error } = await supabaseClient.auth.updateUser({
            password: newPassword
        });

        if (error) {
            alert("Kunde inte byta lösenord: " + error.message);
        } else {
            alert("Lösenordet är ändrat!");
        }
    }
});
async function loginToSupabase() {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    const message = document.getElementById("loginMessage");

    const { error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        message.textContent = "Fel e-post eller lösenord.";
        return;
    }

    message.textContent = "Inloggad!";
}
let appData = {
    days: {},
    goals: { week: {}, month: {}, year: {} },
    tasks: [],
    notes: [],
    books: []
};

let currentActiveNoteId = null;
let isCreatingNewNote = false;

function loadAppData() {
    const saved = localStorage.getItem('min_schema_hub_data_v1');

    if (saved) {
        try {
            const parsed = JSON.parse(saved);

            if (parsed && typeof parsed === 'object') {
                appData = {
                    days: parsed.days || {},
                    goals: {
                        week: (parsed.goals && parsed.goals.week) || {},
                        month: (parsed.goals && parsed.goals.month) || {},
                        year: (parsed.goals && parsed.goals.year) || {}
                    },
                    tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
                    notes: Array.isArray(parsed.notes) ? parsed.notes : [],
                    books: Array.isArray(parsed.books) ? parsed.books : []
                };
            }
        } catch (e) {
            console.error("Kunde inte läsa sparad data", e);
        }
    }
}

function saveAppData() {
    try {
        localStorage.setItem(
            'min_schema_hub_data_v1',
            JSON.stringify(appData)
        );

        updateSidebarProgress();
        renderGlobalCompletedGoals();
    } catch (e) {
        console.error("Kunde inte spara till localStorage", e);
    }
}

window.onload = function () {
    initApp();
};

function initApp() {
    loadAppData();

    const todayStr = getLocalDateString(new Date());

    document.getElementById('current-date-display').textContent =
        formatDateNice(new Date());

    const dateInput =
        document.getElementById('selected-date-input');

    if (dateInput && !dateInput.value) {
        dateInput.value = todayStr;
    }

    populateWeekSelector();
    populateYearSelector();

    const currentMonth = new Date().getMonth();
    const monthSelect =
        document.getElementById('select-month');

    if (monthSelect && monthSelect.value === "") {
        monthSelect.value = currentMonth;
    }

    loadDayData();
    renderGoals();
    renderTasks();
    renderNotesList();
    renderBooks();
    renderDayArchive();

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function getLocalDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');

    return `${y}-${m}-${d}`;
}

function formatDateNice(date) {
    return date.toLocaleDateString('sv-SE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function getSelectedDate() {
    const input =
        document.getElementById('selected-date-input');

    if (!input || !input.value) {
        return new Date();
    }

    const parts = input.value.split('-');

    return new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
    );
}

function getSelectedDateKey() {
    return getLocalDateString(getSelectedDate());
}

function getDayRecord(key) {
    if (!appData.days[key]) {
        appData.days[key] = {
            goals: [
                {
                    id: Date.now() + 1,
                    text: "Muay Thai",
                    done: false
                },
                {
                    id: Date.now() + 2,
                    text: "Plugga programmering",
                    done: false
                },
                {
                    id: Date.now() + 3,
                    text: "Laga mat",
                    done: false
                }
            ],
            schedule: [],
            dayNotes: []
        };

        saveAppData();
    } else {
        if (!Array.isArray(appData.days[key].goals)) {
            appData.days[key].goals = [];
        }

        const existingTexts =
            appData.days[key].goals.map(
                g => g.text.toLowerCase()
            );

        const defaults = [
            "Muay Thai",
            "Plugga programmering",
            "Laga mat"
        ];

        let addedAny = false;

        defaults.forEach(def => {
            if (
                !existingTexts.includes(
                    def.toLowerCase()
                )
            ) {
                appData.days[key].goals.push({
                    id: Date.now() + Math.random(),
                    text: def,
                    done: false
                });

                addedAny = true;
            }
        });

        if (addedAny) {
            saveAppData();
        }
    }

    return appData.days[key];
}
function loadDayData() {
    const key = getSelectedDateKey();
    const day = getDayRecord(key);

    const selectedDate = getSelectedDate();
    const display = document.getElementById('selected-date-display');

    if (display) {
        display.textContent = formatDateNice(selectedDate);
    }

    renderDailyGoals(day);
    renderSchedule(day);
    renderDayNotes(day);
    updateDailyProgress(day);

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function changeSelectedDate(days) {
    const input = document.getElementById('selected-date-input');
    const date = getSelectedDate();

    date.setDate(date.getDate() + days);

    input.value = getLocalDateString(date);
    loadDayData();
}

function goToToday() {
    const input = document.getElementById('selected-date-input');

    input.value = getLocalDateString(new Date());
    loadDayData();
}

function renderDailyGoals(day) {
    const container = document.getElementById('daily-goals-list');

    if (!container) return;

    container.innerHTML = '';

    if (!day.goals || day.goals.length === 0) {
        container.innerHTML = `
            <div class="text-sm text-slate-400 py-4 text-center">
                Inga dagsmål ännu.
            </div>
        `;
        return;
    }

    day.goals.forEach(goal => {
        const item = document.createElement('div');

        item.className =
            'flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl';

        item.innerHTML = `
            <button
                onclick="toggleDailyGoal(${goal.id})"
                class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                ${goal.done
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-slate-300'}"
            >
                ${goal.done ? '✓' : ''}
            </button>

            <span class="flex-1 text-sm ${
                goal.done
                    ? 'line-through text-slate-400'
                    : 'text-slate-700'
            }">
                ${escapeHtml(goal.text)}
            </span>

            <button
                onclick="deleteDailyGoal(${goal.id})"
                class="text-slate-400 hover:text-red-500"
                title="Radera"
            >
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        `;

        container.appendChild(item);
    });

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function addDailyGoal() {
    const input = document.getElementById('new-daily-goal');

    if (!input) return;

    const text = input.value.trim();

    if (!text) return;

    const key = getSelectedDateKey();
    const day = getDayRecord(key);

    day.goals.push({
        id: Date.now(),
        text: text,
        done: false
    });

    input.value = '';

    saveAppData();
    loadDayData();
}

function toggleDailyGoal(id) {
    const key = getSelectedDateKey();
    const day = getDayRecord(key);

    const goal = day.goals.find(g => g.id === id);

    if (!goal) return;

    goal.done = !goal.done;

    saveAppData();
    loadDayData();
}

function deleteDailyGoal(id) {
    const key = getSelectedDateKey();
    const day = getDayRecord(key);

    day.goals = day.goals.filter(g => g.id !== id);

    saveAppData();
    loadDayData();
}

function updateDailyProgress(day) {
    const progressBar =
        document.getElementById('daily-progress-bar');

    const progressText =
        document.getElementById('daily-progress-text');

    if (!progressBar || !progressText) return;

    const total = day.goals ? day.goals.length : 0;

    const completed = day.goals
        ? day.goals.filter(g => g.done).length
        : 0;

    const percent =
        total === 0
            ? 0
            : Math.round((completed / total) * 100);

    progressBar.style.width = `${percent}%`;
    progressText.textContent = `${completed} av ${total} klara`;
}

function renderSchedule(day) {
    const container = document.getElementById('schedule-list');

    if (!container) return;

    container.innerHTML = '';

    if (!day.schedule || day.schedule.length === 0) {
        container.innerHTML = `
            <div class="text-sm text-slate-400 py-4 text-center">
                Inget i schemat ännu.
            </div>
        `;
        return;
    }

    const sortedSchedule = [...day.schedule].sort((a, b) => {
        return (a.time || '').localeCompare(b.time || '');
    });

    sortedSchedule.forEach(item => {
        const row = document.createElement('div');

        row.className =
            'flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl';

        row.innerHTML = `
            <button
                onclick="toggleScheduleItem(${item.id})"
                class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                ${item.done
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-slate-300'}"
            >
                ${item.done ? '✓' : ''}
            </button>

            <div class="w-16 text-sm font-semibold text-slate-500">
                ${escapeHtml(item.time || '')}
            </div>

            <div class="flex-1 text-sm ${
                item.done
                    ? 'line-through text-slate-400'
                    : 'text-slate-700'
            }">
                ${escapeHtml(item.text)}
            </div>

            <button
                onclick="deleteScheduleItem(${item.id})"
                class="text-slate-400 hover:text-red-500"
                title="Radera"
            >
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        `;

        container.appendChild(row);
    });

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function addScheduleItem() {
    const timeInput =
        document.getElementById('new-schedule-time');

    const textInput =
        document.getElementById('new-schedule-text');

    if (!timeInput || !textInput) return;

    const time = timeInput.value;
    const text = textInput.value.trim();

    if (!text) return;

    const key = getSelectedDateKey();
    const day = getDayRecord(key);

    if (!Array.isArray(day.schedule)) {
        day.schedule = [];
    }

    day.schedule.push({
        id: Date.now(),
        time: time,
        text: text,
        done: false
    });

    timeInput.value = '';
    textInput.value = '';

    saveAppData();
    loadDayData();
}

function toggleScheduleItem(id) {
    const key = getSelectedDateKey();
    const day = getDayRecord(key);

    const item = day.schedule.find(s => s.id === id);

    if (!item) return;

    item.done = !item.done;

    saveAppData();
    loadDayData();
}

function deleteScheduleItem(id) {
    const key = getSelectedDateKey();
    const day = getDayRecord(key);

    day.schedule =
        day.schedule.filter(item => item.id !== id);

    saveAppData();
    loadDayData();
}

function renderDayNotes(day) {
    const container =
        document.getElementById('day-notes-list');

    if (!container) return;

    container.innerHTML = '';

    if (!day.dayNotes || day.dayNotes.length === 0) {
        container.innerHTML = `
            <div class="text-sm text-slate-400 py-4 text-center">
                Inga dagsanteckningar ännu.
            </div>
        `;
        return;
    }

    day.dayNotes.forEach(note => {
        const item = document.createElement('div');

        item.className =
            'p-3 bg-white border border-slate-200 rounded-xl';

        item.innerHTML = `
            <div class="flex items-start gap-3">
                <p class="flex-1 text-sm text-slate-700 whitespace-pre-wrap">
                    ${escapeHtml(note.text)}
                </p>

                <button
                    onclick="deleteDayNote(${note.id})"
                    class="text-slate-400 hover:text-red-500"
                    title="Radera"
                >
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        `;

        container.appendChild(item);
    });

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function addDayNote() {
    const input =
        document.getElementById('new-day-note');

    if (!input) return;

    const text = input.value.trim();

    if (!text) return;

    const key = getSelectedDateKey();
    const day = getDayRecord(key);

    if (!Array.isArray(day.dayNotes)) {
        day.dayNotes = [];
    }

    day.dayNotes.push({
        id: Date.now(),
        text: text
    });

    input.value = '';

    saveAppData();
    loadDayData();
}

function deleteDayNote(id) {
    const key = getSelectedDateKey();
    const day = getDayRecord(key);

    day.dayNotes =
        day.dayNotes.filter(note => note.id !== id);

    saveAppData();
    loadDayData();
}

function escapeHtml(value) {
    if (value === null || value === undefined) {
        return '';
    }

    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(section => {
        section.classList.add('hidden');
    });

    const selectedTab = document.getElementById(`tab-content-${tabName}`);

    if (selectedTab) {
        selectedTab.classList.remove('hidden');
    }
    const navButtons = document.querySelectorAll('[data-tab]');

    navButtons.forEach(button => {
        button.classList.remove(
            'bg-slate-100',
            'text-slate-900'
        );
    });

    const activeButton =
        document.querySelector(`[data-tab="${tabName}"]`);

    if (activeButton) {
        activeButton.classList.add(
            'bg-slate-100',
            'text-slate-900'
        );
    }

    if (tabName === 'archive') {
        renderDayArchive();
    }

    if (tabName === 'goals') {
        renderGoals();
    }

    if (tabName === 'tasks') {
        renderTasks();
    }

    if (tabName === 'notes') {
        renderNotesList();
    }

    if (tabName === 'books') {
        renderBooks();
    }

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}
function populateWeekSelector() {
    const select =
        document.getElementById('select-week');

    if (!select) return;

    select.innerHTML = '';

    for (let week = 1; week <= 53; week++) {
        const option = document.createElement('option');

        option.value = week;
        option.textContent = `Vecka ${week}`;

        select.appendChild(option);
    }

    select.value = getWeekNumber(new Date());
}

function populateYearSelector() {
    const select =
        document.getElementById('select-year');

    if (!select) return;

    const currentYear = new Date().getFullYear();

    select.innerHTML = '';

    for (
        let year = currentYear - 2;
        year <= currentYear + 5;
        year++
    ) {
        const option = document.createElement('option');

        option.value = year;
        option.textContent = year;

        select.appendChild(option);
    }

    select.value = currentYear;
}

function getWeekNumber(date) {
    const temp = new Date(
        Date.UTC(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        )
    );

    const dayNum = temp.getUTCDay() || 7;

    temp.setUTCDate(
        temp.getUTCDate() + 4 - dayNum
    );

    const yearStart =
        new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));

    return Math.ceil(
        (((temp - yearStart) / 86400000) + 1) / 7
    );
}

function getGoalKey(type) {
    if (type === 'week') {
        const week =
            document.getElementById('select-week')?.value;

        const year =
            document.getElementById('select-year')?.value ||
            new Date().getFullYear();

        return `${year}-W${week}`;
    }

    if (type === 'month') {
        const month =
            document.getElementById('select-month')?.value;

        const year = new Date().getFullYear();

        return `${year}-${month}`;
    }

    if (type === 'year') {
        const year =
            document.getElementById('select-year')?.value;

        return String(year);
    }

    return '';
}

function getGoalsForType(type) {
    const key = getGoalKey(type);

    if (!appData.goals[type]) {
        appData.goals[type] = {};
    }

    if (!appData.goals[type][key]) {
        appData.goals[type][key] = [];
    }

    return appData.goals[type][key];
}

function renderGoals() {
    renderGoalType('week');
    renderGoalType('month');
    renderGoalType('year');
    renderGlobalCompletedGoals();

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function renderGoalType(type) {
    const container =
        document.getElementById(`${type}-goals-list`);

    if (!container) return;

    const goals = getGoalsForType(type);

    container.innerHTML = '';

    if (goals.length === 0) {
        container.innerHTML = `
            <div class="text-sm text-slate-400 py-4 text-center">
                Inga mål ännu.
            </div>
        `;

        return;
    }

    goals.forEach(goal => {
        const row = document.createElement('div');

        row.className =
            'flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl';

        row.innerHTML = `
            <button
                onclick="toggleGoal('${type}', ${goal.id})"
                class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                ${goal.done
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-slate-300'}"
            >
                ${goal.done ? '✓' : ''}
            </button>

            <span class="flex-1 text-sm ${
                goal.done
                    ? 'line-through text-slate-400'
                    : 'text-slate-700'
            }">
                ${escapeHtml(goal.text)}
            </span>

            <button
                onclick="deleteGoal('${type}', ${goal.id})"
                class="text-slate-400 hover:text-red-500"
                title="Radera"
            >
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        `;

        container.appendChild(row);
    });
}

function addGoal(type) {
    const input =
        document.getElementById(`new-${type}-goal`);

    if (!input) return;

    const text = input.value.trim();

    if (!text) return;

    const goals = getGoalsForType(type);

    goals.push({
        id: Date.now(),
        text: text,
        done: false
    });

    input.value = '';

    saveAppData();
    renderGoals();
}

function toggleGoal(type, id) {
    const goals = getGoalsForType(type);

    const goal =
        goals.find(item => item.id === id);

    if (!goal) return;

    goal.done = !goal.done;

    saveAppData();
    renderGoals();
}

function deleteGoal(type, id) {
    const key = getGoalKey(type);

    if (
        !appData.goals[type] ||
        !appData.goals[type][key]
    ) {
        return;
    }

    appData.goals[type][key] =
        appData.goals[type][key].filter(
            goal => goal.id !== id
        );

    saveAppData();
    renderGoals();
}

function renderGlobalCompletedGoals() {
    const container =
        document.getElementById(
            'global-completed-goals'
        );

    if (!container) return;

    let total = 0;
    let completed = 0;

    ['week', 'month', 'year'].forEach(type => {
        const groups = appData.goals[type] || {};

        Object.values(groups).forEach(goals => {
            if (!Array.isArray(goals)) return;

            total += goals.length;

            completed +=
                goals.filter(goal => goal.done).length;
        });
    });

    container.textContent =
        `${completed} av ${total} mål klara`;
}

function renderTasks() {
    const container =
        document.getElementById('tasks-list');

    if (!container) return;

    container.innerHTML = '';

    if (appData.tasks.length === 0) {
        container.innerHTML = `
            <div class="text-sm text-slate-400 py-8 text-center">
                Inga uppgifter ännu.
            </div>
        `;

        return;
    }

    appData.tasks.forEach(task => {
        const row = document.createElement('div');

        row.className =
            'flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl';

        row.innerHTML = `
            <button
                onclick="toggleTask(${task.id})"
                class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                ${task.done
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-slate-300'}"
            >
                ${task.done ? '✓' : ''}
            </button>

            <div class="flex-1">
                <div class="${
                    task.done
                        ? 'line-through text-slate-400'
                        : 'text-slate-700'
                }">
                    ${escapeHtml(task.text)}
                </div>

                ${
                    task.dueDate
                        ? `<div class="text-xs text-slate-400 mt-1">
                            ${escapeHtml(task.dueDate)}
                           </div>`
                        : ''
                }
            </div>

            <button
                onclick="deleteTask(${task.id})"
                class="text-slate-400 hover:text-red-500"
                title="Radera"
            >
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        `;

        container.appendChild(row);
    });

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function addTask() {
    const input =
        document.getElementById('new-task-input');

    const dateInput =
        document.getElementById('new-task-date');

    if (!input) return;

    const text = input.value.trim();

    if (!text) return;

    appData.tasks.push({
        id: Date.now(),
        text: text,
        dueDate: dateInput ? dateInput.value : '',
        done: false
    });

    input.value = '';

    if (dateInput) {
        dateInput.value = '';
    }

    saveAppData();
    renderTasks();
}

function toggleTask(id) {
    const task =
        appData.tasks.find(item => item.id === id);

    if (!task) return;

    task.done = !task.done;

    saveAppData();
    renderTasks();
}

function deleteTask(id) {
    appData.tasks =
        appData.tasks.filter(task => task.id !== id);

    saveAppData();
    renderTasks();
}
function renderNotesList() {
    const container = document.getElementById('notes-sidebar-list');
    if (!container) return;

    container.innerHTML = '';

    if (!Array.isArray(appData.notes)) {
        appData.notes = [];
    }

    if (appData.notes.length === 0) {
        container.innerHTML = `
            <div class="text-sm text-slate-400 py-6 text-center">
                Inga anteckningar ännu.
            </div>
        `;
        return;
    }

    const sortedNotes = [...appData.notes].sort((a, b) => {
        return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

    sortedNotes.forEach(note => {
        const item = document.createElement('button');
        item.className =
            'w-full text-left p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition';

        if (note.id === currentActiveNoteId && !isCreatingNewNote) {
            item.classList.add('bg-slate-100');
        }

        item.onclick = function () {
            openNote(note.id);
        };

        const title = note.title && note.title.trim()
            ? note.title
            : 'Namnlös anteckning';

        // Stöd både äldre data (body) och nyare data (content).
        const noteText = note.body ?? note.content ?? '';
        const preview = noteText.trim()
            ? noteText.substring(0, 80)
            : 'Ingen text';

        item.innerHTML = `
            <div class="font-medium text-sm text-slate-700 truncate">
                ${escapeHtml(title)}
            </div>
            <div class="text-xs text-slate-400 mt-1 truncate">
                ${escapeHtml(preview)}
            </div>
        `;

        container.appendChild(item);
    });
}

// Öppnar en tom editor, men skapar INTE en anteckning ännu.
// Anteckningen läggs till först när användaren trycker "Lägg till".
function createNewNote() {
    isCreatingNewNote = true;
    currentActiveNoteId = null;

    renderNotesList();
    displayActiveNote();

    const titleInput = document.getElementById('active-note-title');
    if (titleInput) titleInput.focus();
}

function openNote(id) {
    isCreatingNewNote = false;
    currentActiveNoteId = id;

    renderNotesList();
    displayActiveNote();
}

function displayActiveNote() {
    const titleInput = document.getElementById('active-note-title');
    const contentInput = document.getElementById('active-note-body');
    const emptyState = document.getElementById('no-note-selected');
    const editor = document.getElementById('active-note-editor');

    if (isCreatingNewNote) {
        if (emptyState) emptyState.classList.add('hidden');
        if (editor) editor.classList.remove('hidden');
        if (titleInput) titleInput.value = '';
        if (contentInput) contentInput.value = '';
        return;
    }

    const note = appData.notes.find(
        item => item.id === currentActiveNoteId
    );

    if (!note) {
        if (editor) editor.classList.add('hidden');
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    if (editor) editor.classList.remove('hidden');

    if (titleInput) titleInput.value = note.title || '';
    if (contentInput) contentInput.value = note.body ?? note.content ?? '';
}

// För en ny anteckning sparar oninput ingenting. Du kan skriva klart först.
// Befintliga anteckningar fortsätter däremot att uppdateras som tidigare.
function updateActiveNote() {
    if (isCreatingNewNote) return;

    const note = appData.notes.find(
        item => item.id === currentActiveNoteId
    );
    if (!note) return;

    const titleInput = document.getElementById('active-note-title');
    const contentInput = document.getElementById('active-note-body');
    const text = contentInput ? contentInput.value : '';

    note.title = titleInput ? titleInput.value : '';
    note.body = text;
    note.content = text; // kompatibilitet med data från tidigare version
    note.updatedAt = Date.now();

    saveAppData();
    renderNotesList();
}

function saveActiveNoteManual() {
    const titleInput = document.getElementById('active-note-title');
    const contentInput = document.getElementById('active-note-body');

    const title = titleInput ? titleInput.value.trim() : '';
    const text = contentInput ? contentInput.value.trim() : '';

    if (!title && !text) {
        alert('Skriv en titel eller en anteckning innan du lägger till den.');
        return;
    }

    if (isCreatingNewNote) {
        const now = Date.now();
        const note = {
            id: now,
            createdAt: now,
            title: title || 'Namnlös anteckning',
            body: text,
            content: text,
            updatedAt: now
        };

        appData.notes.push(note);
        currentActiveNoteId = note.id;
        isCreatingNewNote = false;
    } else {
        const note = appData.notes.find(
            item => item.id === currentActiveNoteId
        );
        if (!note) return;

        note.title = title || 'Namnlös anteckning';
        note.body = text;
        note.content = text;
        note.updatedAt = Date.now();
    }

    saveAppData();
    renderNotesList();
    displayActiveNote();
}

// Behåll det gamla funktionsnamnet för kompatibilitet.
function saveActiveNote() {
    saveActiveNoteManual();
}

function deleteActiveNote() {
    // Om användaren bara skriver på ett nytt utkast finns inget sparat att radera.
    if (isCreatingNewNote) {
        isCreatingNewNote = false;
        currentActiveNoteId = null;
        renderNotesList();
        displayActiveNote();
        return;
    }

    if (currentActiveNoteId === null) return;

    appData.notes = appData.notes.filter(
        note => note.id !== currentActiveNoteId
    );

    currentActiveNoteId = null;

    saveAppData();
    renderNotesList();
    displayActiveNote();
}

function renderBooks() {
    const container =
        document.getElementById('books-list');

    if (!container) return;

    container.innerHTML = '';

    if (!Array.isArray(appData.books)) {
        appData.books = [];
    }

    if (appData.books.length === 0) {
        container.innerHTML = `
            <div class="text-sm text-slate-400 py-8 text-center">
                Inga böcker i bokhyllan ännu.
            </div>
        `;

        return;
    }

    appData.books.forEach(book => {
        const card = document.createElement('div');

        card.className =
            'bg-white border border-slate-200 rounded-xl p-4';

        card.innerHTML = `
            <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                    <h3 class="font-semibold text-slate-800 truncate">
                        ${escapeHtml(book.title || 'Namnlös bok')}
                    </h3>

                    <p class="text-sm text-slate-500 mt-1">
                        ${escapeHtml(book.author || '')}
                    </p>

                    ${
                        book.status
                            ? `
                                <span class="inline-block mt-3 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                                    ${escapeHtml(book.status)}
                                </span>
                              `
                            : ''
                    }

                    ${
                        book.notes
                            ? `
                                <p class="text-sm text-slate-600 mt-3 whitespace-pre-wrap">
                                    ${escapeHtml(book.notes)}
                                </p>
                              `
                            : ''
                    }
                </div>

                <div class="flex gap-2 shrink-0">
                    <button
                        onclick="editBook(${book.id})"
                        class="text-slate-400 hover:text-blue-500"
                        title="Redigera"
                    >
                        <i data-lucide="pencil" class="w-4 h-4"></i>
                    </button>

                    <button
                        onclick="deleteBook(${book.id})"
                        class="text-slate-400 hover:text-red-500"
                        title="Radera"
                    >
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        `;

        container.appendChild(card);
    });

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function openBookModal() {
    const modal =
        document.getElementById('book-modal');

    const idInput =
        document.getElementById('book-id');

    const titleInput =
        document.getElementById('book-title');

    const authorInput =
        document.getElementById('book-author');

    const statusInput =
        document.getElementById('book-status');

    const notesInput =
        document.getElementById('book-notes');

    if (idInput) idInput.value = '';
    if (titleInput) titleInput.value = '';
    if (authorInput) authorInput.value = '';
    if (notesInput) notesInput.value = '';

    if (statusInput) {
        statusInput.value = 'Vill läsa';
    }

    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeBookModal() {
    const modal =
        document.getElementById('book-modal');

    if (modal) {
        modal.classList.add('hidden');
    }
}

function saveBook() {
    const idInput =
        document.getElementById('book-id');

    const titleInput =
        document.getElementById('book-title');

    const authorInput =
        document.getElementById('book-author');

    const statusInput =
        document.getElementById('book-status');

    const notesInput =
        document.getElementById('book-notes');

    if (!titleInput) return;

    const title = titleInput.value.trim();

    if (!title) return;

    const existingId =
        idInput && idInput.value
            ? Number(idInput.value)
            : null;

    if (existingId) {
        const book =
            appData.books.find(
                item => item.id === existingId
            );

        if (book) {
            book.title = title;
            book.author =
                authorInput ? authorInput.value.trim() : '';

            book.status =
                statusInput ? statusInput.value : '';

            book.notes =
                notesInput ? notesInput.value.trim() : '';
        }
    } else {
        appData.books.push({
            id: Date.now(),
            title: title,
            author:
                authorInput ? authorInput.value.trim() : '',
            status:
                statusInput ? statusInput.value : '',
            notes:
                notesInput ? notesInput.value.trim() : ''
        });
    }

    saveAppData();
    renderBooks();
    closeBookModal();
}

function editBook(id) {
    const book =
        appData.books.find(item => item.id === id);

    if (!book) return;

    const idInput =
        document.getElementById('book-id');

    const titleInput =
        document.getElementById('book-title');

    const authorInput =
        document.getElementById('book-author');

    const statusInput =
        document.getElementById('book-status');

    const notesInput =
        document.getElementById('book-notes');

    if (idInput) idInput.value = book.id;
    if (titleInput) titleInput.value = book.title || '';
    if (authorInput) authorInput.value = book.author || '';
    if (statusInput) statusInput.value = book.status || '';
    if (notesInput) notesInput.value = book.notes || '';

    const modal =
        document.getElementById('book-modal');

    if (modal) {
        modal.classList.remove('hidden');
    }
}

function deleteBook(id) {
    appData.books =
        appData.books.filter(book => book.id !== id);

    saveAppData();
    renderBooks();
}
function renderDayArchive() {
    const container =
        document.getElementById('day-archive-list');

    if (!container) return;

    container.innerHTML = '';

    const keys = Object.keys(appData.days).sort().reverse();

    if (keys.length === 0) {
        container.innerHTML = `
            <div class="text-sm text-slate-400 py-8 text-center">
                Ingen historik ännu.
            </div>
        `;
        return;
    }

    keys.forEach(key => {
        const day = appData.days[key];

        const goals = Array.isArray(day.goals)
            ? day.goals
            : [];

        const schedule = Array.isArray(day.schedule)
            ? day.schedule
            : [];

        const completedGoals =
            goals.filter(goal => goal.done).length;

        const completedSchedule =
            schedule.filter(item => item.done).length;

        const card = document.createElement('button');

        card.className =
            'w-full text-left bg-white border border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition';

        card.onclick = function () {
            openArchivedDay(key);
        };

        const dateParts = key.split('-');

        const date = new Date(
            Number(dateParts[0]),
            Number(dateParts[1]) - 1,
            Number(dateParts[2])
        );

        card.innerHTML = `
            <div class="flex items-center justify-between gap-4">
                <div>
                    <div class="font-semibold text-slate-800">
                        ${escapeHtml(formatDateNice(date))}
                    </div>

                    <div class="text-xs text-slate-400 mt-1">
                        ${completedGoals}/${goals.length} mål klara
                        •
                        ${completedSchedule}/${schedule.length} schemapunkter klara
                    </div>
                </div>

                <i
                    data-lucide="chevron-right"
                    class="w-5 h-5 text-slate-400"
                ></i>
            </div>
        `;

        container.appendChild(card);
    });

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function openArchivedDay(key) {
    const input =
        document.getElementById('selected-date-input');

    if (input) {
        input.value = key;
    }

    switchTab('schedule');
    loadDayData();
}

function updateSidebarProgress() {
    const todayKey =
        getLocalDateString(new Date());

    const day =
        getDayRecord(todayKey);

    const goals =
        Array.isArray(day.goals)
            ? day.goals
            : [];

    const completed =
        goals.filter(goal => goal.done).length;

    const total =
        goals.length;

    const percent =
        total === 0
            ? 0
            : Math.round(
                (completed / total) * 100
            );

    const progressBar =
        document.getElementById(
            'sidebar-progress-bar'
        );

    const progressText =
        document.getElementById(
            'sidebar-progress-text'
        );

    if (progressBar) {
        progressBar.style.width =
            `${percent}%`;
    }

    if (progressText) {
        progressText.textContent =
            `${percent}%`;
    }
}

function exportData() {
    try {
        const json =
            JSON.stringify(
                appData,
                null,
                2
            );

        const blob =
            new Blob(
                [json],
                {
                    type: 'application/json'
                }
            );

        const url =
            URL.createObjectURL(blob);

        const link =
            document.createElement('a');

        const date =
            getLocalDateString(new Date());

        link.href = url;

        link.download =
            `min-schema-hub-${date}.json`;

        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    } catch (error) {
        console.error(
            'Kunde inte exportera data:',
            error
        );

        alert(
            'Något gick fel när datan skulle exporteras.'
        );
    }
}

function importData(event) {
    const file =
        event.target.files[0];

    if (!file) return;

    const reader =
        new FileReader();

    reader.onload = function (e) {
        try {
            const parsed =
                JSON.parse(e.target.result);

            if (
                !parsed ||
                typeof parsed !== 'object'
            ) {
                throw new Error(
                    'Ogiltig data'
                );
            }

            appData = {
                days:
                    parsed.days || {},

                goals: {
                    week:
                        parsed.goals?.week || {},

                    month:
                        parsed.goals?.month || {},

                    year:
                        parsed.goals?.year || {}
                },

                tasks:
                    Array.isArray(parsed.tasks)
                        ? parsed.tasks
                        : [],

                notes:
                    Array.isArray(parsed.notes)
                        ? parsed.notes
                        : [],

                books:
                    Array.isArray(parsed.books)
                        ? parsed.books
                        : []
            };

            currentActiveNoteId = null;

            saveAppData();

            initApp();

            alert(
                'Datan importerades.'
            );
        } catch (error) {
            console.error(
                'Kunde inte importera data:',
                error
            );

            alert(
                'Filen kunde inte läsas. Kontrollera att det är rätt JSON-fil.'
            );
        }

        event.target.value = '';
    };

    reader.readAsText(file);
}

/* ============================================================
   Stabilitetsfixar 2026-09: kopplar JavaScript till aktuell HTML.
   Inga nya produktfunktioner; befintliga dataformat bevaras.
   ============================================================ */

function loadAppData() {
    const saved = localStorage.getItem('min_schema_hub_data_v1');
    if (!saved) return;
    try {
        const parsed = JSON.parse(saved);
        if (!parsed || typeof parsed !== 'object') return;
        appData = {
            days: parsed.days || {},
            goals: {
                week: parsed.goals?.week || {},
                month: parsed.goals?.month || {},
                year: parsed.goals?.year || {}
            },
            tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
            notes: Array.isArray(parsed.notes) ? parsed.notes : [],
            books: Array.isArray(parsed.books) ? parsed.books : [],
            history: Array.isArray(parsed.history) ? parsed.history : []
        };
        // Migrera utan att radera äldre fält.
        Object.values(appData.days).forEach(day => {
            if (!Array.isArray(day.goals)) day.goals = [];
            if (!Array.isArray(day.schedule)) day.schedule = [];
            if (!Array.isArray(day.dayNotes)) day.dayNotes = [];
        });
    } catch (e) {
        console.error('Kunde inte läsa sparad data', e);
    }
}

function saveAppData() {
    try {
        localStorage.setItem('min_schema_hub_data_v1', JSON.stringify(appData));
        updateSidebarProgress();
        renderGlobalCompletedGoals();
    } catch (e) {
        console.error('Kunde inte spara till localStorage', e);
    }
}

function addHistory(action, title, plannedDate = null) {
    if (!Array.isArray(appData.history)) appData.history = [];
    appData.history.unshift({
        id: Date.now() + Math.floor(Math.random() * 1000),
        action,
        title,
        at: Date.now(),
        plannedDate
    });
}

function setTodayDate() {
    const input = document.getElementById('selected-date-input');
    if (input) input.value = getLocalDateString(new Date());
    loadDayData();
}

function loadDayData() {
    const key = getSelectedDateKey();
    const day = getDayRecord(key);
    const label = document.getElementById('active-day-label');
    if (label) label.textContent = formatDateNice(getSelectedDate());
    renderDailyGoals(day);
    renderSchedule(day);
    renderDayNotes(day);
    updateDailyProgress(day);
    updateSidebarProgress();
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function updateDailyProgress(day) {
    const total = Array.isArray(day.goals) ? day.goals.length : 0;
    const completed = Array.isArray(day.goals) ? day.goals.filter(g => g.done).length : 0;
    const counter = document.getElementById('daily-goals-counter');
    if (counter) counter.textContent = `${completed}/${total} klara`;
}

function renderSchedule(day) {
    const container = document.getElementById('schedule-items-list');
    if (!container) return;
    const items = Array.isArray(day.schedule) ? [...day.schedule] : [];
    items.sort((a,b) => (a.time || '').localeCompare(b.time || ''));
    container.innerHTML = items.length ? '' : '<div class="text-sm text-slate-400 py-4 text-center">Inget i schemat ännu.</div>';
    items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl';
        row.innerHTML = `<button onclick="toggleScheduleItem(${item.id})" class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${item.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}">${item.done ? '✓' : ''}</button><div class="w-16 text-sm font-semibold text-slate-500">${escapeHtml(item.time || '')}</div><div class="flex-1 text-sm ${item.done ? 'line-through text-slate-400' : 'text-slate-700'}">${escapeHtml(item.text || '')}</div><button onclick="deleteScheduleItem(${item.id})" class="text-slate-400 hover:text-red-500" title="Radera"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`;
        container.appendChild(row);
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderDayNotes(dayArg) {
    const day = dayArg || getDayRecord(getSelectedDateKey());
    const container = document.getElementById('day-notes-container');
    const sidebar = document.getElementById('sidebar-day-notes-preview');
    if (!Array.isArray(day.dayNotes)) day.dayNotes = [];
    const query = (document.getElementById('day-notes-search')?.value || '').trim().toLowerCase();
    const notes = day.dayNotes.filter(n => `${n.title || ''} ${n.body || n.text || ''}`.toLowerCase().includes(query));
    const empty = '<div class="text-sm text-slate-400 py-4 text-center">Inga dagsanteckningar ännu.</div>';
    if (container) {
        container.innerHTML = notes.length ? '' : empty;
        notes.forEach(note => {
            const card = document.createElement('article');
            card.className = 'p-4 bg-white border border-slate-200 rounded-xl';
            card.innerHTML = `<div class="flex items-start gap-3"><div class="flex-1 min-w-0"><h4 class="font-semibold text-sm text-slate-800">${escapeHtml(note.title || 'Anteckning')}</h4><p class="text-sm text-slate-600 whitespace-pre-wrap mt-1">${escapeHtml(note.body || note.text || '')}</p></div><button onclick="deleteDayNote(${note.id})" class="text-slate-400 hover:text-red-500" title="Radera"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div>`;
            container.appendChild(card);
        });
    }
    if (sidebar) {
        sidebar.innerHTML = day.dayNotes.length ? '' : '<p class="text-xs text-slate-400">Inga anteckningar idag.</p>';
        day.dayNotes.slice(-5).reverse().forEach(note => {
            const div = document.createElement('div');
            div.className = 'text-xs text-slate-300 truncate';
            div.textContent = note.title || note.body || note.text || 'Anteckning';
            sidebar.appendChild(div);
        });
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function openDayNoteModal() {
    const modal = document.getElementById('day-note-modal');
    const title = document.getElementById('modal-note-title');
    const body = document.getElementById('modal-note-body');
    if (title) title.value = '';
    if (body) body.value = '';
    if (modal) modal.classList.remove('hidden');
    setTimeout(() => title?.focus(), 0);
}
function closeDayNoteModal() { document.getElementById('day-note-modal')?.classList.add('hidden'); }
function saveDayNote(event) {
    event?.preventDefault();
    const title = document.getElementById('modal-note-title')?.value.trim() || '';
    const body = document.getElementById('modal-note-body')?.value.trim() || '';
    if (!title || !body) return;
    const key = getSelectedDateKey();
    const day = getDayRecord(key);
    if (!Array.isArray(day.dayNotes)) day.dayNotes = [];
    const now = Date.now();
    day.dayNotes.push({ id: now, title, body, text: body, createdAt: now, updatedAt: now });
    addHistory('Dagsanteckning skapad', title, key);
    saveAppData();
    closeDayNoteModal();
    renderDayNotes(day);
    renderDayArchive();
}
function deleteDayNote(id) {
    const key = getSelectedDateKey();
    const day = getDayRecord(key);
    day.dayNotes = (day.dayNotes || []).filter(n => n.id !== id);
    saveAppData(); renderDayNotes(day); renderDayArchive();
}

function addDailyGoal(event) {
    event?.preventDefault();
    const input = document.getElementById('new-daily-goal');
    const text = input?.value.trim(); if (!text) return;
    const key = getSelectedDateKey(); const day = getDayRecord(key); const now = Date.now();
    day.goals.push({id: now, text, done:false, createdAt:now, updatedAt:now, completedAt:null});
    addHistory('Dagsmål tillagt', text, key); input.value=''; saveAppData(); loadDayData(); renderDayArchive();
}
function addScheduleItem(event) {
    event?.preventDefault();
    const timeInput=document.getElementById('new-schedule-time'); const textInput=document.getElementById('new-schedule-text');
    const time=timeInput?.value || ''; const text=textInput?.value.trim(); if(!time || !text) return;
    const key=getSelectedDateKey(); const day=getDayRecord(key); const now=Date.now();
    day.schedule.push({id:now,time,text,done:false,createdAt:now,updatedAt:now,completedAt:null});
    addHistory('Schemapost tillagd', `${time} ${text}`, key); timeInput.value=''; textInput.value=''; saveAppData(); loadDayData(); renderDayArchive();
}
function toggleDailyGoal(id) { const key=getSelectedDateKey(), day=getDayRecord(key), g=day.goals.find(x=>x.id===id); if(!g)return; g.done=!g.done; g.updatedAt=Date.now(); g.completedAt=g.done?Date.now():null; if(g.done)addHistory('Dagsmål klart',g.text,key); saveAppData(); loadDayData(); renderDayArchive(); }
function toggleScheduleItem(id) { const key=getSelectedDateKey(), day=getDayRecord(key), x=day.schedule.find(s=>s.id===id); if(!x)return; x.done=!x.done; x.updatedAt=Date.now(); x.completedAt=x.done?Date.now():null; if(x.done)addHistory('Schemapost klar',x.text,key); saveAppData(); loadDayData(); renderDayArchive(); }

function addGoal(event, type) {
    if (typeof event === 'string') { type=event; event=null; }
    event?.preventDefault();
    const input=document.getElementById(`new-${type}-goal`); const text=input?.value.trim(); if(!text)return;
    const goals=getGoalsForType(type); const now=Date.now(); goals.push({id:now,text,done:false,createdAt:now,updatedAt:now});
    addHistory('Mål tillagt',text,getGoalKey(type)); input.value=''; saveAppData(); renderGoals();
}

function renderTasks() {
    const container=document.getElementById('tasks-container-list'); if(!container)return;
    const filter=document.getElementById('filter-task-status')?.value || 'all';
    const tasks=(appData.tasks||[]).filter(t=>filter==='all'||(filter==='active'&&!t.done)||(filter==='completed'&&t.done));
    container.innerHTML=tasks.length?'':'<div class="text-sm text-slate-400 py-8 text-center">Inga uppgifter ännu.</div>';
    tasks.forEach(task=>{ const row=document.createElement('div'); row.className='flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl'; row.innerHTML=`<button onclick="toggleTask(${task.id})" class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${task.done?'bg-emerald-500 border-emerald-500 text-white':'border-slate-300'}">${task.done?'✓':''}</button><div class="flex-1"><div class="${task.done?'line-through text-slate-400':'text-slate-700'}">${escapeHtml(task.text)}</div><div class="text-xs text-slate-400 mt-1">${escapeHtml(task.priority==='high'?'Hög prioritet':task.priority==='low'?'Låg prioritet':'Normal prioritet')}</div></div><button onclick="deleteTask(${task.id})" class="text-slate-400 hover:text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`; container.appendChild(row); });
    const badge=document.getElementById('task-counter-badge'); if(badge)badge.textContent=`${tasks.length} st`; if(typeof lucide!=='undefined')lucide.createIcons();
}
function addTask(event) { event?.preventDefault(); const input=document.getElementById('new-task-text'); const priority=document.getElementById('new-task-priority'); const text=input?.value.trim(); if(!text)return; const now=Date.now(); appData.tasks.push({id:now,text,priority:priority?.value||'normal',done:false,createdAt:now,updatedAt:now,completedAt:null,dueDate:''}); addHistory('Uppgift tillagd',text,null); input.value=''; if(priority)priority.value='normal'; saveAppData(); renderTasks(); }
function toggleTask(id){const t=appData.tasks.find(x=>x.id===id);if(!t)return;t.done=!t.done;t.updatedAt=Date.now();t.completedAt=t.done?Date.now():null;saveAppData();renderTasks();}

function renderBooks() {
    const container=document.getElementById('books-grid'); if(!container)return;
    const filter=document.getElementById('filter-book-status')?.value||'all'; const q=(document.getElementById('book-search')?.value||'').trim().toLowerCase();
    const normStatus=s=>s==='finished'||s==='read'?'read':s==='reading'?'reading':s==='want'?'want':s;
    const books=(appData.books||[]).filter(b=>(filter==='all'||normStatus(b.status)===filter)&&`${b.title||''} ${b.author||''}`.toLowerCase().includes(q));
    container.innerHTML=books.length?'':'<div class="md:col-span-2 text-sm text-slate-400 py-8 text-center">Inga böcker matchar.</div>';
    books.forEach(book=>{const card=document.createElement('article');card.className='bg-white border border-slate-200 rounded-xl p-4';const status=normStatus(book.status);const label=status==='read'?'Läst':status==='reading'?'Läser nu':'Att läsa';const notes=book.summary??book.notes??'';card.innerHTML=`<div class="flex items-start justify-between gap-3"><div class="min-w-0 flex-1"><h3 class="font-semibold text-slate-800">${escapeHtml(book.title||'Namnlös bok')}</h3><p class="text-sm text-slate-500 mt-1">${escapeHtml(book.author||'')}</p><div class="flex gap-2 mt-3"><span class="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">${label}</span>${book.rating?`<span class="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">${escapeHtml(book.rating)}/10</span>`:''}</div>${notes?`<p class="text-sm text-slate-600 mt-3 whitespace-pre-wrap">${escapeHtml(notes)}</p>`:''}</div><div class="flex gap-2"><button onclick="editBook(${book.id})" class="text-slate-400 hover:text-blue-500"><i data-lucide="pencil" class="w-4 h-4"></i></button><button onclick="deleteBook(${book.id})" class="text-slate-400 hover:text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div></div>`;container.appendChild(card);});if(typeof lucide!=='undefined')lucide.createIcons();
}
function openBookModal(){document.getElementById('edit-book-id').value='';document.getElementById('modal-book-title').value='';document.getElementById('modal-book-author').value='';document.getElementById('modal-book-status').value='want';document.getElementById('modal-book-rating').value='0';document.getElementById('modal-book-notes').value='';document.getElementById('book-modal-title').lastChild.textContent=' Lägg till bok';document.getElementById('book-modal')?.classList.remove('hidden');}
function saveBook(event){event?.preventDefault();const id=Number(document.getElementById('edit-book-id')?.value)||null;const title=document.getElementById('modal-book-title')?.value.trim();if(!title)return;const author=document.getElementById('modal-book-author')?.value.trim()||'';const status=document.getElementById('modal-book-status')?.value||'want';const rating=Number(document.getElementById('modal-book-rating')?.value)||0;const summary=document.getElementById('modal-book-notes')?.value.trim()||'';const now=Date.now();if(id){const b=appData.books.find(x=>x.id===id);if(b)Object.assign(b,{title,author,status,rating,summary,notes:summary,updatedAt:now});}else{appData.books.push({id:now,createdAt:now,startedAt:status==='reading'?now:null,finishedAt:status==='read'?now:null,title,author,status,rating,summary,notes:summary,updatedAt:now});addHistory('Bok tillagd',title,null);}saveAppData();renderBooks();closeBookModal();}
function editBook(id){const b=appData.books.find(x=>x.id===id);if(!b)return;document.getElementById('edit-book-id').value=b.id;document.getElementById('modal-book-title').value=b.title||'';document.getElementById('modal-book-author').value=b.author||'';document.getElementById('modal-book-status').value=(b.status==='finished'?'read':b.status)||'want';document.getElementById('modal-book-rating').value=String(b.rating||0);document.getElementById('modal-book-notes').value=b.summary??b.notes??'';document.getElementById('book-modal')?.classList.remove('hidden');}

function renderDayArchive(){const container=document.getElementById('day-archive-container');if(!container)return;const q=(document.getElementById('archive-search')?.value||'').trim().toLowerCase();const keys=Object.keys(appData.days||{}).sort().reverse().filter(key=>{const d=appData.days[key]||{};const hay=[key,...(d.goals||[]).map(x=>x.text),...(d.schedule||[]).map(x=>`${x.time} ${x.text}`),...(d.dayNotes||[]).map(x=>`${x.title||''} ${x.body||x.text||''}`)].join(' ').toLowerCase();return hay.includes(q);});container.innerHTML=keys.length?'':'<div class="text-sm text-slate-400 py-8 text-center">Ingen historik ännu.</div>';keys.forEach(key=>{const d=appData.days[key],goals=d.goals||[],schedule=d.schedule||[],notes=d.dayNotes||[];const card=document.createElement('button');card.className='w-full text-left bg-white border border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition';card.onclick=()=>openArchivedDay(key);card.innerHTML=`<div class="flex items-center justify-between"><div><div class="font-semibold text-slate-800">${escapeHtml(key)}</div><div class="text-xs text-slate-400 mt-1">${goals.filter(x=>x.done).length}/${goals.length} mål • ${schedule.length} schemapunkter • ${notes.length} anteckningar</div></div><i data-lucide="chevron-right" class="w-5 h-5 text-slate-400"></i></div>`;container.appendChild(card);});if(typeof lucide!=='undefined')lucide.createIcons();}
function openArchivedDay(key){const input=document.getElementById('selected-date-input');if(input)input.value=key;switchTab('schema');loadDayData();}

function updateSidebarProgress(){const day=appData.days?.[getLocalDateString(new Date())]||{goals:[]};const goals=Array.isArray(day.goals)?day.goals:[];const completed=goals.filter(g=>g.done).length;const count=document.getElementById('sidebar-completed-count');const total=document.getElementById('sidebar-total-count');const meter=document.getElementById('sidebar-progress-bar');if(count)count.textContent=completed;if(total)total.textContent=`/ ${goals.length} st`;if(meter)meter.value=goals.length?Math.round(completed/goals.length*100):0;}

function switchTab(tabName){document.querySelectorAll('.tab-content').forEach(s=>s.classList.add('hidden'));document.getElementById(`tab-content-${tabName}`)?.classList.remove('hidden');document.querySelectorAll('.tab-btn').forEach(b=>{b.classList.remove('bg-indigo-50','text-indigo-700');b.classList.add('text-slate-600');});const btn=document.getElementById(`nav-${tabName}`);if(btn){btn.classList.add('bg-indigo-50','text-indigo-700');btn.classList.remove('text-slate-600');}if(tabName==='dagarkiv')renderDayArchive();if(tabName==='mal')renderGoals();if(tabName==='uppgifter')renderTasks();if(tabName==='anteckningar')renderNotesList();if(tabName==='bocker')renderBooks();if(typeof lucide!=='undefined')lucide.createIcons();}

// Skapa aldrig automatiska standardmål på nya datum. Ett nytt datum börjar tomt.
function getDayRecord(key) {
    if (!appData.days[key]) {
        appData.days[key] = { goals: [], schedule: [], dayNotes: [] };
    }
    const day = appData.days[key];
    if (!Array.isArray(day.goals)) day.goals = [];
    if (!Array.isArray(day.schedule)) day.schedule = [];
    if (!Array.isArray(day.dayNotes)) day.dayNotes = [];
    return day;
}

function renderGlobalCompletedGoals() {
    const list = document.getElementById('sidebar-global-completed-list');
    const badge = document.getElementById('sidebar-global-completed-badge');
    const completed = [];
    ['week','month','year'].forEach(type => {
        Object.entries(appData.goals?.[type] || {}).forEach(([period, goals]) => {
            (Array.isArray(goals) ? goals : []).filter(g => g.done).forEach(g => completed.push({text:g.text, period}));
        });
    });
    if (badge) badge.textContent = `${completed.length} st`;
    if (list) {
        list.innerHTML = completed.length ? '' : '<p class="text-xs text-slate-500">Inga avklarade mål ännu.</p>';
        completed.slice(0, 20).forEach(g => {
            const row=document.createElement('div'); row.className='text-xs text-slate-300';
            row.innerHTML=`<span class="text-emerald-400">✓</span> ${escapeHtml(g.text)} <span class="text-slate-500">(${escapeHtml(g.period)})</span>`;
            list.appendChild(row);
        });
    }
}

function importData(event) {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const parsed=JSON.parse(e.target.result); if(!parsed||typeof parsed!=='object') throw new Error('Ogiltig data');
            appData={days:parsed.days||{},goals:{week:parsed.goals?.week||{},month:parsed.goals?.month||{},year:parsed.goals?.year||{}},tasks:Array.isArray(parsed.tasks)?parsed.tasks:[],notes:Array.isArray(parsed.notes)?parsed.notes:[],books:Array.isArray(parsed.books)?parsed.books:[],history:Array.isArray(parsed.history)?parsed.history:[]};
            currentActiveNoteId=null; isCreatingNewNote=false; saveAppData(); initApp(); alert('Datan importerades.');
        } catch(err){console.error('Kunde inte importera data:',err);alert('Filen kunde inte läsas. Kontrollera att det är rätt JSON-fil.');}
        event.target.value='';
    };
    reader.readAsText(file);
}

/* ============================================================
   Supabase cloud persistence
   - Supabase is the source of truth for authenticated users.
   - localStorage is retained as an offline cache / migration source.
   - Writes are debounced and upsert one private JSON document per user.
   ============================================================ */
const CLOUD_TABLE = 'personal_hub_data';
const LOCAL_STORAGE_KEY = 'min_schema_hub_data_v1';
let cloudUser = null;
let cloudSaveTimer = null;
let cloudSaveInFlight = false;
let cloudSavePending = false;
let cloudReady = false;

function normalizeAppData(data) {
    const src = data && typeof data === 'object' ? data : {};
    const normalized = {
        days: src.days && typeof src.days === 'object' ? src.days : {},
        goals: {
            week: src.goals?.week && typeof src.goals.week === 'object' ? src.goals.week : {},
            month: src.goals?.month && typeof src.goals.month === 'object' ? src.goals.month : {},
            year: src.goals?.year && typeof src.goals.year === 'object' ? src.goals.year : {}
        },
        tasks: Array.isArray(src.tasks) ? src.tasks : [],
        notes: Array.isArray(src.notes) ? src.notes : [],
        books: Array.isArray(src.books) ? src.books : [],
        history: Array.isArray(src.history) ? src.history : []
    };
    Object.values(normalized.days).forEach(day => {
        if (!Array.isArray(day.goals)) day.goals = [];
        if (!Array.isArray(day.schedule)) day.schedule = [];
        if (!Array.isArray(day.dayNotes)) {
            // Migrate the oldest daily free-text format without deleting it.
            day.dayNotes = typeof day.notes === 'string' && day.notes.trim()
                ? [{ id: Date.now() + Math.floor(Math.random()*1000), title: 'Dagsanteckning', body: day.notes, text: day.notes, createdAt: Date.now(), updatedAt: Date.now() }]
                : [];
        }
    });
    normalized.notes.forEach(note => {
        if (note.body == null && note.content != null) note.body = note.content;
        if (note.content == null && note.body != null) note.content = note.body;
    });
    return normalized;
}

function readLocalCache() {
    try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        return raw ? normalizeAppData(JSON.parse(raw)) : normalizeAppData({});
    } catch (error) {
        console.error('Kunde inte läsa lokal cache:', error);
        return normalizeAppData({});
    }
}

function writeLocalCache() {
    try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appData)); }
    catch (error) { console.error('Kunde inte skriva lokal cache:', error); }
}

function setCloudStatus(text, state = 'neutral') {
    const el = document.getElementById('cloud-sync-status');
    if (!el) return;
    el.textContent = text;
    el.dataset.state = state;
}

function setAuthenticatedUi(isAuthenticated, email = '') {
    const loginBox = document.getElementById('loginBox');
    const appShell = document.getElementById('app-shell');
    if (loginBox) loginBox.classList.toggle('hidden', isAuthenticated);
    if (appShell) appShell.classList.toggle('hidden', !isAuthenticated);
    const emailEl = document.getElementById('signed-in-email');
    if (emailEl) emailEl.textContent = email || '';
}

function renderWholeApp() {
    const todayStr = getLocalDateString(new Date());
    const currentDateDisplay = document.getElementById('current-date-display');
    if (currentDateDisplay) currentDateDisplay.textContent = formatDateNice(new Date());
    const dateInput = document.getElementById('selected-date-input');
    if (dateInput && !dateInput.value) dateInput.value = todayStr;
    populateWeekSelector();
    populateYearSelector();
    const monthSelect = document.getElementById('select-month');
    if (monthSelect && monthSelect.value === '') monthSelect.value = new Date().getMonth();
    loadDayData();
    renderGoals();
    renderTasks();
    renderNotesList();
    renderBooks();
    renderDayArchive();
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function loadCloudDataForUser(user) {
    cloudReady = false;
    setCloudStatus('Laddar från molnet…', 'syncing');
    const local = readLocalCache();
    const { data, error } = await supabaseClient
        .from(CLOUD_TABLE)
        .select('data, updated_at')
        .eq('user_id', user.id)
        .maybeSingle();

    if (error) {
        console.error('Supabase kunde inte läsa appdata:', error);
        appData = local;
        renderWholeApp();
        setCloudStatus('Molnfel – lokal cache används', 'error');
        return;
    }

    if (data?.data) {
        appData = normalizeAppData(data.data);
        writeLocalCache();
        cloudReady = true;
        renderWholeApp();
        setCloudStatus('Synkad med molnet', 'ok');
        return;
    }

    // First cloud login: migrate existing browser data instead of discarding it.
    appData = local;
    cloudReady = true;
    renderWholeApp();
    await flushCloudSave();
}

async function flushCloudSave() {
    if (!cloudUser || !cloudReady) return;
    if (cloudSaveInFlight) { cloudSavePending = true; return; }
    cloudSaveInFlight = true;
    cloudSavePending = false;
    setCloudStatus('Sparar…', 'syncing');
    const payload = JSON.parse(JSON.stringify(appData));
    const { error } = await supabaseClient.from(CLOUD_TABLE).upsert({
        user_id: cloudUser.id,
        data: payload,
        updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
    cloudSaveInFlight = false;
    if (error) {
        console.error('Supabase kunde inte spara appdata:', error);
        setCloudStatus('Kunde inte spara i molnet', 'error');
    } else {
        setCloudStatus('Sparat i molnet', 'ok');
    }
    if (cloudSavePending) await flushCloudSave();
}

function queueCloudSave() {
    if (!cloudUser || !cloudReady) return;
    clearTimeout(cloudSaveTimer);
    setCloudStatus('Ändringar väntar…', 'syncing');
    cloudSaveTimer = setTimeout(() => { flushCloudSave(); }, 350);
}

// Override persistence: every existing feature already calls saveAppData().
// This keeps those features intact while making the cloud the permanent store.
function saveAppData() {
    appData = normalizeAppData(appData);
    writeLocalCache();
    updateSidebarProgress();
    renderGlobalCompletedGoals();
    queueCloudSave();
}

async function loginToSupabase() {
    const email = document.getElementById('loginEmail')?.value.trim();
    const password = document.getElementById('loginPassword')?.value || '';
    const message = document.getElementById('loginMessage');
    if (!email || !password) { if (message) message.textContent = 'Fyll i e-post och lösenord.'; return; }
    if (message) message.textContent = 'Loggar in…';
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) { if (message) message.textContent = 'Kunde inte logga in: ' + error.message; return; }
    if (message) message.textContent = '';
}

async function logoutFromSupabase() {
    await flushCloudSave();
    const { error } = await supabaseClient.auth.signOut();
    if (error) alert('Kunde inte logga ut: ' + error.message);
}

async function initializeCloudApp() {
    appData = readLocalCache();
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error) console.error('Kunde inte läsa Supabase-session:', error);
    if (session?.user) {
        cloudUser = session.user;
        setAuthenticatedUi(true, cloudUser.email || '');
        await loadCloudDataForUser(cloudUser);
    } else {
        cloudUser = null;
        cloudReady = false;
        setAuthenticatedUi(false);
        setCloudStatus('Inte inloggad', 'neutral');
    }
}

supabaseClient.auth.onAuthStateChange((event, session) => {
    // Defer Supabase calls outside the auth callback to avoid callback deadlocks.
    setTimeout(async () => {
        if (event === 'SIGNED_IN' && session?.user) {
            cloudUser = session.user;
            setAuthenticatedUi(true, cloudUser.email || '');
            await loadCloudDataForUser(cloudUser);
        } else if (event === 'SIGNED_OUT') {
            cloudUser = null;
            cloudReady = false;
            currentActiveNoteId = null;
            isCreatingNewNote = false;
            setAuthenticatedUi(false);
            setCloudStatus('Inte inloggad', 'neutral');
        }
    }, 0);
});

// Replace the older synchronous startup.
window.onload = initializeCloudApp;

// Best-effort final cloud write when the tab becomes hidden.
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && cloudUser && cloudReady) flushCloudSave();
});
