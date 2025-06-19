// 編集モーダル共通処理
// 必要: requiredFields, renderTasksClassified, fetchTasks などは呼び出し元で用意

function createEditModal(task) {
  let startDateVal = task.startDate || new Date().toISOString().slice(0,10);
  const isDark = (localStorage.getItem('theme') || 'dark') === 'dark';
  let modalBg = isDark ? '#23272a' : '#fff';
  let modalColor = isDark ? '#f5f5f5' : '#181a1b';
  let editHtml = `<div id='editModal' style='position:fixed;left:0;top:0;width:100vw;height:100vh;background:#0008;z-index:1000;display:flex;align-items:center;justify-content:center;'><div id='editModalInner' style='background:${modalBg};color:${modalColor};padding:2em;border-radius:8px;min-width:400px;'><h3>タスク編集</h3>`;
  editHtml += `<label class='edit-label'>タスク名 <input id='editTitle' value='${task.title}'></label><br>`;
  editHtml += `<label class='edit-label'>種類 <span class='type-btns'>`;
  editHtml += `<button type='button' class='type-btn${task.taskType==='point'?' selected':''}' data-type='point'>ポイント</button>`;
  editHtml += `<button type='button' class='type-btn${task.taskType==='stock'?' selected':''}' data-type='stock'>ストック</button>`;
  editHtml += `</span></label><br>`;
  editHtml += `<label>繰り返し方法 <select id='editRepeatType'>`;
  editHtml += `<option value='interval'${task.repeatType==='interval'?' selected':''}>日数指定</option>`;
  editHtml += `<option value='weekday'${task.repeatType==='weekday'?' selected':''}>曜日指定</option>`;
  editHtml += `<option value='monthday'${task.repeatType==='monthday'?' selected':''}>日指定</option>`;
  editHtml += `<option value='once'${task.repeatType==='once'?' selected':''}>一回限り</option>`;
  editHtml += `</select></label><br>`;
  editHtml += `<div id='editIntervalInput' style='${task.repeatType==='interval'?'':'display:none;'}'><label>何日おき <input id='editInterval' type='number' value='${task.interval||''}'></label></div>`;
  editHtml += `<div id='editWeekdayInput' style='${task.repeatType==='weekday'?'':'display:none;'}'><label>曜日:`;
  for(let i=0;i<7;i++) editHtml += `<input type='checkbox' class='editWeekday' value='${i}'${(task.weekdays||'').split('-').includes(i+'')?' checked':''}>${['日','月','火','水','木','金','土'][i]}`;
  editHtml += `</label></div>`;
  editHtml += `<div id='editMonthdayInput' style='${task.repeatType==='monthday'?'':'display:none;'}'><label>日指定<input id='editMonthdays' value='${task.monthdays||''}'></label></div>`;
  editHtml += `<div id='editOnceInput' style='${task.repeatType==='once'?'':'display:none;'}'><label>実行日<input id='editOnceDate' type='date' value='${task.nextDate||''}'></label></div>`;
  editHtml += `<label>開始日 <input id='editStartDate' type='date' value='${startDateVal}'></label><br>`;
  editHtml += `<button id='editSaveBtn'>保存</button> <button id='editCancelBtn'>キャンセル</button> <button id='editDeleteBtn'>削除</button></div></div>`;
  document.body.insertAdjacentHTML('beforeend', editHtml);
  setTimeout(() => {
    const editStartDate = document.getElementById('editStartDate');
    if (editStartDate && !editStartDate.value) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      editStartDate.value = `${yyyy}-${mm}-${dd}`;
    }
  }, 0);
}

function getEditModalValues() {
  const newTitle = document.getElementById('editTitle').value;
  const selectedTypeBtn = document.querySelector('#editModal .type-btn.selected');
  const newTaskType = selectedTypeBtn ? selectedTypeBtn.dataset.type : '';
  const newRepeatType = document.getElementById('editRepeatType').value;
  let newInterval = '', newWeekdays = '', newMonthdays = '', newNextDate = '';
  if(newRepeatType==='interval') newInterval = document.getElementById('editInterval').value;
  if(newRepeatType==='weekday') newWeekdays = Array.from(document.querySelectorAll('.editWeekday:checked')).map(cb=>cb.value).join('-');
  if(newRepeatType==='monthday') newMonthdays = document.getElementById('editMonthdays').value;
  if(newRepeatType==='once') newNextDate = document.getElementById('editOnceDate').value;
  const newStartDate = document.getElementById('editStartDate').value;
  return { title: newTitle, taskType: newTaskType, repeatType: newRepeatType, interval: newInterval, weekdays: newWeekdays, monthdays: newMonthdays, nextDate: newNextDate, startDate: newStartDate };
}

function setupEditModalEvents(task, requiredFields, onSave) {
  document.querySelectorAll('#editModal .type-btn').forEach(btn => {
    btn.onclick = function() {
      document.querySelectorAll('#editModal .type-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    };
  });
  document.getElementById('editRepeatType').onchange = function() {
    document.getElementById('editIntervalInput').style.display = this.value==='interval'?'':'none';
    document.getElementById('editWeekdayInput').style.display = this.value==='weekday'?'':'none';
    document.getElementById('editMonthdayInput').style.display = this.value==='monthday'?'':'none';
    document.getElementById('editOnceInput').style.display = this.value==='once'?'':'none';
  };
  const editOnceDate = document.getElementById('editOnceDate');
  if (editOnceDate) {
    editOnceDate.onchange = function() {
      document.getElementById('editStartDate').value = this.value;
    };
  }
  document.getElementById('editSaveBtn').onclick = async function() {
    const values = getEditModalValues();
    if (!values.taskType) {
      alert('種類を選択してください');
      return;
    }
    if (typeof validateRequiredFields === 'function') {
      const error = validateRequiredFields(requiredFields, values);
      if (error) {
        alert(error);
        return;
      }
    }
    await onSave(task, values);
    document.getElementById('editModal').remove();
          //ページを更新
      location.reload();
  };
  document.getElementById('editCancelBtn').onclick = function() {
    document.getElementById('editModal').remove();
  };
  document.getElementById('editDeleteBtn').onclick = async function() {
    if (confirm('本当にこのタスクを削除しますか？')) {
      await fetch(`/api/tasks/${encodeURIComponent(task.title)}`, {
        method: 'DELETE'
      });
      document.getElementById('editModal').remove();
      //ページを更新
      location.reload();
    }
  };
}

async function submitEditModal(task, values) {
  await fetch(`/api/tasks/${encodeURIComponent(task.title)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values)
  });
}
