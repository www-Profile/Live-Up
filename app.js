/* ============================================================
   Live-Up · app.js (Firebase version)
   ============================================================ */

(function () {
  'use strict';

  window.addEventListener('firebase-ready', init);

  /* ========== КОНСТАНТЫ ========== */
  const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const MONTHS_FULL = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                       'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const DOW = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

  const DEFAULT_STATS = [
    { id: 'physical',     name: 'Физическая форма',  icon: 'fa-dumbbell', color: '#FF3B30', totalXp: 0 },
    { id: 'intellect',    name: 'Интеллект',         icon: 'fa-brain',    color: '#5856D6', totalXp: 0 },
    { id: 'discipline',   name: 'Дисциплина',        icon: 'fa-bolt',     color: '#FF9500', totalXp: 0 },
    { id: 'social',       name: 'Социальные навыки', icon: 'fa-comments', color: '#34C759', totalXp: 0 },
    { id: 'productivity', name: 'Продуктивность',    icon: 'fa-rocket',   color: '#007AFF', totalXp: 0 },
    { id: 'wellbeing',    name: 'Благополучие',      icon: 'fa-heart',    color: '#ff3fb5', totalXp: 0 }
  ];

  const ICON_TO_STAT = {
    'fa-dumbbell': 'physical', 'fa-running': 'physical', 'fa-bicycle': 'physical',
    'fa-book': 'intellect', 'fa-brain': 'intellect', 'fa-code': 'intellect', 'fa-pen': 'intellect',
    'fa-heart': 'wellbeing', 'fa-leaf': 'wellbeing', 'fa-bed': 'wellbeing', 'fa-mug-hot': 'wellbeing',
    'fa-bolt': 'discipline', 'fa-star': 'discipline', 'fa-fire': 'discipline',
    'fa-comments': 'social', 'fa-users': 'social', 'fa-handshake': 'social',
    'fa-rocket': 'productivity', 'fa-briefcase': 'productivity', 'fa-clock': 'productivity'
  };

  const STAT_COLORS = DEFAULT_STATS.reduce((acc, s) => { acc[s.id] = s.color; return acc; }, {});
  const iconColor = (iconId) => STAT_COLORS[ICON_TO_STAT[iconId]] || '#8E8E93';

  const STAT_ICON_GROUPS = [
    { stat: 'physical', icons: ['fa-dumbbell', 'fa-running', 'fa-bicycle'] },
    { stat: 'intellect', icons: ['fa-book', 'fa-brain', 'fa-code'] },
    { stat: 'discipline', icons: ['fa-bolt', 'fa-star', 'fa-fire'] },
    { stat: 'social', icons: ['fa-comments', 'fa-users', 'fa-handshake'] },
    { stat: 'productivity', icons: ['fa-rocket', 'fa-briefcase', 'fa-clock'] },
    { stat: 'wellbeing', icons: ['fa-heart', 'fa-leaf', 'fa-mug-hot'] }
  ];

  const ICONS = STAT_ICON_GROUPS.flatMap(g => g.icons.map(id => ({ id, color: iconColor(id) })));

  const STARTER_TASKS = [
    { title: 'Утренняя зарядка',       desc: '15 минут упражнений',       icon: 'fa-dumbbell' },
    { title: 'Чтение 20 минут',        desc: 'Книга или статья',          icon: 'fa-book' },
    { title: 'План на день',           desc: 'Расставить приоритеты',     icon: 'fa-bolt' },
    { title: 'Написать другу',         desc: 'Поддержать связь',          icon: 'fa-comments' },
    { title: 'Фокус-сессия 25 минут',  desc: 'Работа без отвлечений',     icon: 'fa-clock' },
    { title: 'Медитация 10 минут',     desc: 'Тишина и дыхание',          icon: 'fa-heart' }
  ];

  const XP_PER_TASK = 20;
  const XP_BASE = 100;
  const XP_GROWTH = 1.2;

  /* ========== STATE ========== */
  const state = {
    user: { id: null, name: '', email: '', totalXp: 0 },
    theme: 'system',
    stats: DEFAULT_STATS.map(s => ({ ...s })),
    tasks: [],
    done: {},
    selectedDate: new Date(),
    viewPeriod: 'day',          // 'day' | 'week' | 'month'
    editMode: false,
    editingTaskId: null,
    snapshot: null
  };

  let modalIcon = ICONS[0];
  let modalScope = 'daily';     // 'daily' | 'day' | 'week' | 'month'
    let modalWeekdays = [1, 3, 5];   // Пн, Ср, Чт — по умолчанию
  let modalAnchorDate = startOfDay(new Date());
  let confirmCallback = null;
  let isLoggingIn = false;

  /* ========== DOM ========== */
  const el = {
    authScreen: document.getElementById('authScreen'),
    authChoice: document.getElementById('authChoice'),
    authLogin: document.getElementById('authLogin'),
    authRegister: document.getElementById('authRegister'),
    authSubtitle: document.getElementById('authSubtitle'),

    loginEmail: document.getElementById('loginEmail'),
    loginPassword: document.getElementById('loginPassword'),
    loginError: document.getElementById('loginError'),
    loginInfo: document.getElementById('loginInfo'),
    btnSubmitLogin: document.getElementById('btnSubmitLogin'),

    regName: document.getElementById('regName'),
    regEmail: document.getElementById('regEmail'),
    regPassword: document.getElementById('regPassword'),
    regError: document.getElementById('regError'),
    regInfo: document.getElementById('regInfo'),
    btnSubmitRegister: document.getElementById('btnSubmitRegister'),

    app: document.getElementById('app'),
    content: document.getElementById('content'),
    floatingNav: document.getElementById('floatingNav'),
    periodSwitch: document.getElementById('periodSwitch'),
    dayCards: document.getElementById('dayCards'),
    dayStrip: document.getElementById('dayStrip'),
    tasksList: document.getElementById('tasksList'),
    tasksWrap: document.getElementById('tasksWrap'),
    tasksOutline: document.getElementById('tasksOutline'),
    tasksOutlineRect: document.getElementById('tasksOutlineRect'),
    modeNormal: document.getElementById('modeNormal'),
    modeEditing: document.getElementById('modeEditing'),

    profileAvatar: document.getElementById('profileAvatar'),
    profileName: document.getElementById('profileName'),
    profileEmail: document.getElementById('profileEmail'),
    profileLevel: document.getElementById('profileLevel'),
    profileStreakNum: document.getElementById('profileStreakNum'),
    profileXpText: document.getElementById('profileXpText'),
    profileXpFill: document.getElementById('profileXpFill'),
    statsList: document.getElementById('statsList'),

    modal: document.getElementById('taskModal'),
    modalTitleText: document.getElementById('modalTitleText'),
    modalTitle: document.getElementById('modalTitle'),
    modalDesc: document.getElementById('modalDesc'),
    modalDelete: document.getElementById('modalDelete'),
    modalSave: document.getElementById('modalSave'),
    modalClose: document.getElementById('modalClose'),
    modalBackdrop: document.getElementById('modalBackdrop'),
    iconPicker: document.getElementById('iconPicker'),
    scopePicker: document.getElementById('scopePicker'),
    scopeHint: document.getElementById('scopeHint'),

    confirmModal: document.getElementById('confirmModal'),
    confirmBackdrop: document.getElementById('confirmBackdrop'),
    confirmClose: document.getElementById('confirmClose'),
    confirmCancel: document.getElementById('confirmCancel'),
    confirmOk: document.getElementById('confirmOk'),

    settingsEditProfile: document.getElementById('settingsEditProfile'),
    settingsTheme: document.getElementById('settingsTheme'),
    settingsThemeValue: document.getElementById('settingsThemeValue'),
    settingsDeleteTasks: document.getElementById('settingsDeleteTasks'),
    settingsLogout: document.getElementById('settingsLogout'),

    profileModal: document.getElementById('profileModal'),
    profileBackdrop: document.getElementById('profileBackdrop'),
    profileModalClose: document.getElementById('profileModalClose'),
    profileNameInput: document.getElementById('profileNameInput'),
    profileError: document.getElementById('profileError'),
    profileCancel: document.getElementById('profileCancel'),
    profileSave: document.getElementById('profileSave'),

    themeModal: document.getElementById('themeModal'),
    themeBackdrop: document.getElementById('themeBackdrop'),
    themeClose: document.getElementById('themeClose'),

        weekdayPicker: document.getElementById('weekdayPicker'),
  };

  /* ========== УТИЛИТЫ ДАТ ========== */
  function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function dateKey(d) { const x = startOfDay(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`; }
  function parseDateKey(k) { const [y,m,d] = k.split('-').map(Number); return new Date(y, m-1, d); }
  function formatShortDate(d) { return `${d.getDate()} ${MONTHS[d.getMonth()]}`; }
  function formatLongDate(d) { return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`; }

  function startOfWeek(d) {
    const x = startOfDay(d);
    const shift = (x.getDay() + 6) % 7;   // Пн = 0
    return addDays(x, -shift);
  }
  function startOfMonth(d) { const x = startOfDay(d); x.setDate(1); return x; }
  function addMonths(d, n) { const x = startOfMonth(d); x.setMonth(x.getMonth() + n); return x; }
  function daysInMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }

  function periodStart(period, d) {
    if (period === 'week') return startOfWeek(d);
    if (period === 'month') return startOfMonth(d);
    return startOfDay(d);
  }
  function shiftPeriodDate(period, d, n) {
    if (period === 'week') return addDays(d, 7 * n);
    if (period === 'month') return addMonths(d, n);
    return addDays(d, n);
  }
  function formatRange(a, b) {
    if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${b.getDate()} ${MONTHS[b.getMonth()]}`;
    return `${a.getDate()} ${MONTHS[a.getMonth()]} – ${b.getDate()} ${MONTHS[b.getMonth()]}`;
  }

  /* ========== ОХВАТ ЗАДАНИЙ ========== */
  function taskScope(t) { return t.scope || 'daily'; }

  function taskAppliesToDate(task, date) {
    const scope = taskScope(task);

    if (scope === 'daily') return true;

    if (scope === 'weekdays') {
      const days = Array.isArray(task.weekdays) ? task.weekdays : [];
      if (!days.length) return false;
      return days.includes(date.getDay());
    }

    if (!task.anchor) return false;              // остальным охватам anchor обязателен

    const k = dateKey(date);
    if (scope === 'day')   return task.anchor === k;
    if (scope === 'week')  return dateKey(startOfWeek(parseDateKey(task.anchor))) === dateKey(startOfWeek(date));
    if (scope === 'month') return task.anchor.slice(0, 7) === k.slice(0, 7);
    return true;
  }

  function tasksForDate(date) { return state.tasks.filter(t => taskAppliesToDate(t, date)); }

  function isDone(key, taskId) { return (state.done[key] || []).includes(taskId); }

  function dayPercent(key) {
    const list = tasksForDate(parseDateKey(key));
    if (!list.length) return 0;
    const doneList = state.done[key] || [];
    return Math.round(list.filter(t => doneList.includes(t.id)).length / list.length * 100);
  }

  function periodPercent(period, anchor) {
    const start = periodStart(period, anchor);
    const total = period === 'day' ? 1 : period === 'week' ? 7 : daysInMonth(start);
    const today = startOfDay(new Date());

    // считаем только прошедшие дни периода (чтобы текущая неделя/месяц не «проваливались»)
    let count = total;
    const end = addDays(start, total - 1);
    if (end > today) {
      const diff = Math.round((today - start) / 86400000);
      count = diff < 0 ? 0 : Math.min(total, diff + 1);
    }

    let all = 0, done = 0;
    for (let i = 0; i < count; i++) {
      const k = dateKey(addDays(start, i));
      const list = tasksForDate(parseDateKey(k));
      if (!list.length) continue;
      const dl = state.done[k] || [];
      all += list.length;
      done += list.filter(t => dl.includes(t.id)).length;
    }
    return all ? Math.round(done / all * 100) : 0;
  }

  function progressBar(value, max, color, thin) {
    const pct = Math.min(100, Math.round((value / max) * 100));
    return `<div class="progress${thin ? ' progress--thin' : ''}"><div class="progress__fill" style="width:${pct}%;background:${color || 'var(--blue)'}"></div></div>`;
  }

  function computeLevelInfo(totalXp) {
    let level = 1, needed = XP_BASE, remaining = totalXp;
    while (remaining >= needed) { remaining -= needed; level++; needed = Math.round(needed * XP_GROWTH); }
    return { level, xp: remaining, xpNeeded: needed, totalXp };
  }

  function computeStreak() {
    let d = startOfDay(new Date());
    if (!(state.done[dateKey(d)] || []).length) {
      d = addDays(d, -1);
      if (!(state.done[dateKey(d)] || []).length) return 0;
    }
    let streak = 0;
    while ((state.done[dateKey(d)] || []).length > 0) { streak++; d = addDays(d, -1); }
    return streak;
  }

  function showLoginError(msg) { el.loginError.textContent = msg; el.loginError.hidden = false; el.loginInfo.hidden = true; }
  function showLoginInfo(msg) { el.loginInfo.textContent = msg; el.loginInfo.hidden = false; el.loginError.hidden = true; }
  function showRegError(msg) { el.regError.textContent = msg; el.regError.hidden = false; el.regInfo.hidden = true; }
  function showRegInfo(msg) { el.regInfo.textContent = msg; el.regInfo.hidden = false; el.regError.hidden = true; }

  /* ========== АУТЕНТИФИКАЦИЯ ========== */
  function showAuthScreen(screen) {
    el.authChoice.hidden = screen !== 'choice';
    el.authLogin.hidden = screen !== 'login';
    el.authRegister.hidden = screen !== 'register';

    if (screen === 'choice') {
      el.authSubtitle.textContent = 'Добро пожаловать';
    } else if (screen === 'register') {
      el.authSubtitle.textContent = 'Регистрация';
    } else if (screen === 'login') {
      el.authSubtitle.textContent = 'Вход в аккаунт';
    }

    const resendBtn = document.getElementById('resendVerifyBtn');
    if (resendBtn) resendBtn.remove();

    if (screen === 'login') {
      el.loginError.hidden = true;
      el.loginInfo.hidden = true;
      setTimeout(() => el.loginEmail.focus(), 50);
    }
    if (screen === 'register') {
      el.regError.hidden = true;
      el.regInfo.hidden = true;
      setTimeout(() => el.regName.focus(), 50);
    }
  }

  async function handleLogin() {
    const email = (el.loginEmail.value || '').trim();
    const password = el.loginPassword.value || '';
    const { signInWithEmailAndPassword, signOut, sendEmailVerification } = window.fb;

    if (!email || !password) { showLoginError('Введите почту и пароль'); return; }

    isLoggingIn = true;

    try {
      const userCredential = await signInWithEmailAndPassword(window.firebaseAuth, email, password);

      if (!userCredential.user.emailVerified) {
        showLoginInfo('Пожалуйста, подтвердите вашу почту. Проверьте входящие (и папку Спам).');

        if (!document.getElementById('resendVerifyBtn')) {
          const btn = document.createElement('button');
          btn.id = 'resendVerifyBtn';
          btn.className = 'secondary-btn';
          btn.style.marginTop = '10px';
          btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Отправить письмо повторно';

          btn.onclick = async () => {
            try {
              await sendEmailVerification(userCredential.user);
              showLoginInfo('Письмо отправлено повторно! Проверьте почту.');
            } catch (err) {
              showLoginError('Не удалось отправить: ' + err.message);
            }
          };
          el.btnSubmitLogin.insertAdjacentElement('afterend', btn);
        }

        await signOut(window.firebaseAuth);
        isLoggingIn = false;
        return;
      }

      state.user.id = userCredential.user.uid;
      state.user.name = userCredential.user.displayName || 'Пользователь';
      state.user.email = userCredential.user.email;
      await loadUserData();
      isLoggingIn = false;
      enterApp();

    } catch (error) {
      isLoggingIn = false;
      console.error('Firebase Auth Error:', error.code, error.message);
      if (error.code === 'auth/invalid-credential') showLoginError('Неверная почта или пароль');
      else if (error.code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.') showLoginError('Ошибка API ключа Firebase.');
      else showLoginError(error.message);
    }
  }

  async function handleRegister() {
    const name = (el.regName.value || '').trim();
    const email = (el.regEmail.value || '').trim();
    const password = el.regPassword.value || '';
    const { createUserWithEmailAndPassword, updateProfile, sendEmailVerification, signOut } = window.fb;

    if (!name) { showRegError('Введите имя'); return; }
    if (!email) { showRegError('Введите почту'); return; }
    if (password.length < 6) { showRegError('Пароль минимум 6 символов'); return; }

    try {
      const userCredential = await createUserWithEmailAndPassword(window.firebaseAuth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      await sendEmailVerification(userCredential.user);

      showRegInfo('Аккаунт создан! Проверьте почту и перейдите по ссылке для подтверждения.');
      await signOut(window.firebaseAuth);

      el.regName.value = '';
      el.regEmail.value = '';
      el.regPassword.value = '';
      setTimeout(() => showAuthScreen('login'), 3000);

    } catch (error) {
      console.error('Firebase Auth Error:', error.code, error.message);
      if (error.code === 'auth/email-already-in-use') showRegError('Эта почта уже используется');
      else showRegError(error.message);
    }
  }

  async function logout() {
    await window.fb.signOut(window.firebaseAuth);
    state.user = { id: null, name: '', email: '', totalXp: 0 };
    state.tasks = []; state.done = {}; state.stats = DEFAULT_STATS.map(s => ({ ...s }));
    state.viewPeriod = 'day'; state.selectedDate = new Date();
    showAuth();
  }

  function showAuth() {
    el.app.hidden = true;
    el.authScreen.hidden = false;
    showAuthScreen('choice');
  }

  function enterApp() {
    el.authScreen.hidden = true;
    el.app.hidden = false;
    applyTheme(state.theme);
    renderTasksPage();
    renderProfile();
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('screen--active', s.dataset.screen === 'tasks'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.target === 'tasks'));
  }

  function bindAuthEvents() {
    document.getElementById('btnGoLogin').addEventListener('click', () => showAuthScreen('login'));
    document.getElementById('btnGoRegister').addEventListener('click', () => showAuthScreen('register'));
    document.getElementById('switchToRegister').addEventListener('click', (e) => { e.preventDefault(); showAuthScreen('register'); });
    document.getElementById('switchToLogin').addEventListener('click', (e) => { e.preventDefault(); showAuthScreen('login'); });

    el.btnSubmitLogin.addEventListener('click', handleLogin);
    el.btnSubmitRegister.addEventListener('click', handleRegister);

    el.loginPassword.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
    el.regPassword.addEventListener('keydown', e => { if (e.key === 'Enter') handleRegister(); });

    el.loginEmail.addEventListener('input', () => el.loginError.hidden = true);
    el.loginPassword.addEventListener('input', () => el.loginError.hidden = true);
    el.regName.addEventListener('input', () => el.regError.hidden = true);
    el.regEmail.addEventListener('input', () => el.regError.hidden = true);
    el.regPassword.addEventListener('input', () => el.regError.hidden = true);
  }

  /* ========== ДАННЫЕ FIREBASE ========== */
  async function loadUserData() {
    const { doc, getDoc, collection, getDocs } = window.fs;
    const uid = state.user.id;

    const userRef = doc(window.firebaseDb, "users", uid);
    const tasksRef = collection(window.firebaseDb, "users", uid, "tasks");

    const [userSnap, tasksSnap] = await Promise.all([
      getDoc(userRef),
      getDocs(tasksRef)
    ]);

    if (userSnap.exists()) {
      const data = userSnap.data();
      state.user.totalXp = data.totalXp || 0;
      state.theme = data.theme || 'system';
      state.stats = DEFAULT_STATS.map(s => ({ ...s, totalXp: (data.stats && data.stats[s.id]) || 0 }));
      state.done = data.done || {};
    } else {
      await window.fs.setDoc(userRef, { totalXp: 0, theme: 'system', stats: {}, done: {} });
    }

    state.tasks = [];
    tasksSnap.forEach((docSnap) => {
      const t = docSnap.data();
      state.tasks.push({
        id: docSnap.id,
        title: t.title,
        desc: t.description || 'Личное задание',
        icon: t.icon,
        color: iconColor(t.icon),
        scope: t.scope || 'daily',
        anchor: t.anchor || null,
        weekdays: Array.isArray(t.weekdays) ? t.weekdays : null
      });
    });
  }

  async function saveUserStats() {
    const { doc, setDoc } = window.fs;
    const userRef = doc(window.firebaseDb, "users", state.user.id);
    const statsObj = state.stats.reduce((acc, s) => { acc[s.id] = s.totalXp; return acc; }, {});
    await setDoc(userRef, {
      totalXp: state.user.totalXp,
      theme: state.theme,
      stats: statsObj,
      done: state.done
    }, { merge: true });
  }

  async function saveTaskToDb(title, desc, iconId, scope, anchor, weekdays, taskId = null) {
    const { collection, addDoc, doc, updateDoc } = window.fs;
    const uid = state.user.id;
    const payload = { title, description: desc || 'Личное задание', icon: iconId, scope, anchor, weekdays };

    if (taskId) {
      await updateDoc(doc(window.firebaseDb, "users", uid, "tasks", taskId), payload);
    } else {
      await addDoc(collection(window.firebaseDb, "users", uid, "tasks"), payload);
    }
  }

  async function deleteTaskFromDb(taskId) {
    const { doc, deleteDoc } = window.fs;
    await deleteDoc(doc(window.firebaseDb, "users", state.user.id, "tasks", taskId));
  }

  async function deleteAllTasks() {
    const { collection, getDocs, doc, deleteDoc, getDoc, setDoc } = window.fs;
    const uid = state.user.id;

    const tasksRef = collection(window.firebaseDb, "users", uid, "tasks");
    const snap = await getDocs(tasksRef);
    const ids = [];
    snap.forEach(d => ids.push(d.id));

    for (const id of ids) {
      await deleteDoc(doc(window.firebaseDb, "users", uid, "tasks", id));
    }

    // чистим отметки выполнения от удалённых задач
    Object.keys(state.done).forEach(k => {
      state.done[k] = state.done[k].filter(id => !ids.includes(id));
      if (!state.done[k].length) delete state.done[k];
    });

    state.tasks = [];
    await saveUserStats();
    renderTasksPage();
    renderProfile();
  }

  async function addStarterTasksToDb() {
    const { collection, addDoc } = window.fs;
    const tasksRef = collection(window.firebaseDb, "users", state.user.id, "tasks");

    const existingTitles = state.tasks.map(t => t.title);
    const toAdd = STARTER_TASKS.filter(st => !existingTitles.includes(st.title));

    if (toAdd.length === 0) return 0;

    // стартовые задания создаются только на сегодняшний день
    const todayKey = dateKey(new Date());

    for (const st of toAdd) {
      await addDoc(tasksRef, {
        title: st.title,
        description: st.desc,
        icon: st.icon,
        scope: 'day',
        anchor: todayKey
      });
    }

    return toAdd.length;
  }

  /* ========== ВЫПОЛНЕНИЕ ЗАДАНИЙ ========== */
  async function toggleTask(key, taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    const alreadyDone = isDone(key, taskId);
    const statId = ICON_TO_STAT[task.icon];
    const stat = state.stats.find(s => s.id === statId);

    if (alreadyDone) {
      state.done[key] = state.done[key].filter(id => id !== taskId);
      state.user.totalXp = Math.max(0, state.user.totalXp - XP_PER_TASK);
      if (stat) stat.totalXp = Math.max(0, stat.totalXp - XP_PER_TASK);
    } else {
      if (!state.done[key]) state.done[key] = [];
      state.done[key].push(taskId);
      state.user.totalXp += XP_PER_TASK;
      if (stat) stat.totalXp += XP_PER_TASK;
    }

    renderTasksPage();
    renderProfile();

    try {
      await saveUserStats();
    } catch (err) {
      console.error('Не удалось сохранить:', err);
      if (alreadyDone) {
        state.done[key].push(taskId);
        state.user.totalXp += XP_PER_TASK;
        if (stat) stat.totalXp += XP_PER_TASK;
      } else {
        state.done[key] = state.done[key].filter(id => id !== taskId);
        state.user.totalXp -= XP_PER_TASK;
        if (stat) stat.totalXp -= XP_PER_TASK;
      }
      renderTasksPage();
      renderProfile();
    }
  }

  /* ========== РЕНДЕР ========== */
  function renderPeriodSwitch() {
    el.periodSwitch.querySelectorAll('.period-btn').forEach(btn =>
      btn.classList.toggle('period-btn--active', btn.dataset.period === state.viewPeriod));
  }

function renderDayCards() {
  const period = state.viewPeriod;
  const cur = periodStart(period, state.selectedDate);
  const anchors = [shiftPeriodDate(period, cur, -1), cur, shiftPeriodDate(period, cur, 1)];
  const today = startOfDay(new Date());

  el.dayCards.innerHTML = anchors.map(d => {
    const pct = periodPercent(period, d);
    const active = dateKey(d) === dateKey(cur);

    let dateText = '';
    let label = '';
    let isToday = false;

    if (period === 'day') {
      dateText = formatShortDate(d);
      const diff = Math.round((startOfDay(d) - today) / 86400000);
      label = diff === 0 ? 'сегодня' : diff === -1 ? 'вчера' : diff === 1 ? 'завтра' : '';
      isToday = diff === 0;
    } else if (period === 'week') {
      dateText = formatRange(d, addDays(d, 6));
      isToday = dateKey(startOfWeek(today)) === dateKey(d);
      label = isToday ? 'эта неделя' : '';
    } else {
      dateText = MONTHS_FULL[d.getMonth()];
      isToday = dateKey(startOfMonth(today)) === dateKey(d);
      if (d.getFullYear() !== today.getFullYear()) label = String(d.getFullYear());
      else if (isToday) label = 'этот месяц';
    }

    const cls = [
      'day-card',
      active ? 'day-card--active' : '',
      period !== 'day' ? 'day-card--period' : '',
      isToday ? 'day-card--today' : ''
    ].filter(Boolean).join(' ');

    return `<div class="${cls}" data-date="${dateKey(d)}">
      <div class="day-card__date">${dateText}</div>
      <div class="day-card__label">${label}</div>
      <div class="day-card__ring">
        <svg viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="18" fill="none" style="stroke: var(--progress-bg)" stroke-width="3.5"></circle>
          <circle cx="22" cy="22" r="18" fill="none" stroke="#007AFF" stroke-width="3.5"
            stroke-linecap="round" stroke-dasharray="${2*Math.PI*18}"
            stroke-dashoffset="${2*Math.PI*18*(1-pct/100)}" transform="rotate(-90 22 22)"></circle>
        </svg>
        <span class="day-card__pct">${pct}%</span>
      </div>
    </div>`;
  }).join('');

  el.dayCards.querySelectorAll('.day-card').forEach(card => {
    card.addEventListener('click', () => {
      state.selectedDate = parseDateKey(card.dataset.date);
      renderTasksPage();
    });
  });
}

function renderDayStrip() {
  const period = state.viewPeriod;

  if (period === 'day') {
    el.dayStrip.hidden = true;
    el.dayStrip.innerHTML = '';
    el.dayStrip.classList.remove('day-strip--week', 'day-strip--month');
    return;
  }

  const start = periodStart(period, state.selectedDate);
  const count = period === 'week' ? 7 : daysInMonth(start);
  const selKey = dateKey(state.selectedDate);
  const todayKey = dateKey(new Date());

  el.dayStrip.hidden = false;
  el.dayStrip.classList.toggle('day-strip--week', period === 'week');
  el.dayStrip.classList.toggle('day-strip--month', period === 'month');

  el.dayStrip.innerHTML = Array.from({ length: count }, (_, i) => {
    const d = addDays(start, i);
    const k = dateKey(d);
    const pct = dayPercent(k);
    const cls = ['day-chip'];
    if (k === selKey) cls.push('day-chip--active');
    if (k === todayKey) cls.push('day-chip--today');

    return `<button class="${cls.join(' ')}" data-date="${k}">
      <span class="day-chip__dow">${DOW[d.getDay()]}</span>
      <span class="day-chip__num">${d.getDate()}</span>
      <span class="day-chip__bar"><i style="width:${pct}%"></i></span>
    </button>`;
  }).join('');

  if (period === 'month') {
    const activeChip = el.dayStrip.querySelector('.day-chip--active');
    if (activeChip) {
      el.dayStrip.scrollLeft = activeChip.offsetLeft - el.dayStrip.clientWidth / 2 + activeChip.offsetWidth / 2;
    }
  }
}

  function taskTag(t) {
    const scope = taskScope(t);
    if (scope === 'week') return 'неделя';
    if (scope === 'month') return 'месяц';
    if (scope === 'weekdays') {
      const names = { 0: 'вс', 1: 'пн', 2: 'вт', 3: 'ср', 4: 'чт', 5: 'пт', 6: 'сб' };
      const order = [1, 2, 3, 4, 5, 6, 0];
      const list = order.filter(d => (t.weekdays || []).includes(d)).map(d => names[d]);
      return list.length ? list.join(', ') : 'дни недели';
    }
    if (scope === 'day' && state.viewPeriod !== 'day') return formatShortDate(parseDateKey(t.anchor));
    return '';
  }

  function renderTasksList() {
    const key = dateKey(state.selectedDate);
    const list = tasksForDate(state.selectedDate);

    if (!list.length) {
      if (!state.tasks.length) {
        el.tasksList.innerHTML = `<li class="empty">
          <div class="empty__icon"><i class="fa-solid fa-clipboard-list"></i></div>
          <div class="empty__title">Пока нет заданий</div>
          <button class="empty__btn" id="addStarterBtn"><i class="fa-solid fa-plus"></i> Добавить примеры</button>
        </li>`;
      } else {
        el.tasksList.innerHTML = `<li class="empty">
          <div class="empty__icon"><i class="fa-solid fa-mug-hot"></i></div>
          <div class="empty__title">На этот день заданий нет</div>
        </li>`;
      }
      el.tasksList.classList.remove('tasks--editing');
      return;
    }

    el.tasksList.innerHTML = list.map(t => {
      const done = isDone(key, t.id);
      const iconClass = state.editMode ? 'fa-pen' : 'fa-check';
      const tag = taskTag(t);
      return `<li class="task ${done ? 'task--done' : ''}" data-id="${t.id}">
        <span class="task__icon" style="--tint:${iconColor(t.icon)}"><i class="fa-solid ${t.icon}"></i></span>
        <span class="task__body">
          <span class="task__title">${t.title}${tag ? `<span class="task__tag">${tag}</span>` : ''}</span>
          <span class="task__sub">${t.desc}</span>
        </span>
        <span class="task__check"><i class="fa-solid ${iconClass}"></i></span>
      </li>`;
    }).join('');
    el.tasksList.classList.toggle('tasks--editing', state.editMode);
  }

  function updateModeButtons() {
    el.modeNormal.hidden = state.editMode;
    el.modeEditing.hidden = !state.editMode;
  }

  function sizeOutline() {
    if (!state.editMode) return;
    const w = el.tasksWrap.offsetWidth + 20;
    const h = el.tasksWrap.offsetHeight + 20;
    if (w <= 0 || h <= 0) return;
    el.tasksOutline.setAttribute('viewBox', `0 0 ${w} ${h}`);
    el.tasksOutlineRect.setAttribute('x', '1.25');
    el.tasksOutlineRect.setAttribute('y', '1.25');
    el.tasksOutlineRect.setAttribute('width', String(w - 2.5));
    el.tasksOutlineRect.setAttribute('height', String(h - 2.5));
    el.tasksOutlineRect.setAttribute('rx', '28');
    el.tasksOutlineRect.setAttribute('ry', '28');
  }

  function renderTasksPage() {
    renderPeriodSwitch();
    renderDayCards();
    renderDayStrip();
    renderTasksList();
    updateModeButtons();
    if (el.tasksWrap) el.tasksWrap.classList.toggle('tasks-wrap--editing', state.editMode);
  }

  function renderProfile() {
    const u = state.user;
    const info = computeLevelInfo(u.totalXp);

    el.profileAvatar.textContent = (u.name[0] || '?').toUpperCase();
    el.profileName.textContent = u.name;
    el.profileEmail.textContent = u.email;
    el.profileLevel.textContent = `Уровень ${info.level}`;
    el.profileXpText.textContent = `${info.xp}/${info.xpNeeded}`;
    el.profileXpFill.style.width = Math.min(100, Math.round(info.xp / info.xpNeeded * 100)) + '%';

    const streak = computeStreak();
    el.profileStreakNum.textContent = streak;
    const streakEl = document.querySelector('.profile-streak');
    if (streakEl) {
      streakEl.classList.toggle('profile-streak--on', streak > 0);
      streakEl.classList.toggle('profile-streak--off', streak === 0);
    }

    const themeNames = { light: 'Светлая', dark: 'Тёмная', system: 'Системная' };
    if (el.settingsThemeValue) el.settingsThemeValue.textContent = themeNames[state.theme] || 'Светлая';

    el.statsList.innerHTML = state.stats.map(s => {
      const si = computeLevelInfo(s.totalXp);
      return `<div class="stat-card">
        <div class="stat-card__icon" style="background:${s.color}"><i class="fa-solid ${s.icon}"></i></div>
        <div class="stat-card__right">
          <div class="stat-card__head">
            <div class="stat-card__name">${s.name}</div>
            <div class="stat-card__level">Ур. ${si.level}</div>
          </div>
          ${progressBar(si.xp, si.xpNeeded, s.color, true)}
        </div>
      </div>`;
    }).join('');
  }

  /* ========== МОДАЛКА ЗАДАНИЯ ========== */
  function openModal(taskId) {
    if (taskId) {
      const task = state.tasks.find(t => t.id === taskId);
      if (!task) return;
      state.editingTaskId = taskId;
      el.modalTitle.value = task.title;
      el.modalDesc.value = task.desc;
      modalIcon = ICONS.find(i => i.id === task.icon) || { id: task.icon, color: iconColor(task.icon) };
      modalScope = taskScope(task);
      modalAnchorDate = task.anchor ? parseDateKey(task.anchor) : startOfDay(state.selectedDate);
      modalWeekdays = Array.isArray(task.weekdays) && task.weekdays.length
        ? task.weekdays.slice()
        : [1, 3, 5];
      el.modalDelete.hidden = false;
      el.modalTitleText.textContent = 'Редактировать задание';
    } else {
      state.editingTaskId = null;
      el.modalTitle.value = '';
      el.modalDesc.value = '';
      modalIcon = ICONS[0];
      modalScope = state.viewPeriod === 'week' ? 'week'
                 : state.viewPeriod === 'month' ? 'month'
                 : 'daily';
      modalAnchorDate = startOfDay(state.selectedDate);
      modalWeekdays = [1, 3, 5];
      el.modalDelete.hidden = true;
      el.modalTitleText.textContent = 'Новое задание';
    }
    renderScopePicker();
    renderIconPicker();
    el.modal.hidden = false;
    setTimeout(() => el.modalTitle.focus(), 50);
  }

  function closeModal() { el.modal.hidden = true; state.editingTaskId = null; }

  function scopeHintText() {
    const d = modalAnchorDate;
    if (modalScope === 'daily') return 'Задание будет появляться каждый день';
    if (modalScope === 'day') return formatLongDate(d);
    if (modalScope === 'week') {
      const s = startOfWeek(d);
      const e = addDays(s, 6);
      return `${s.getDate()} ${MONTHS[s.getMonth()]} – ${e.getDate()} ${MONTHS[e.getMonth()]}`;
    }
    if (modalScope === 'weekdays') {
      const names = { 0: 'вс', 1: 'пн', 2: 'вт', 3: 'ср', 4: 'чт', 5: 'пт', 6: 'сб' };
      const order = [1, 2, 3, 4, 5, 6, 0];
      const list = order.filter(d => modalWeekdays.includes(d)).map(d => names[d]);
      return list.length ? 'Каждую ' + list.join(', ') : 'Выберите хотя бы один день';
    }
    return `${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
  }

  function renderScopePicker() {
    if (!el.scopePicker) return;
    el.scopePicker.querySelectorAll('.scope-option').forEach(btn =>
      btn.classList.toggle('scope-option--active', btn.dataset.scope === modalScope));

    if (el.weekdayPicker) {
      const show = modalScope === 'weekdays';
      el.weekdayPicker.hidden = !show;
      if (show) {
        el.weekdayPicker.querySelectorAll('.weekday-option').forEach(btn => {
          const d = Number(btn.dataset.dow);
          btn.classList.toggle('weekday-option--active', modalWeekdays.includes(d));
        });
      }
    }

    if (el.scopeHint) el.scopeHint.textContent = scopeHintText();
  }

  function renderIconPicker() {
    el.iconPicker.innerHTML = STAT_ICON_GROUPS.map(group => {
      const iconsHtml = group.icons.map(id => {
        const active = modalIcon && modalIcon.id === id;
        return `<button type="button" class="icon-option ${active ? 'icon-option--active' : ''}"
          data-icon="${id}" style="color:${iconColor(id)}"><i class="fa-solid ${id}"></i></button>`;
      }).join('');
      return `<div class="icon-col">${iconsHtml}</div>`;
    }).join('');

    el.iconPicker.querySelectorAll('.icon-option').forEach(btn => {
      btn.addEventListener('click', () => {
        modalIcon = ICONS.find(i => i.id === btn.dataset.icon) || ICONS[0];
        renderIconPicker();
      });
    });
  }

  async function saveTask() {
    const title = (el.modalTitle.value || '').trim();
    const desc = (el.modalDesc.value || '').trim();
    if (!title) { el.modalTitle.focus(); return; }
    const icon = modalIcon || ICONS[0];
    const scope = modalScope;

    if (scope === 'weekdays' && !modalWeekdays.length) {
      if (el.scopeHint) el.scopeHint.textContent = 'Выберите хотя бы один день недели';
      return;
    }

    const weekdays = scope === 'weekdays' ? modalWeekdays.slice().sort() : null;
    const anchor = (scope === 'daily' || scope === 'weekdays') ? null : dateKey(modalAnchorDate);
    const editId = state.editingTaskId;

    if (editId) {
      const task = state.tasks.find(t => t.id === editId);
      if (task) {
        task.title = title;
        task.desc = desc || 'Личное задание';
        task.icon = icon.id;
        task.color = iconColor(icon.id);
        task.scope = scope;
        task.anchor = anchor;
        task.weekdays = weekdays;
      }
      closeModal();
      renderTasksPage();
      saveTaskToDb(title, desc, icon.id, scope, anchor, weekdays, editId).catch(console.error);
    } else {
      closeModal();
      const { collection, addDoc } = window.fs;
      const tasksRef = collection(window.firebaseDb, "users", state.user.id, "tasks");
      const ref = await addDoc(tasksRef, {
        title,
        description: desc || 'Личное задание',
        icon: icon.id,
        scope,
        anchor,
        weekdays
      });
      state.tasks.push({
        id: ref.id, title, desc: desc || 'Личное задание',
        icon: icon.id, color: iconColor(icon.id),
        scope, anchor, weekdays
      });
      renderTasksPage();
    }
  }

  async function deleteTask() {
    if (!state.editingTaskId) return;
    const id = state.editingTaskId;

    state.tasks = state.tasks.filter(t => t.id !== id);
    Object.keys(state.done).forEach(k => {
      state.done[k] = state.done[k].filter(tid => tid !== id);
    });

    closeModal();
    renderTasksPage();
    renderProfile();

    deleteTaskFromDb(id).catch(console.error);
    saveUserStats().catch(console.error);
  }

  let isAddingStarters = false;

  async function addStarterTasks() {
    if (isAddingStarters) return;
    isAddingStarters = true;

    const btn = document.getElementById('addStarterBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Добавляем...';
    }

    try {
      const addedCount = await addStarterTasksToDb();
      await loadUserData();
      renderTasksPage();

      if (addedCount === 0) {
        el.tasksList.insertAdjacentHTML('beforeend',
          `<li style="padding: 10px 16px; font-size: 13px; color: var(--text-2); text-align: center;">
            Все примеры уже добавлены
          </li>`
        );
        setTimeout(() => renderTasksPage(), 1500);
      }
    } finally {
      isAddingStarters = false;
    }
  }

  /* ========== РЕЖИМ РЕДАКТИРОВАНИЯ ========== */
  function enterEditMode() {
    state.snapshot = JSON.parse(JSON.stringify(state.tasks));
    state.editMode = true;
    renderTasksPage();
  }

  function exitEditMode(keepChanges) {
    if (!keepChanges && state.snapshot) state.tasks = state.snapshot;
    state.snapshot = null;
    state.editMode = false;
    state.editingTaskId = null;
    renderTasksPage();
  }

  /* ========== ПРОФИЛЬ ========== */
  function openProfileModal() {
    el.profileNameInput.value = state.user.name;
    el.profileError.hidden = true;
    el.profileModal.hidden = false;
    setTimeout(() => el.profileNameInput.focus(), 50);
  }

  function closeProfileModal() { el.profileModal.hidden = true; }

  async function saveProfile() {
    const newName = (el.profileNameInput.value || '').trim();
    if (!newName) { el.profileNameInput.focus(); return; }
    if (newName.length < 2) { el.profileError.textContent = 'Имя слишком короткое'; el.profileError.hidden = false; return; }

    try {
      await window.fb.updateProfile(window.firebaseAuth.currentUser, { displayName: newName });
      state.user.name = newName;
      closeProfileModal();
      renderProfile();
    } catch (error) {
      el.profileError.textContent = error.message;
      el.profileError.hidden = false;
    }
  }

  /* ========== ТЕМА ========== */
  function applyTheme(theme) { document.documentElement.setAttribute('data-theme', theme); }
  function openThemeModal() { el.themeModal.hidden = false; updateThemeSelection(); }
  function closeThemeModal() { el.themeModal.hidden = true; }

  function updateThemeSelection() {
    document.querySelectorAll('.theme-option').forEach(btn =>
      btn.classList.toggle('theme-option--active', btn.dataset.theme === state.theme));
  }

  async function setTheme(theme) {
    state.theme = theme;
    applyTheme(theme);
    await saveUserStats();
    updateThemeSelection();
    renderProfile();
  }

  /* ========== ПОДТВЕРЖДЕНИЕ ========== */
  function askConfirm(title, text, callback, opts = {}) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmText').textContent = text;
    confirmCallback = callback;

    el.confirmOk.className = 'danger-btn danger-btn--solid';
    el.confirmCancel.className = 'primary-btn';

    el.confirmModal.hidden = false;
  }

  function closeConfirm() { el.confirmModal.hidden = true; confirmCallback = null; }

  function closeConfirm() { el.confirmModal.hidden = true; confirmCallback = null; }

  function bindConfirm() {
    el.confirmClose.addEventListener('click', closeConfirm);
    el.confirmBackdrop.addEventListener('click', closeConfirm);
    el.confirmCancel.addEventListener('click', closeConfirm);
    el.confirmOk.addEventListener('click', () => {
      const cb = confirmCallback;
      closeConfirm();
      if (cb) cb();
    });
  }

  function switchScreen(name) {
    if (name !== 'tasks' && state.editMode) exitEditMode(true);
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('screen--active', s.dataset.screen === name));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.target === name));
    el.content.scrollTop = 0;
    if (name === 'profile') renderProfile();
  }

  /* ========== СОБЫТИЯ ========== */
  function bindEvents() {
    // Переключатель периода
    el.periodSwitch.addEventListener('click', e => {
      const btn = e.target.closest('.period-btn');
      if (!btn) return;
      state.viewPeriod = btn.dataset.period;
      renderTasksPage();
    });

    // Стрелки — шаг равен выбранному периоду
    document.getElementById('prevDay').addEventListener('click', () => {
      state.selectedDate = shiftPeriodDate(state.viewPeriod, state.selectedDate, -1);
      renderTasksPage();
    });
    document.getElementById('nextDay').addEventListener('click', () => {
      state.selectedDate = shiftPeriodDate(state.viewPeriod, state.selectedDate, 1);
      renderTasksPage();
    });

    // Полоса дней внутри недели / месяца
    el.dayStrip.addEventListener('click', e => {
      const chip = e.target.closest('.day-chip');
      if (!chip) return;
      state.selectedDate = parseDateKey(chip.dataset.date);
      renderTasksPage();
    });

    el.tasksList.addEventListener('click', e => {
      if (e.target.closest('#addStarterBtn')) { addStarterTasks(); return; }
      const taskEl = e.target.closest('.task');
      if (!taskEl) return;
      if (state.editMode) { openModal(taskEl.dataset.id); return; }

      const today = startOfDay(new Date());
      const selected = startOfDay(state.selectedDate);
      if (selected > today) return;

      if (selected < today) {
        askConfirm(
          'Предыдущий день',
          'Это задание из прошлого дня. Вы уверены, что хотите изменить его статус?',
          () => toggleTask(dateKey(selected), taskEl.dataset.id)
        );
        return;
      }
      toggleTask(dateKey(selected), taskEl.dataset.id);
    });

    document.getElementById('createTaskBtn').addEventListener('click', () => openModal(null));
    document.getElementById('editModeBtn').addEventListener('click', enterEditMode);
    document.getElementById('cancelEditBtn').addEventListener('click', () => exitEditMode(false));
    document.getElementById('saveEditBtn').addEventListener('click', () => exitEditMode(true));
        // Выбор типа повторения (Всегда / День / Неделя / Месяц / Дни недели)
    el.scopePicker.querySelectorAll('.scope-option').forEach(btn => {
      btn.addEventListener('click', () => {
        modalScope = btn.dataset.scope;
        renderScopePicker();
      });
    });

    // Клики по дням недели — один раз при инициализации
    if (el.weekdayPicker) {
      el.weekdayPicker.addEventListener('click', e => {
        const btn = e.target.closest('.weekday-option');
        if (!btn) return;
        const d = Number(btn.dataset.dow);
        if (modalWeekdays.includes(d)) modalWeekdays = modalWeekdays.filter(x => x !== d);
        else modalWeekdays.push(d);
        renderScopePicker();
      });
    }

    el.modalClose.addEventListener('click', closeModal);
    el.modalBackdrop.addEventListener('click', closeModal);
    el.modalSave.addEventListener('click', saveTask);
    el.modalDelete.addEventListener('click', deleteTask);
    el.modalDesc.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveTask(); });

    el.floatingNav.addEventListener('click', e => {
      const btn = e.target.closest('.nav-item');
      if (btn) switchScreen(btn.dataset.target);
    });

    window.addEventListener('resize', () => { if (state.editMode) sizeOutline(); });

    el.settingsEditProfile.addEventListener('click', openProfileModal);
    el.profileModalClose.addEventListener('click', closeProfileModal);
    el.profileBackdrop.addEventListener('click', closeProfileModal);
    el.profileCancel.addEventListener('click', closeProfileModal);
    el.profileSave.addEventListener('click', saveProfile);
    el.profileNameInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveProfile(); });
    el.profileNameInput.addEventListener('input', () => { el.profileError.hidden = true; });

    el.settingsTheme.addEventListener('click', openThemeModal);
    el.themeClose.addEventListener('click', closeThemeModal);
    el.themeBackdrop.addEventListener('click', closeThemeModal);
    document.querySelectorAll('.theme-option').forEach(btn => {
      btn.addEventListener('click', () => { setTheme(btn.dataset.theme); closeThemeModal(); });
    });

    el.settingsLogout.addEventListener('click', () => {
      askConfirm(
        'Выход',
        'Точно вы хотите выйти из аккаунта?',
        logout,
        { danger: true }
      );
    });
    el.settingsDeleteTasks.addEventListener('click', () => {
      askConfirm(
        'Удалить все задания',
        'Все задания будут удалены без возможности восстановления. Продолжить?',
        async () => {
          try {
            await deleteAllTasks();
          } catch (err) {
            console.error('Не удалось удалить задания:', err);
            askConfirm('Ошибка', 'Не удалось удалить задания: ' + (err.message || err.code), () => {});
          }
        },
        { danger: true }
      );
    });
  }

  /* ========== ИНИЦИАЛИЗАЦИЯ ========== */
  async function init() {
    bindAuthEvents();
    bindConfirm();
    bindEvents();

    window.fb.onAuthStateChanged(window.firebaseAuth, async (user) => {
      if (isLoggingIn) return;

      if (user && user.emailVerified) {
        state.user.id = user.uid;
        state.user.name = user.displayName || 'Пользователь';
        state.user.email = user.email;
        await loadUserData();
        enterApp();
      } else if (!user) {
        showAuth();
      } else {
        showAuth();
        showLoginInfo('Пожалуйста, подтвердите почту, чтобы войти.');
      }
    });
  }

})();