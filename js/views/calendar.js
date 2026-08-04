function renderCalendar() {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr = getToday();

  let html = `<div class="card"><div class="calendar-header"><div class="calendar-nav">
    <button onclick="changeMonth(-1)">&#8249;</button>
    <span class="calendar-month">${year}年${month+1}月</span>
    <button onclick="changeMonth(1)">&#8250;</button>
  </div><button class="btn-today" onclick="goToday()">今天</button></div>`;

  html += `<div class="calendar-grid">
    <div class="day-header">日</div><div class="day-header">一</div><div class="day-header">二</div><div class="day-header">三</div><div class="day-header">四</div><div class="day-header">五</div><div class="day-header">六</div>`;

  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = 0; i < firstDay; i++) html += `<div class="calendar-day other-month">${prevMonthDays - firstDay + i + 1}</div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === selectedDate;
    const dayTasks = tasks.filter(t => t.date === dateStr);
    const doneTasks = dayTasks.filter(t => t.done);
    const videoDots = dayTasks.filter(t => t.type === 'video' && !t.done).length;
    const articleDots = dayTasks.filter(t => t.type === 'article' && !t.done).length;
    const doneDots = doneTasks.length;
    let classes = 'calendar-day';
    if (isToday) classes += ' today';
    if (isSelected) classes += ' selected';
    html += `<div class="${classes}" onclick="selectDay('${dateStr}')">${d}<div class="dots">`;
    if (videoDots > 0) html += '<span class="dot video"></span>';
    if (articleDots > 0) html += '<span class="dot article"></span>';
    if (doneDots > 0) html += '<span class="dot done"></span>';
    html += '</div></div>';
  }
  html += '</div></div>';

  if (selectedDate) {
    const dayTasks = tasks.filter(t => t.date === selectedDate);
    const dv = dayTasks.filter(t => t.type === 'video');
    const da = dayTasks.filter(t => t.type === 'article');
    const isPast = selectedDate < todayStr;
    html += `<div class="day-detail"><h4>${selectedDate} 发布任务</h4>`;
    if (dayTasks.length === 0) { html += '<p style="font-size:13px;color:var(--text2);">暂无任务</p>'; }
    else {
      if (dv.length > 0) {
        html += '<div style="font-size:12px;color:#fdba74;margin-bottom:4px;font-weight:600;">短视频平台</div>';
        dv.forEach(t => {
          const content = t.contentId ? contents.find(c => c.id === t.contentId) : null;
          html += `<div class="day-task ${content ? 'has-detail' : ''}">
            <div class="day-task-row">
              <span class="task-name">${renderChainDots(t)} <span class="platform-tag video">${t.platform}</span>${content ? ' ' + content.title : ''} ${renderChainHint(t)}${content ? `<span class="expand-toggle" onclick="toggleTaskDetail(this)">&#9660;</span>` : ''}</span>
              ${renderTaskButton(t)}
            </div>
            ${content ? renderTaskDetail(content, t) : ''}
          </div>`;
        });
      }
      if (da.length > 0) {
        html += '<div style="font-size:12px;color:#c4b5fd;margin:8px 0 4px;font-weight:600;">文书平台</div>';
        da.forEach(t => {
          const content = t.contentId ? contents.find(c => c.id === t.contentId) : null;
          html += `<div class="day-task ${content ? 'has-detail' : ''}">
            <div class="day-task-row">
              <span class="task-name">${renderChainDots(t)} <span class="platform-tag article">${t.platform}</span>${content ? ' ' + content.title : ''} ${renderChainHint(t)}${content ? `<span class="expand-toggle" onclick="toggleTaskDetail(this)">&#9660;</span>` : ''}</span>
              ${renderTaskButton(t)}
            </div>
            ${content ? renderTaskDetail(content, t) : ''}
          </div>`;
        });
      }
    }
    html += '</div>';
  }
  return html;
}

function changeMonth(delta) { currentMonth.setMonth(currentMonth.getMonth() + delta); render(); }
function goToday() { currentMonth = new Date(); selectedDate = getToday(); render(); }
function selectDay(date) { selectedDate = date; render(); }

// 折叠/展开登记内容列表（状态存 contentFoldOpen，render 后自动应用）
function toggleContentFold() {
  contentFoldOpen = !contentFoldOpen;
  applyContentFold();
}
function applyContentFold() {
  const body = document.getElementById('contentList');
  const arrow = document.getElementById('foldArrow');
  if (body) body.style.display = contentFoldOpen ? 'block' : 'none';
  if (arrow) arrow.innerHTML = contentFoldOpen ? '&#9650;' : '&#9660;';
}
