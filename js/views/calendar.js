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
    const dayCounts = getDayCounts(dateStr);
    // 按工作台分区判断完成状态：视频分区看 4 平台全发；文书分区看 ≥3 平台
    const videoOk = VIDEO_PLATFORMS.every(p => dayCounts[p] > 0);
    const articleOk = ARTICLE_PLATFORMS.filter(p => dayCounts[p] > 0).length >= 3;
    const inWs = workspace === 'video';
    const wsOk = inWs ? videoOk : articleOk;
    const wsHas = inWs
      ? VIDEO_PLATFORMS.some(p => dayCounts[p] > 0)
      : ARTICLE_PLATFORMS.some(p => dayCounts[p] > 0);
    let classes = 'calendar-day';
    if (isToday) classes += ' today';
    if (isSelected) classes += ' selected';
    html += `<div class="${classes}" onclick="selectDay('${dateStr}')">${d}<div class="dots">`;
    // 有内容的日期才显示点：当前分区完成变绿、未完成显示分区色点
    if (wsHas) {
      if (wsOk) html += '<span class="dot done"></span>';
      else html += `<span class="dot ${inWs ? 'video' : 'article'}"></span>`;
    }
    html += '</div></div>';
  }
  html += '</div></div>';

  if (selectedDate) {
    const counts = getDayCounts(selectedDate);
    const isPast = selectedDate < todayStr;
    html += `<div class="day-detail"><h4>${selectedDate} 发布任务</h4>`;
    // 按工作台分区只显示对应平台（短视频工作台 / 文书工作台）
    if (workspace === 'video') {
      html += '<div style="font-size:12px;color:var(--video-orange-light);margin-bottom:4px;font-weight:600;">短视频平台（全部 4 个有内容）</div>';
      VIDEO_PLATFORMS.forEach(p => html += renderDayPlatformItem(p, counts[p], selectedDate, 'video'));
    } else {
      html += '<div style="font-size:12px;color:var(--article-purple-light);margin-bottom:4px;font-weight:600;">文书平台（至少 3 个平台有内容）</div>';
      ARTICLE_PLATFORMS.forEach(p => html += renderDayPlatformItem(p, counts[p], selectedDate, 'article'));
    }
    html += '</div>';
  }
  return html;
}

// 单平台日历行：平台标签 + 已发条数/未登记 + [+1] 按钮 + 内容展开
function renderDayPlatformItem(platform, count, date, type) {
  const list = getPlatformContents(date, platform);
  const taskKey = platform + '|' + date;   // 展开状态 key（保存重绘后据此恢复展开）
  const isOpen = expandedTaskKeys.has(taskKey);
  let html = `<div class="day-task ${count > 0 ? 'has-detail' : ''}">
    <div class="day-task-row">
      <span class="task-name">
        <span class="platform-tag ${type}">${platform}</span>
        ${count > 0
          ? `<span style="color:var(--green);font-size:12px;font-weight:600;">已发 ${count} 条</span><span class="expand-toggle ${isOpen ? 'open' : ''}" onclick="toggleTaskDetail(this, '${taskKey}')">&#9660;</span>`
          : `<span style="color:var(--text3);font-size:12px;">未登记</span>`}
      </span>
      <button class="btn-done" onclick="openAddModal('${platform}', null, '${date}')">+1</button>
    </div>`;
  if (count > 0) {
    html += `<div class="task-detail ${isOpen ? 'open' : ''}">`;
    list.forEach(c => html += renderContentDetail(c));
    html += `</div>`;
  }
  html += '</div>';
  return html;
}

function changeMonth(delta) { currentMonth.setMonth(currentMonth.getMonth() + delta); render(); }
function goToday() { currentMonth = new Date(); selectedDate = getToday(); render(); }
function selectDay(date) { selectedDate = date; render(); }

// 从数据复盘折线图点击数据点跳转：切到发布日历并定位到该日期所在月、选中该日
function goCalendarDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) { showToast('无效日期'); return; }
  currentMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  selectedDate = dateStr;
  currentTab = 'calendar';
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'calendar'));
  render();
}

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
