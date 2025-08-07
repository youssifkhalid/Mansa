// Global Variables
let currentUser = null;
let currentView = 'today';
let tasks = [];
let timerInterval = null;
let timerState = {
    isRunning: false,
    timeLeft: 25 * 60, // 25 minutes in seconds
    totalTime: 25 * 60,
    currentTask: null
};

// DOM Elements
const loadingScreen = document.getElementById('loadingScreen');
const authContainer = document.getElementById('authContainer');
const appContainer = document.getElementById('appContainer');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');
const userDropdown = document.getElementById('userDropdown');
const toastContainer = document.getElementById('toastContainer');

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    requestNotificationPermission();
});

// Initialize Application
function initializeApp() {
    // Check if Firebase is loaded
    if (typeof window.firebaseAuth === 'undefined') {
        console.error('Firebase not loaded properly');
        showToast('خطأ في تحميل Firebase', 'error');
        return;
    }

    // Listen for auth state changes
    window.firebaseAuthStateChanged(window.firebaseAuth, (user) => {
        if (user) {
            currentUser = user;
            showApp();
            loadUserData();
        } else {
            currentUser = null;
            showAuth();
        }
        hideLoading();
    });
}

// Setup Event Listeners
function setupEventListeners() {
    // Auth Forms
    document.getElementById('loginFormElement').addEventListener('submit', handleLogin);
    document.getElementById('registerFormElement').addEventListener('submit', handleRegister);
    document.getElementById('googleSignIn').addEventListener('click', handleGoogleSignIn);

    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const view = e.currentTarget.dataset.view;
            switchView(view);
        });
    });

    // Menu Toggle
    menuToggle.addEventListener('click', toggleSidebar);

    // User Menu
    document.getElementById('userMenuBtn').addEventListener('click', toggleUserMenu);

    // Add Task Form
    document.getElementById('addTaskForm').addEventListener('submit', handleAddTask);

    // Timer Controls
    document.getElementById('timerStart').addEventListener('click', startTimer);
    document.getElementById('timerPause').addEventListener('click', pauseTimer);
    document.getElementById('timerStop').addEventListener('click', stopTimer);
    document.getElementById('timerReset').addEventListener('click', resetTimer);

    // Timer Preset
    document.getElementById('timerPreset').addEventListener('change', handleTimerPresetChange);

    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target.id);
        }
        
        // Close user dropdown when clicking outside
        if (!e.target.closest('.user-menu')) {
            userDropdown.classList.add('hidden');
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// Authentication Functions
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        showLoading();
        await window.firebaseSignIn(window.firebaseAuth, email, password);
        showToast('تم تسجيل الدخول بنجاح!', 'success');
    } catch (error) {
        console.error('Login error:', error);
        showToast(getErrorMessage(error.code), 'error');
        hideLoading();
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
        showToast('كلمات المرور غير متطابقة', 'error');
        return;
    }

    if (password.length < 6) {
        showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
        return;
    }

    try {
        showLoading();
        const userCredential = await window.firebaseSignUp(window.firebaseAuth, email, password);
        await window.firebaseUpdateProfile(userCredential.user, { displayName: name });
        showToast('تم إنشاء الحساب بنجاح!', 'success');
    } catch (error) {
        console.error('Register error:', error);
        showToast(getErrorMessage(error.code), 'error');
        hideLoading();
    }
}

async function handleGoogleSignIn() {
    try {
        showLoading();
        await window.firebaseGoogleSignIn();
        showToast('تم تسجيل الدخول بنجاح!', 'success');
    } catch (error) {
        console.error('Google sign in error:', error);
        showToast(getErrorMessage(error.code), 'error');
        hideLoading();
    }
}

async function signOut() {
    try {
        await window.firebaseSignOut();
        showToast('تم تسجيل الخروج بنجاح', 'success');
    } catch (error) {
        console.error('Sign out error:', error);
        showToast('حدث خطأ أثناء تسجيل الخروج', 'error');
    }
}

// UI Functions
function showLoading() {
    loadingScreen.classList.remove('hidden');
}

function hideLoading() {
    loadingScreen.classList.add('hidden');
}

function showAuth() {
    authContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');
}

function showApp() {
    authContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
    updateUserInfo();
    updateTodayDate();
    loadTasks();
}

function showLogin() {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
}

function showRegister() {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function toggleSidebar() {
    sidebar.classList.toggle('open');
}

function toggleUserMenu() {
    userDropdown.classList.toggle('hidden');
}

function switchView(view) {
    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-view="${view}"]`).classList.add('active');

    // Update views
    document.querySelectorAll('.view').forEach(v => {
        v.classList.remove('active');
    });
    document.getElementById(`${view}View`).classList.add('active');

    currentView = view;

    // Load view-specific data
    switch (view) {
        case 'today':
            loadTodayTasks();
            break;
        case 'weekly':
            loadWeeklyView();
            break;
        case 'stats':
            loadStatsView();
            break;
        case 'timer':
            loadTimerView();
            break;
    }
}

function updateUserInfo() {
    if (!currentUser) return;

    const displayName = currentUser.displayName || currentUser.email.split('@')[0];
    const photoURL = currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=667eea&color=fff`;

    document.getElementById('userWelcome').textContent = `مرحباً، ${displayName}`;
    document.getElementById('userAvatar').src = photoURL;
    document.getElementById('dropdownAvatar').src = photoURL;
    document.getElementById('dropdownName').textContent = displayName;
    document.getElementById('dropdownEmail').textContent = currentUser.email;
}

function updateTodayDate() {
    const today = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    const dateString = today.toLocaleDateString('ar-EG', options);
    document.getElementById('todayDate').textContent = dateString;
}

// Task Management Functions
async function loadUserData() {
    try {
        await loadTasks();
        updateStats();
    } catch (error) {
        console.error('Error loading user data:', error);
        showToast('حدث خطأ في تحميل البيانات', 'error');
    }
}

async function loadTasks() {
    if (!currentUser) return;

    try {
        const tasksQuery = window.firestoreQuery(
            window.firestoreCollection(window.firebaseDb, 'tasks'),
            window.firestoreWhere('userId', '==', currentUser.uid),
            window.firestoreOrderBy('createdAt', 'desc')
        );

        const querySnapshot = await window.firestoreGetDocs(tasksQuery);
        tasks = [];
        
        querySnapshot.forEach((doc) => {
            tasks.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Load from localStorage as backup
        const localTasks = localStorage.getItem(`tasks_${currentUser.uid}`);
        if (localTasks && tasks.length === 0) {
            tasks = JSON.parse(localTasks);
        }

        updateTasksDisplay();
        updateStats();
    } catch (error) {
        console.error('Error loading tasks:', error);
        // Fallback to localStorage
        const localTasks = localStorage.getItem(`tasks_${currentUser.uid}`);
        if (localTasks) {
            tasks = JSON.parse(localTasks);
            updateTasksDisplay();
            updateStats();
        }
    }
}

async function saveTask(task) {
    if (!currentUser) return;

    try {
        if (task.id) {
            // Update existing task
            const taskRef = window.firestoreDoc(window.firebaseDb, 'tasks', task.id);
            await window.firestoreUpdateDoc(taskRef, {
                ...task,
                updatedAt: window.firestoreServerTimestamp()
            });
        } else {
            // Add new task
            const docRef = await window.firestoreAddDoc(window.firestoreCollection(window.firebaseDb, 'tasks'), {
                ...task,
                userId: currentUser.uid,
                createdAt: window.firestoreServerTimestamp(),
                updatedAt: window.firestoreServerTimestamp()
            });
            task.id = docRef.id;
        }

        // Save to localStorage as backup
        localStorage.setItem(`tasks_${currentUser.uid}`, JSON.stringify(tasks));
        
        return task;
    } catch (error) {
        console.error('Error saving task:', error);
        // Save to localStorage as fallback
        localStorage.setItem(`tasks_${currentUser.uid}`, JSON.stringify(tasks));
        throw error;
    }
}

async function deleteTask(taskId) {
    if (!currentUser) return;

    try {
        await window.firestoreDeleteDoc(window.firestoreDoc(window.firebaseDb, 'tasks', taskId));
        tasks = tasks.filter(task => task.id !== taskId);
        
        // Update localStorage
        localStorage.setItem(`tasks_${currentUser.uid}`, JSON.stringify(tasks));
        
        updateTasksDisplay();
        updateStats();
        showToast('تم حذف المهمة بنجاح', 'success');
    } catch (error) {
        console.error('Error deleting task:', error);
        showToast('حدث خطأ في حذف المهمة', 'error');
    }
}

async function toggleTaskCompletion(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date() : null;

    try {
        await saveTask(task);
        updateTasksDisplay();
        updateStats();
        
        if (task.completed) {
            showToast('تم إنجاز المهمة! 🎉', 'success');
            playCompletionSound();
        } else {
            showToast('تم إلغاء إنجاز المهمة', 'info');
        }
    } catch (error) {
        console.error('Error updating task:', error);
        showToast('حدث خطأ في تحديث المهمة', 'error');
    }
}

async function handleAddTask(e) {
    e.preventDefault();

    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const type = document.getElementById('taskType').value;
    const day = parseInt(document.getElementById('taskDay').value);
    const duration = parseInt(document.getElementById('taskDuration').value);
    const priority = document.getElementById('taskPriority').value;

    if (!title) {
        showToast('يرجى إدخال عنوان المهمة', 'error');
        return;
    }

    const task = {
        title,
        description,
        type,
        day,
        duration,
        priority,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    try {
        const savedTask = await saveTask(task);
        tasks.push(savedTask);
        
        updateTasksDisplay();
        updateStats();
        closeModal('addTaskModal');
        document.getElementById('addTaskForm').reset();
        
        showToast('تم إضافة المهمة بنجاح!', 'success');
    } catch (error) {
        console.error('Error adding task:', error);
        showToast('حدث خطأ في إضافة المهمة', 'error');
    }
}

function loadTodayTasks() {
    const today = new Date().getDay();
    const todayIndex = today === 0 ? 1 : today === 6 ? 0 : today + 1; // Convert to our day system
    
    const todayTasks = tasks.filter(task => task.day === todayIndex);
    
    // Clear existing tasks
    document.getElementById('studyTasks').innerHTML = '';
    document.getElementById('gymTasks').innerHTML = '';
    document.getElementById('restTasks').innerHTML = '';

    // Group tasks by type
    const tasksByType = {
        study: todayTasks.filter(task => task.type === 'study'),
        gym: todayTasks.filter(task => task.type === 'gym'),
        rest: todayTasks.filter(task => task.type === 'rest')
    };

    // Render tasks for each type
    Object.keys(tasksByType).forEach(type => {
        const container = document.getElementById(`${type}Tasks`);
        const typeTasks = tasksByType[type];
        
        // Update task count
        const countElement = document.querySelector(`[data-type="${type}"] .task-count`);
        if (countElement) {
            countElement.textContent = typeTasks.length;
        }

        if (typeTasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-${getTypeIcon(type)}"></i>
                    <p>لا توجد مهام ${getTypeLabel(type)} اليوم</p>
                </div>
            `;
            return;
        }

        typeTasks.forEach(task => {
            const taskElement = createTaskElement(task);
            container.appendChild(taskElement);
        });
    });

    updateTodayProgress();
}

function createTaskElement(task) {
    const taskDiv = document.createElement('div');
    taskDiv.className = `task-item ${task.completed ? 'completed' : ''}`;
    taskDiv.dataset.taskId = task.id;

    taskDiv.innerHTML = `
        <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTaskCompletion('${task.id}')"></div>
        <div class="task-content">
            <div class="task-title">${task.title}</div>
            ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
            <div class="task-meta">
                <span><i class="fas fa-clock"></i> ${task.duration} دقيقة</span>
                <span><i class="fas fa-flag"></i> ${getPriorityLabel(task.priority)}</span>
            </div>
        </div>
        <div class="task-actions">
            <button class="task-action-btn edit" onclick="editTask('${task.id}')">
                <i class="fas fa-edit"></i>
            </button>
            <button class="task-action-btn delete" onclick="confirmDeleteTask('${task.id}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    return taskDiv;
}

function updateTodayProgress() {
    const today = new Date().getDay();
    const todayIndex = today === 0 ? 1 : today === 6 ? 0 : today + 1;
    
    const todayTasks = tasks.filter(task => task.day === todayIndex);
    const completedTasks = todayTasks.filter(task => task.completed);
    
    const total = todayTasks.length;
    const completed = completedTasks.length;
    const remaining = total - completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Update progress circle
    const progressCircle = document.querySelector('.progress-ring-circle');
    if (progressCircle) {
        const circumference = 2 * Math.PI * 50; // radius = 50
        const offset = circumference - (percentage / 100) * circumference;
        progressCircle.style.strokeDashoffset = offset;
        progressCircle.style.stroke = percentage === 100 ? '#10b981' : '#667eea';
    }

    // Update progress text
    document.getElementById('todayPercentage').textContent = `${percentage}%`;
    document.getElementById('completedTasks').textContent = completed;
    document.getElementById('totalTasks').textContent = total;
    document.getElementById('remainingTasks').textContent = remaining;
    document.getElementById('todayCompleted').textContent = completed;
}

function loadWeeklyView() {
    const weeklyTableBody = document.getElementById('weeklyTableBody');
    weeklyTableBody.innerHTML = '';

    const days = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
    const today = new Date().getDay();
    const todayIndex = today === 0 ? 1 : today === 6 ? 0 : today + 1;

    let totalTasks = 0;
    let totalCompleted = 0;
    let totalHours = 0;

    days.forEach((day, index) => {
        const dayTasks = tasks.filter(task => task.day === index);
        const completedTasks = dayTasks.filter(task => task.completed);
        const dayHours = dayTasks.reduce((sum, task) => sum + (task.duration || 0), 0) / 60;
        
        totalTasks += dayTasks.length;
        totalCompleted += completedTasks.length;
        totalHours += dayHours;

        const progress = dayTasks.length > 0 ? Math.round((completedTasks.length / dayTasks.length) * 100) : 0;
        const isToday = index === todayIndex;

        const row = document.createElement('tr');
        row.className = isToday ? 'current-day' : '';
        
        row.innerHTML = `
            <td>
                ${day}
                ${isToday ? '<span class="today-badge">اليوم</span>' : ''}
            </td>
            <td>${renderTaskTags(dayTasks.filter(task => task.type === 'study'))}</td>
            <td>${renderTaskTags(dayTasks.filter(task => task.type === 'gym'))}</td>
            <td>${renderTaskTags(dayTasks.filter(task => task.type === 'rest'))}</td>
            <td>
                <div class="progress-cell">
                    <span>${completedTasks.length}/${dayTasks.length}</span>
                    <div class="mini-progress">
                        <div class="mini-progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <small>${progress}%</small>
                </div>
            </td>
            <td>
                <button class="btn btn-sm" onclick="addTaskForDay(${index})">
                    <i class="fas fa-plus"></i>
                </button>
            </td>
        `;

        weeklyTableBody.appendChild(row);
    });

    // Update weekly stats
    const weekProgress = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
    
    document.getElementById('weekTotalTasks').textContent = totalTasks;
    document.getElementById('weekCompletedTasks').textContent = totalCompleted;
    document.getElementById('weekTotalHours').textContent = Math.round(totalHours * 10) / 10;
    document.getElementById('weekProgressPercent').textContent = `${weekProgress}%`;
}

function renderTaskTags(tasks) {
    if (tasks.length === 0) {
        return '<span class="no-tasks">-</span>';
    }

    return tasks.map(task => `
        <span class="task-tag ${task.completed ? 'completed' : ''}" title="${task.description || ''}">
            ${task.title}
        </span>
    `).join('');
}

function loadStatsView() {
    updateStatsCharts();
    updatePerformanceMetrics();
}

function updateStatsCharts() {
    // Weekly Progress Chart
    const weeklyCtx = document.getElementById('weeklyProgressChart');
    if (weeklyCtx) {
        const days = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
        const progressData = days.map((day, index) => {
            const dayTasks = tasks.filter(task => task.day === index);
            const completedTasks = dayTasks.filter(task => task.completed);
            return dayTasks.length > 0 ? Math.round((completedTasks.length / dayTasks.length) * 100) : 0;
        });

        new Chart(weeklyCtx, {
            type: 'line',
            data: {
                labels: days,
                datasets: [{
                    label: 'نسبة الإنجاز',
                    data: progressData,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }

    // Task Distribution Chart
    const distributionCtx = document.getElementById('taskDistributionChart');
    if (distributionCtx) {
        const studyTasks = tasks.filter(task => task.type === 'study').length;
        const gymTasks = tasks.filter(task => task.type === 'gym').length;
        const restTasks = tasks.filter(task => task.type === 'rest').length;

        new Chart(distributionCtx, {
            type: 'doughnut',
            data: {
                labels: ['الدراسة', 'الجيم', 'الراحة'],
                datasets: [{
                    data: [studyTasks, gymTasks, restTasks],
                    backgroundColor: ['#667eea', '#10b981', '#f59e0b'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Time Spent Chart
    const timeCtx = document.getElementById('timeSpentChart');
    if (timeCtx) {
        const studyTime = tasks.filter(task => task.type === 'study' && task.completed)
            .reduce((sum, task) => sum + (task.duration || 0), 0);
        const gymTime = tasks.filter(task => task.type === 'gym' && task.completed)
            .reduce((sum, task) => sum + (task.duration || 0), 0);
        const restTime = tasks.filter(task => task.type === 'rest' && task.completed)
            .reduce((sum, task) => sum + (task.duration || 0), 0);

        new Chart(timeCtx, {
            type: 'bar',
            data: {
                labels: ['الدراسة', 'الجيم', 'الراحة'],
                datasets: [{
                    label: 'الوقت (دقائق)',
                    data: [studyTime, gymTime, restTime],
                    backgroundColor: ['#667eea', '#10b981', '#f59e0b']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value + ' د';
                            }
                        }
                    }
                }
            }
        });
    }
}

function updatePerformanceMetrics() {
    // Calculate best day
    const days = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
    let bestDay = 'السبت';
    let bestProgress = 0;

    days.forEach((day, index) => {
        const dayTasks = tasks.filter(task => task.day === index);
        const completedTasks = dayTasks.filter(task => task.completed);
        const progress = dayTasks.length > 0 ? (completedTasks.length / dayTasks.length) * 100 : 0;
        
        if (progress > bestProgress) {
            bestProgress = progress;
            bestDay = day;
        }
    });

    // Calculate streak
    const streak = calculateStreak();

    // Calculate average daily time
    const totalTime = tasks.filter(task => task.completed)
        .reduce((sum, task) => sum + (task.duration || 0), 0);
    const avgDailyTime = Math.round((totalTime / 7) / 60 * 10) / 10;

    // Calculate goals achieved
    const goalsAchieved = tasks.filter(task => task.completed && task.priority === 'high').length;

    // Update UI
    document.getElementById('bestDay').textContent = bestDay;
    document.getElementById('longestStreak').textContent = streak;
    document.getElementById('avgDailyTime').textContent = avgDailyTime;
    document.getElementById('goalsAchieved').textContent = goalsAchieved;
    document.getElementById('streakDays').textContent = streak;

    // Update completion rate
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    document.getElementById('completionRate').textContent = `${completionRate}%`;
}

function calculateStreak() {
    // Simple streak calculation - can be enhanced
    const today = new Date();
    let streak = 0;
    
    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dayIndex = date.getDay() === 0 ? 1 : date.getDay() === 6 ? 0 : date.getDay() + 1;
        
        const dayTasks = tasks.filter(task => task.day === dayIndex);
        const completedTasks = dayTasks.filter(task => task.completed);
        
        if (dayTasks.length > 0 && completedTasks.length === dayTasks.length) {
            streak++;
        } else if (dayTasks.length > 0) {
            break;
        }
    }
    
    return streak;
}

// Timer Functions
function loadTimerView() {
    updateTimerTaskSelect();
    updateTimerStats();
    updateTimerHistory();
}

function updateTimerTaskSelect() {
    const select = document.getElementById('timerTaskSelect');
    const today = new Date().getDay();
    const todayIndex = today === 0 ? 1 : today === 6 ? 0 : today + 1;
    
    const todayTasks = tasks.filter(task => task.day === todayIndex && !task.completed);
    
    select.innerHTML = '<option value="">اختر مهمة...</option>';
    
    todayTasks.forEach(task => {
        const option = document.createElement('option');
        option.value = task.id;
        option.textContent = `${task.title} (${task.duration} دقيقة)`;
        select.appendChild(option);
    });
}

function handleTimerPresetChange() {
    const preset = document.getElementById('timerPreset').value;
    const customGroup = document.getElementById('customTimeGroup');
    
    if (preset === 'custom') {
        customGroup.style.display = 'block';
        const customTime = parseInt(document.getElementById('customTime').value) || 25;
        timerState.timeLeft = customTime * 60;
        timerState.totalTime = customTime * 60;
    } else {
        customGroup.style.display = 'none';
        const minutes = parseInt(preset);
        timerState.timeLeft = minutes * 60;
        timerState.totalTime = minutes * 60;
    }
    
    updateTimerDisplay();
}

function startTimer() {
    if (timerState.isRunning) return;
    
    const selectedTaskId = document.getElementById('timerTaskSelect').value;
    if (!selectedTaskId && document.getElementById('timerPreset').value !== 'custom') {
        showToast('يرجى اختيار مهمة أولاً', 'error');
        return;
    }
    
    timerState.isRunning = true;
    timerState.currentTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null;
    
    document.getElementById('timerStart').classList.add('hidden');
    document.getElementById('timerPause').classList.remove('hidden');
    
    if (timerState.currentTask) {
        document.getElementById('timerCurrentTask').textContent = timerState.currentTask.title;
    } else {
        document.getElementById('timerCurrentTask').textContent = 'جلسة مخصصة';
    }
    
    timerInterval = setInterval(() => {
        timerState.timeLeft--;
        updateTimerDisplay();
        
        if (timerState.timeLeft <= 0) {
            completeTimer();
        }
    }, 1000);
    
    showToast('بدأ المؤقت!', 'success');
}

function pauseTimer() {
    if (!timerState.isRunning) return;
    
    timerState.isRunning = false;
    clearInterval(timerInterval);
    
    document.getElementById('timerStart').classList.remove('hidden');
    document.getElementById('timerPause').classList.add('hidden');
    
    showToast('تم إيقاف المؤقت مؤقتاً', 'info');
}

function stopTimer() {
    timerState.isRunning = false;
    clearInterval(timerInterval);
    
    document.getElementById('timerStart').classList.remove('hidden');
    document.getElementById('timerPause').classList.add('hidden');
    document.getElementById('timerCurrentTask').textContent = 'اختر مهمة للبدء';
    
    showToast('تم إيقاف المؤقت', 'info');
}

function resetTimer() {
    stopTimer();
    
    const preset = document.getElementById('timerPreset').value;
    if (preset === 'custom') {
        const customTime = parseInt(document.getElementById('customTime').value) || 25;
        timerState.timeLeft = customTime * 60;
        timerState.totalTime = customTime * 60;
    } else {
        const minutes = parseInt(preset);
        timerState.timeLeft = minutes * 60;
        timerState.totalTime = minutes * 60;
    }
    
    updateTimerDisplay();
    showToast('تم إعادة تعيين المؤقت', 'info');
}

function completeTimer() {
    timerState.isRunning = false;
    clearInterval(timerInterval);
    
    document.getElementById('timerStart').classList.remove('hidden');
    document.getElementById('timerPause').classList.add('hidden');
    
    // Mark task as completed if selected
    if (timerState.currentTask) {
        toggleTaskCompletion(timerState.currentTask.id);
    }
    
    // Add to history
    addTimerSession();
    
    // Show completion notification
    showToast('تم إنهاء الجلسة! 🎉', 'success');
    showNotification('انتهت جلسة الدراسة!', 'حان وقت أخذ استراحة');
    playCompletionSound();
    
    // Reset timer
    resetTimer();
}

function updateTimerDisplay() {
    const minutes = Math.floor(timerState.timeLeft / 60);
    const seconds = timerState.timeLeft % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    document.getElementById('timerTime').textContent = timeString;
    
    // Update progress circle
    const progress = ((timerState.totalTime - timerState.timeLeft) / timerState.totalTime) * 100;
    const circumference = 2 * Math.PI * 140;
    const offset = circumference - (progress / 100) * circumference;
    
    const progressCircle = document.getElementById('timerProgressCircle');
    if (progressCircle) {
        progressCircle.style.strokeDashoffset = offset;
    }
}

function addTimerSession() {
    const session = {
        id: Date.now().toString(),
        taskId: timerState.currentTask?.id || null,
        taskTitle: timerState.currentTask?.title || 'جلسة مخصصة',
        duration: Math.round((timerState.totalTime - timerState.timeLeft) / 60),
        completedAt: new Date(),
        completed: timerState.timeLeft === 0
    };
    
    // Save to localStorage
    const sessions = JSON.parse(localStorage.getItem(`timer_sessions_${currentUser.uid}`) || '[]');
    sessions.unshift(session);
    localStorage.setItem(`timer_sessions_${currentUser.uid}`, JSON.stringify(sessions.slice(0, 50))); // Keep last 50 sessions
    
    updateTimerStats();
    updateTimerHistory();
}

function updateTimerStats() {
    const sessions = JSON.parse(localStorage.getItem(`timer_sessions_${currentUser.uid}`) || '[]');
    const today = new Date().toDateString();
    const todaySessions = sessions.filter(session => 
        new Date(session.completedAt).toDateString() === today
    );
    
    const totalTime = todaySessions.reduce((sum, session) => sum + session.duration, 0);
    const completedSessions = todaySessions.filter(session => session.completed).length;
    
    document.getElementById('todayTimerTime').textContent = `${totalTime} دقيقة`;
    document.getElementById('todayTimerSessions').textContent = todaySessions.length;
    document.getElementById('todayTimerCompleted').textContent = completedSessions;
}

function updateTimerHistory() {
    const sessions = JSON.parse(localStorage.getItem(`timer_sessions_${currentUser.uid}`) || '[]');
    const historyList = document.getElementById('timerHistoryList');
    
    historyList.innerHTML = '';
    
    if (sessions.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clock"></i>
                <p>لا توجد جلسات بعد</p>
            </div>
        `;
        return;
    }
    
    sessions.slice(0, 10).forEach(session => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        const date = new Date(session.completedAt);
        const timeString = date.toLocaleTimeString('ar-EG', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        historyItem.innerHTML = `
            <div class="history-icon">
                <i class="fas fa-${session.completed ? 'check' : 'pause'}"></i>
            </div>
            <div class="history-content">
                <div class="history-title">${session.taskTitle}</div>
                <div class="history-meta">
                    ${session.duration} دقيقة • ${timeString}
                    ${session.completed ? '• مكتملة' : '• متوقفة'}
                </div>
            </div>
        `;
        
        historyList.appendChild(historyItem);
    });
}

// Modal Functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function showAddTaskModal(type = '', day = null) {
    if (type) {
        document.getElementById('taskType').value = type;
    }
    
    if (day !== null) {
        document.getElementById('taskDay').value = day;
    } else {
        // Set to current day
        const today = new Date().getDay();
        const todayIndex = today === 0 ? 1 : today === 6 ? 0 : today + 1;
        document.getElementById('taskDay').value = todayIndex;
    }
    
    showModal('addTaskModal');
}

function showSettings() {
    showModal('settingsModal');
}

function showStatsModal() {
    switchView('stats');
}

// Utility Functions
function getTypeIcon(type) {
    switch (type) {
        case 'study': return 'book';
        case 'gym': return 'dumbbell';
        case 'rest': return 'coffee';
        default: return 'tasks';
    }
}

function getTypeLabel(type) {
    switch (type) {
        case 'study': return 'الدراسة';
        case 'gym': return 'الجيم';
        case 'rest': return 'الراحة';
        default: return 'المهام';
    }
}

function getPriorityLabel(priority) {
    switch (priority) {
        case 'high': return 'عالية';
        case 'medium': return 'متوسطة';
        case 'low': return 'منخفضة';
        default: return 'متوسطة';
    }
}

function getErrorMessage(errorCode) {
    const errorMessages = {
        'auth/user-not-found': 'المستخدم غير موجود',
        'auth/wrong-password': 'كلمة المرور غير صحيحة',
        'auth/email-already-in-use': 'البريد الإلكتروني مستخدم بالفعل',
        'auth/weak-password': 'كلمة المرور ضعيفة',
        'auth/invalid-email': 'البريد الإلكتروني غير صحيح',
        'auth/too-many-requests': 'تم تجاوز عدد المحاولات المسموح',
        'auth/network-request-failed': 'خطأ في الاتصال بالإنترنت'
    };
    
    return errorMessages[errorCode] || 'حدث خطأ غير متوقع';
}

// Stats and Progress Functions
function updateStats() {
    updateTodayProgress();
    updateWeeklyProgress();
    updateSidebarStats();
}

function updateWeeklyProgress() {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    const progressFill = document.getElementById('weeklyProgress');
    const percentageSpan = document.getElementById('weeklyPercentage');
    
    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
    }
    
    if (percentageSpan) {
        percentageSpan.textContent = `${percentage}%`;
    }
}

function updateSidebarStats() {
    const today = new Date().getDay();
    const todayIndex = today === 0 ? 1 : today === 6 ? 0 : today + 1;
    
    const todayTasks = tasks.filter(task => task.day === todayIndex);
    const completedToday = todayTasks.filter(task => task.completed).length;
    
    document.getElementById('todayCompleted').textContent = completedToday;
    
    // Update streak
    const streak = calculateStreak();
    document.getElementById('streakDays').textContent = streak;
}

// Export Functions
async function exportTodayTasks() {
    try {
        const element = document.getElementById('todayView');
        const canvas = await html2canvas(element, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            allowTaint: true
        });
        
        const link = document.createElement('a');
        link.download = `مهام-اليوم-${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        showToast('تم تصدير مهام اليوم بنجاح!', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('حدث خطأ في التصدير', 'error');
    }
}

async function exportWeeklySchedule() {
    try {
        const element = document.getElementById('weeklyView');
        const canvas = await html2canvas(element, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            allowTaint: true
        });
        
        const link = document.createElement('a');
        link.download = `الجدول-الأسبوعي-${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        showToast('تم تصدير الجدول الأسبوعي بنجاح!', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('حدث خطأ في التصدير', 'error');
    }
}

async function exportStatsReport() {
    try {
        const element = document.getElementById('statsView');
        const canvas = await html2canvas(element, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            allowTaint: true
        });
        
        const link = document.createElement('a');
        link.download = `تقرير-الإحصائيات-${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        showToast('تم تصدير التقرير بنجاح!', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('حدث خطأ في التصدير', 'error');
    }
}

function exportData() {
    const data = {
        tasks: tasks,
        timerSessions: JSON.parse(localStorage.getItem(`timer_sessions_${currentUser.uid}`) || '[]'),
        exportDate: new Date().toISOString(),
        userEmail: currentUser.email
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `بيانات-جدول-الأسبوع-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    showToast('تم تصدير البيانات بنجاح!', 'success');
}

// Task Action Functions
function editTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    // Fill form with task data
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description || '';
    document.getElementById('taskType').value = task.type;
    document.getElementById('taskDay').value = task.day;
    document.getElementById('taskDuration').value = task.duration || 30;
    document.getElementById('taskPriority').value = task.priority || 'medium';
    
    // Change form to edit mode
    document.getElementById('addTaskModalTitle').textContent = 'تعديل المهمة';
    document.getElementById('addTaskForm').dataset.editId = taskId;
    
    showModal('addTaskModal');
}

function confirmDeleteTask(taskId) {
    if (confirm('هل أنت متأكد من حذف هذه المهمة؟')) {
        deleteTask(taskId);
    }
}

function addTaskForDay(dayIndex) {
    showAddTaskModal('', dayIndex);
}

function startQuickTimer() {
    switchView('timer');
    
    // Set to 25 minutes and start immediately if there's a task
    document.getElementById('timerPreset').value = '25';
    handleTimerPresetChange();
    
    const taskSelect = document.getElementById('timerTaskSelect');
    if (taskSelect.options.length > 1) {
        taskSelect.selectedIndex = 1; // Select first available task
        startTimer();
    } else {
        showToast('لا توجد مهام متاحة للدراسة', 'info');
    }
}

// Notification Functions
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                showToast('تم تفعيل التنبيهات بنجاح', 'success');
            }
        });
    }
}

function showNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, {
            body: body,
            icon: '/favicon.ico',
            badge: '/favicon.ico'
        });
        
        notification.onclick = function() {
            window.focus();
            notification.close();
        };
        
        setTimeout(() => {
            notification.close();
        }, 5000);
    }
}

function playCompletionSound() {
    // Create a simple beep sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

// Toast Notification System
function showToast(message, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${icons[type] || icons.info}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-message">${message}</div>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.3s ease-in forwards';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
}

// Keyboard Shortcuts
function handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + N: Add new task
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        showAddTaskModal();
    }
    
    // Ctrl/Cmd + T: Switch to timer
    if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        switchView('timer');
    }
    
    // Ctrl/Cmd + S: Switch to stats
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        switchView('stats');
    }
    
    // Escape: Close modals
    if (e.key === 'Escape') {
        const activeModal = document.querySelector('.modal.active');
        if (activeModal) {
            closeModal(activeModal.id);
        }
    }
}

// Settings Functions
function resetAllData() {
    if (confirm('هل أنت متأكد من حذف جميع البيانات؟ هذا الإجراء لا يمكن التراجع عنه!')) {
        if (confirm('تأكيد أخير: سيتم حذف جميع المهام والجلسات والإحصائيات!')) {
            // Clear Firestore data (you might want to implement this)
            tasks = [];
            localStorage.removeItem(`tasks_${currentUser.uid}`);
            localStorage.removeItem(`timer_sessions_${currentUser.uid}`);
            
            updateTasksDisplay();
            updateStats();
            closeModal('settingsModal');
            
            showToast('تم حذف جميع البيانات', 'success');
        }
    }
}

// Update tasks display for all views
function updateTasksDisplay() {
    if (currentView === 'today') {
        loadTodayTasks();
    } else if (currentView === 'weekly') {
        loadWeeklyView();
    }
}

// Add CSS for additional animations
const additionalCSS = `
@keyframes toastSlideOut {
    from {
        opacity: 1;
        transform: translateX(0);
    }
    to {
        opacity: 0;
        transform: translateX(100%);
    }
}

.empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--text-muted);
}

.empty-state i {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
}

.task-tag {
    display: inline-block;
    background: var(--primary-color);
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    margin: 0.125rem;
    transition: var(--transition);
}

.task-tag.completed {
    background: var(--success-color);
    opacity: 0.7;
    text-decoration: line-through;
}

.no-tasks {
    color: var(--text-muted);
    font-style: italic;
}

.today-badge {
    background: var(--primary-color);
    color: white;
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    border-radius: 1rem;
    margin-right: 0.5rem;
}

.progress-cell {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
}

.mini-progress {
    width: 60px;
    height: 4px;
    background: var(--border-light);
    border-radius: 2px;
    overflow: hidden;
}

.mini-progress-fill {
    height: 100%;
    background: var(--primary-color);
    border-radius: 2px;
    transition: width 0.5s ease;
}

.btn-sm {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
}
`;

// Add the additional CSS to the document
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalCSS;
document.head.appendChild(styleSheet);

// Initialize theme
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        themeSelect.value = savedTheme;
        themeSelect.addEventListener('change', (e) => {
            const theme = e.target.value;
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            showToast('تم تغيير السمة بنجاح', 'success');
        });
    }
}

// Call theme initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeTheme);

console.log('App.js loaded successfully');
