// Inicializace
if (!localStorage.getItem('exodus_habits')) {
    localStorage.setItem('exodus_habits', JSON.stringify([]));
}
if (!localStorage.getItem('exodus_logs')) {
    localStorage.setItem('exodus_logs', JSON.stringify([]));
}

function getRealTodayString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

let currentViewDateStr = getRealTodayString();
let currentCalendarDate = new Date(); // Pamatuje si měsíc zobrazený v kalendáři

function changeDate(offset) {
    const d = new Date(currentViewDateStr);
    d.setDate(d.getDate() + offset);
    currentViewDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    renderTodayView();
}

function resetDate() {
    currentViewDateStr = getRealTodayString();
    renderTodayView();
}

function changeCalendarMonth(offset) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offset);
    renderCalendarView();
}

function loadData() {
    return {
        habits: JSON.parse(localStorage.getItem('exodus_habits')),
        logs: JSON.parse(localStorage.getItem('exodus_logs'))
    };
}

function saveData(habits, logs) {
    localStorage.setItem('exodus_habits', JSON.stringify(habits));
    localStorage.setItem('exodus_logs', JSON.stringify(logs));
}

// Funkce pro výpočet počtu úspěšných dní v řadě
function getHabitStreak(habit, logs, baseDateStr) {
    let streak = 0;
    
    let todayLog = logs.find(l => l.date === baseDateStr);
    let todayDayOfWeek = new Date(baseDateStr).getDay();
    let isScheduledToday = !habit.daysOfWeek || habit.daysOfWeek.length === 0 || habit.daysOfWeek.includes(todayDayOfWeek);
    
    if (isScheduledToday && todayLog && todayLog.completedHabitIds.includes(habit.id)) {
        streak++;
    }

    for (let i = 1; i <= 365; i++) {
        let pastD = new Date(baseDateStr);
        pastD.setDate(pastD.getDate() - i);
        let pastStr = `${pastD.getFullYear()}-${String(pastD.getMonth() + 1).padStart(2, '0')}-${String(pastD.getDate()).padStart(2, '0')}`;
        let pastDayOfWeek = pastD.getDay();
        
        let isScheduled = !habit.daysOfWeek || habit.daysOfWeek.length === 0 || habit.daysOfWeek.includes(pastDayOfWeek);
        
        if (isScheduled) {
            let pastLog = logs.find(l => l.date === pastStr);
            if (pastLog && pastLog.completedHabitIds.includes(habit.id)) {
                streak++;
            } else {
                break;
            }
        }
    }
    return streak;
}

function switchTab(tabId) {
    document.querySelectorAll('.app-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(`tab-${tabId}`).classList.add('active');
    document.getElementById(`btn-tab-${tabId}`).classList.add('active');
    
    if (tabId === 'today') renderTodayView();
    if (tabId === 'calendar') renderCalendarView();
    if (tabId === 'settings') renderSettingsView();
}

function renderTodayView() {
    const { habits, logs } = loadData();
    const isRealToday = currentViewDateStr === getRealTodayString();
    
    const viewDate = new Date(currentViewDateStr);
    const viewDayOfWeek = viewDate.getDay();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    
    document.getElementById('today-date').innerText = viewDate.toLocaleDateString('cs-CZ', options);
    
    if (isRealToday) {
        document.getElementById('btn-reset-date').classList.add('hidden');
        document.getElementById('today-subtitle').classList.remove('hidden');
    } else {
        document.getElementById('btn-reset-date').classList.remove('hidden');
        document.getElementById('today-subtitle').classList.add('hidden');
    }

    const scheduledHabits = habits.filter(h => h.isActive && (!h.daysOfWeek || h.daysOfWeek.length === 0 || h.daysOfWeek.includes(viewDayOfWeek)));
    const unscheduledHabits = habits.filter(h => h.isActive && h.daysOfWeek && h.daysOfWeek.length > 0 && !h.daysOfWeek.includes(viewDayOfWeek));
    
    const currentLog = logs.find(l => l.date === currentViewDateStr) || { date: currentViewDateStr, completedHabitIds: [], eveningReflection: '', gratitude: '' };
    
    const container = document.getElementById('habits-list');
    container.innerHTML = '';
    
    if (scheduledHabits.length === 0) {
        container.innerHTML = '<p class="subtitle" style="text-align:center; padding: 20px 0;">Pro tento den nemáš naplánovány žádné specifické návyky.</p>';
    } else {
        scheduledHabits.forEach(habit => {
            const isDone = currentLog.completedHabitIds.includes(habit.id);
            const streak = getHabitStreak(habit, logs, currentViewDateStr);
            const streakHtml = streak > 1 ? `<span style="font-size: 0.75rem; color: #e67e22; font-weight: bold; margin-left: 8px;">🔥 ${streak}x v řadě</span>` : '';

            const card = document.createElement('div');
            card.className = `habit-card cat-${habit.category} ${isDone ? 'done' : ''}`;
            
            card.innerHTML = `
                <input type="checkbox" ${isDone ? 'checked' : ''} onchange="toggleHabitToday('${habit.id}')">
                <div class="habit-info">
                    <p class="habit-title">${habit.name}${streakHtml}</p>
                    <p class="habit-trigger">${habit.trigger}</p>
                </div>
            `;
            container.appendChild(card);
        });
    }

    if (unscheduledHabits.length > 0) {
        const extraHeader = document.createElement('h3');
        extraHeader.innerText = 'Aktivity navíc (nepovinné)';
        extraHeader.style.fontSize = '1.0rem';
        extraHeader.style.marginTop = '24px';
        extraHeader.style.marginBottom = '12px';
        extraHeader.style.color = 'var(--text-muted)';
        container.appendChild(extraHeader);

        unscheduledHabits.forEach(habit => {
            const isDone = currentLog.completedHabitIds.includes(habit.id);
            const card = document.createElement('div');
            
            card.className = `habit-card cat-${habit.category} ${isDone ? 'done' : ''}`;
            card.style.opacity = isDone ? '0.4' : '0.75';
            card.style.transform = 'scale(0.96)';
            card.style.borderLeftWidth = '3px';
            
            card.innerHTML = `
                <input type="checkbox" ${isDone ? 'checked' : ''} onchange="toggleHabitToday('${habit.id}')">
                <div class="habit-info">
                    <p class="habit-title">${habit.name}</p>
                    <p class="habit-trigger" style="font-size:0.75rem;">${habit.trigger}</p>
                </div>
            `;
            container.appendChild(card);
        });
    }
    
    const isEvening = new Date().getHours() >= 18; 
    const reflectionSection = document.getElementById('reflection-section');
    
    if (isEvening || currentLog.eveningReflection || currentLog.gratitude || !isRealToday) {
        reflectionSection.classList.remove('hidden');
        document.getElementById('input-reflection').value = currentLog.eveningReflection || '';
        document.getElementById('input-gratitude').value = currentLog.gratitude || '';
    } else {
        reflectionSection.classList.add('hidden');
    }
}

function toggleHabitToday(habitId) {
    const { habits, logs } = loadData();
    
    let currentLogIndex = logs.findIndex(l => l.date === currentViewDateStr);
    if (currentLogIndex === -1) {
        logs.push({ date: currentViewDateStr, completedHabitIds: [], eveningReflection: '', gratitude: '' });
        currentLogIndex = logs.length - 1;
    }
    
    const completedIds = logs[currentLogIndex].completedHabitIds;
    const idIndex = completedIds.indexOf(habitId);
    
    if (idIndex === -1) {
        completedIds.push(habitId);
    } else {
        completedIds.splice(idIndex, 1);
    }
    
    saveData(habits, logs);
    renderTodayView();
}

function saveTodayLog() {
    const { habits, logs } = loadData();
    
    let currentLogIndex = logs.findIndex(l => l.date === currentViewDateStr);
    if (currentLogIndex === -1) {
        logs.push({ date: currentViewDateStr, completedHabitIds: [], eveningReflection: '', gratitude: '' });
        currentLogIndex = logs.length - 1;
    }
    
    logs[currentLogIndex].eveningReflection = document.getElementById('input-reflection').value;
    logs[currentLogIndex].gratitude = document.getElementById('input-gratitude').value;
    
    saveData(habits, logs);
    alert('Tvá večerní reflexe byla laskavě uložena.');
}

let editingHabitId = null;

function renderSettingsView() {
    const { habits } = loadData();
    const container = document.getElementById('manage-habits-list');
    container.innerHTML = '';
    
    habits.forEach(habit => {
        let daysStr = "Každý den";
        if (habit.daysOfWeek && habit.daysOfWeek.length > 0 && habit.daysOfWeek.length < 7) {
            const dayNames = {1:'Po', 2:'Út', 3:'St', 4:'Čt', 5:'Pá', 6:'So', 0:'Ne'};
            const sortedDays = [...habit.daysOfWeek].sort((a,b) => (a===0?7:a) - (b===0?7:b));
            daysStr = sortedDays.map(d => dayNames[d]).join(', ');
        }

        const item = document.createElement('div');
        item.className = 'manage-habit-item';
        item.innerHTML = `
            <div style="flex-grow: 1;">
                <strong style="color:var(--text-main);">${habit.name}</strong> <span style="font-size:0.8rem; color:var(--text-muted);">(${habit.category})</span>
                <div style="font-size:0.8rem; color:var(--text-muted); font-weight:bold;">${daysStr}</div>
                <div style="font-size:0.85rem; font-style:italic; color:var(--text-muted);">${habit.trigger}</div>
            </div>
            <div style="display: flex; gap: 8px;">
                <button class="btn-toggle-status" style="background: #f39c12;" onclick="editHabit('${habit.id}')">Upravit</button>
                <button class="btn-toggle-status ${habit.isActive ? '' : 'paused'}" onclick="toggleHabitStatus('${habit.id}')">
                    ${habit.isActive ? 'Uspat' : 'Aktivovat'}
                </button>
            </div>
        `;
        container.appendChild(item);
    });
}

function editHabit(habitId) {
    const { habits } = loadData();
    const habit = habits.find(h => h.id === habitId);
    
    if (habit) {
        document.getElementById('new-habit-name').value = habit.name;
        document.getElementById('new-habit-category').value = habit.category;
        document.getElementById('new-habit-trigger').value = habit.trigger;
        
        const checkboxes = document.querySelectorAll('.day-checkbox');
        const activeDays = habit.daysOfWeek || [0,1,2,3,4,5,6];
        checkboxes.forEach(cb => {
            cb.checked = activeDays.includes(parseInt(cb.value));
        });
        
        editingHabitId = habit.id;
        const btn = document.getElementById('btn-save-habit');
        btn.innerText = 'Uložit úpravy';
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function saveHabit() {
    const name = document.getElementById('new-habit-name').value.trim();
    const category = document.getElementById('new-habit-category').value;
    const trigger = document.getElementById('new-habit-trigger').value.trim();
    
    const selectedDays = Array.from(document.querySelectorAll('.day-checkbox'))
                              .filter(cb => cb.checked)
                              .map(cb => parseInt(cb.value));

    const finalDays = selectedDays.length > 0 ? selectedDays : [0,1,2,3,4,5,6];

    if (!name || !trigger) {
        alert('Prosím, vyplň název návyku i jeho konkrétní spouštěč.');
        return;
    }
    
    const { habits, logs } = loadData();
    
    if (editingHabitId) {
        const index = habits.findIndex(h => h.id === editingHabitId);
        if (index !== -1) {
            habits[index].name = name;
            habits[index].category = category;
            habits[index].trigger = trigger;
            habits[index].daysOfWeek = finalDays;
        }
        alert('Tvé úpravy byly laskavě uloženy.');
    } else {
        const newHabit = {
            id: String(Date.now()),
            name: name,
            category: category,
            trigger: trigger,
            isActive: true,
            daysOfWeek: finalDays
        };
        habits.push(newHabit);
        alert('Nový úmysl byl úspěšně zařazen.');
    }
    
    saveData(habits, logs);
    
    document.getElementById('new-habit-name').value = '';
    document.getElementById('new-habit-trigger').value = '';
    document.querySelectorAll('.day-checkbox').forEach(cb => cb.checked = true);
    
    editingHabitId = null;
    document.getElementById('btn-save-habit').innerText = 'Přidat do svého plánu';
    
    renderSettingsView();
}

function toggleHabitStatus(habitId) {
    const { habits, logs } = loadData();
    const habit = habits.find(h => h.id === habitId);
    if (habit) {
        habit.isActive = !habit.isActive;
        saveData(habits, logs);
        renderSettingsView();
    }
}

function exportData() {
    const data = {
        habits: JSON.parse(localStorage.getItem('exodus_habits') || '[]'),
        logs: JSON.parse(localStorage.getItem('exodus_logs') || '[]')
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "nasledovani_zaloha_" + getRealTodayString() + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.habits && data.logs) {
                localStorage.setItem('exodus_habits', JSON.stringify(data.habits));
                localStorage.setItem('exodus_logs', JSON.stringify(data.logs));
                alert('Data byla úspěšně obnovena! Aplikace se nyní načte se starými záznamy.');
                location.reload(); 
            } else {
                alert('Zvolený soubor neobsahuje platná data pro tuto aplikaci.');
            }
        } catch (err) {
            alert('Nastala chyba při čtení souboru. Ujistěte se, že jde o správný formát JSON.');
        }
    };
    reader.readAsText(file);
}

function renderCalendarView() {
    const { habits, logs } = loadData();
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';
    
    // Zde je změna pro listování kalendářem
    const currentYear = currentCalendarDate.getFullYear();
    const currentMonth = currentCalendarDate.getMonth();
    
    const realToday = new Date();
    const todayDate = new Date(realToday.getFullYear(), realToday.getMonth(), realToday.getDate());
    
    const monthNames = ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];
    document.getElementById('calendar-month-year').innerText = `${monthNames[currentMonth]} ${currentYear}`;
    
    let firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    let startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    for (let i = 0; i < startOffset; i++) {
        const emptyBox = document.createElement('div');
        emptyBox.className = 'calendar-day-box empty';
        grid.appendChild(emptyBox);
    }
    
    for (let day = 1; day <= totalDays; day++) {
        const dayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const log = logs.find(l => l.date === dayStr);
        const checkDate = new Date(currentYear, currentMonth, day);
        const checkDayOfWeek = checkDate.getDay();
        
        const scheduledHabits = habits.filter(h => h.isActive && (!h.daysOfWeek || h.daysOfWeek.length === 0 || h.daysOfWeek.includes(checkDayOfWeek)));
        const expectedIds = scheduledHabits.map(h => h.id);
        
        const dayBox = document.createElement('div');
        dayBox.className = 'calendar-day-box';
        dayBox.innerText = day;
        
        if (checkDate > todayDate) {
            dayBox.classList.add('future-day');
        } else {
            if (log && (log.completedHabitIds.length > 0 || log.eveningReflection)) {
                const completedExpectedCount = log.completedHabitIds.filter(id => expectedIds.includes(id)).length;
                
                if (completedExpectedCount >= scheduledHabits.length || log.eveningReflection) {
                    dayBox.classList.add('all-done');
                } else {
                    dayBox.classList.add('some-done');
                }
            } else {
                if (checkDate < todayDate) {
                    dayBox.classList.add('none-done');
                }
            }
            dayBox.onclick = () => showDayDetail(dayStr);
        }
        
        grid.appendChild(dayBox);
    }
}

function showDayDetail(dateStr) {
    const { habits, logs } = loadData();
    const log = logs.find(l => l.date === dateStr);
    const container = document.getElementById('day-detail-container');
    
    container.classList.remove('hidden');
    
    const checkDate = new Date(dateStr);
    const checkDayOfWeek = checkDate.getDay();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('detail-date').innerText = `Ohlédnutí za dnem: ${checkDate.toLocaleDateString('cs-CZ', options)}`;
    
    const habitsDiv = document.getElementById('detail-habits');
    habitsDiv.innerHTML = '';
    
    const completedIds = log ? log.completedHabitIds : [];
    
    const habitsToShow = habits.filter(h => {
        if (!h.isActive && !completedIds.includes(h.id)) return false; 
        const isScheduled = !h.daysOfWeek || h.daysOfWeek.length === 0 || h.daysOfWeek.includes(checkDayOfWeek);
        const isCompletedExtra = completedIds.includes(h.id);
        return isScheduled || isCompletedExtra;
    });
    
    const completedHeader = document.createElement('h4');
    completedHeader.innerText = 'To, co se podařilo:';
    completedHeader.style.color = 'var(--success-color)';
    completedHeader.style.margin = '16px 0 6px 0';
    habitsDiv.appendChild(completedHeader);
    
    let hasCompleted = false;
    habitsToShow.forEach(h => {
        if (completedIds.includes(h.id)) {
            hasCompleted = true;
            const p = document.createElement('p');
            p.style.margin = '4px 0';
            p.innerHTML = `✓ <strong>${h.name}</strong> <span style="font-size:0.8rem; color:var(--text-muted);">(${h.category})</span>`;
            habitsDiv.appendChild(p);
        }
    });
    
    if (!hasCompleted) {
        habitsDiv.innerHTML += '<p style="color:var(--text-muted); font-style:italic; margin:4px 0;">V tento den nebyl splněn žádný návyk.</p>';
    }
    
    const scheduledNotCompleted = habitsToShow.filter(h => 
        (!h.daysOfWeek || h.daysOfWeek.length === 0 || h.daysOfWeek.includes(checkDayOfWeek)) && 
        !completedIds.includes(h.id)
    );

    if (scheduledNotCompleted.length > 0) {
        const uncompletedHeader = document.createElement('h4');
        uncompletedHeader.innerText = 'To, co dnes nevyšlo (prostor pro reflexi):';
        uncompletedHeader.style.color = 'var(--text-muted)';
        uncompletedHeader.style.margin = '20px 0 6px 0';
        habitsDiv.appendChild(uncompletedHeader);
        
        scheduledNotCompleted.forEach(h => {
            const p = document.createElement('p');
            p.style.margin = '4px 0';
            p.style.color = 'var(--text-muted)';
            p.innerHTML = `• <span style="text-decoration: line-through; opacity: 0.6;">${h.name}</span>`;
            habitsDiv.appendChild(p);
        });
    } else if (habitsToShow.length > 0 && hasCompleted) {
        habitsDiv.innerHTML += '<p style="color:var(--success-color); font-style:italic; margin:16px 0 4px 0;">Všechny denní povinnosti byly splněny!</p>';
    }
    
    document.getElementById('detail-reflection').innerHTML = log && log.eveningReflection 
        ? `<div style="margin-top:16px; padding:10px; background:var(--bg-color); border-left:3px solid var(--border-color); border-radius:4px; color:var(--text-main);"><strong>Moje tehdejší boje:</strong><br>${log.eveningReflection}</div>` 
        : '';
        
    document.getElementById('detail-gratitude').innerHTML = log && log.gratitude 
        ? `<div style="margin-top:10px; padding:10px; background:var(--success-bg); border-left:3px solid var(--success-color); border-radius:4px; color:var(--text-main);"><strong>Vděčnost:</strong><br>${log.gratitude}</div>` 
        : '';
}

renderTodayView();