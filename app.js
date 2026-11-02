const $=s=>document.querySelector(s);
const dateKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
let now=new Date(),today=dateKey(now),monday=new Date(now.getFullYear(),now.getMonth(),now.getDate()-((now.getDay()+6)%7));
let days=Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setDate(d.getDate()+i);return dateKey(d)});
let storageKey='den-journal-v1';let saved;try{saved=JSON.parse(localStorage.getItem(storageKey))}catch{}
let tasks=Array.isArray(saved?.tasks)?saved.tasks:[{id:crypto.randomUUID(),title:'Спланировать неделю и выбрать главное',date:today,category:'Личное',priority:'high',done:true},{id:crypto.randomUUID(),title:'Поработать над своим проектом',date:today,category:'Работа',priority:'high',done:false},{id:crypto.randomUUID(),title:'Выйти на прогулку без телефона',date:today,category:'Здоровье',priority:'normal',done:false},{id:crypto.randomUUID(),title:'Прочитать 20 страниц книги',date:today,category:'Учёба',priority:'low',done:false},{id:crypto.randomUUID(),title:'Разобрать почту и ответить на важное',date:today,category:'Работа',priority:'normal',done:true}];
let recurring=Array.isArray(saved?.recurring)?saved.recurring:[];
let view='today',filter='all',editId=null,selectedDate=today;
const weekdays=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
const priorities={neutral:'Нейтрально',high:'Высокий',normal:'Обычный',low:'Низкий'};
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),2400)}
function save(){try{localStorage.setItem(storageKey,JSON.stringify({tasks,recurring,focus:$('#focus').value,notes:$('#notes').value}));window.denCloud?.schedule()}catch{toast('Не удалось сохранить: проверь доступ к хранилищу браузера')}}
$('#focus').value=saved?.focus??'Выделить время на свой проект';$('#notes').value=saved?.notes??'';
$('#focus').addEventListener('input',save);$('#notes').addEventListener('input',save);
function labelDate(key){return new Date(key+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'short'})}
function scoped(){return allTasks().filter(t=>view==='all'||(view==='week'?days.includes(t.date):t.date===selectedDate))}
function render(){renderCalendar();renderAnalytics();const day=allTasks().filter(t=>t.date===selectedDate),week=allTasks().filter(t=>days.includes(t.date));const done=day.filter(t=>t.done).length,pct=day.length?Math.round(done/day.length*100):0;$('#day-pct').textContent=pct+'%';$('#mascot-button')?.classList.toggle('celebrating',day.length>0&&done===day.length);const mascotMessage=$('#mascot-message');if(mascotMessage)mascotMessage.textContent=day.length&&done===day.length?'Все дела закрыты. Плащ на крючок — ты заслужил отдых.':done>0?'Уже есть маленькие победы. Продолжаем в твоём темпе.':'Спасать мир — после обеда. Пока закрой одну задачу.';$('#day-count').textContent=`${done} из ${day.length} задач`;$('#day-bar').style.width=pct+'%';$('#week-done').textContent=week.filter(t=>t.done).length;$('#week-total').textContent=`из ${week.length} задач выполнено`;$('#all-count').textContent=allTasks().length;$('#mini-bars').replaceChildren();$('#chart').replaceChildren();days.forEach((key,i)=>{const total=week.filter(t=>t.date===key),n=total.filter(t=>t.done).length,percent=total.length?n/total.length*100:0;const bar=document.createElement('i');bar.style.height=Math.max(12,percent)+'%';bar.title=`${labelDate(key)}: ${n} из ${total.length}`;$('#mini-bars').append(bar);const col=document.createElement('div');col.className='chart-col'+(key===today?' today':'');col.title=bar.title;const b=document.createElement('div');b.className='chart-bar';b.style.height=Math.max(5,percent)+'%';const l=document.createElement('label');l.textContent=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][i];col.append(b,l);$('#chart').append(col)});$('#week-summary').textContent=week.length?`Выполнено ${Math.round(week.filter(t=>t.done).length/week.length*100)}% планов недели. В своём темпе 🌱`:'Добавь первый план на эту неделю 🌱';const list=scoped();$('#task-count').textContent=list.length;$('#remaining').textContent=`Осталось: ${list.filter(t=>!t.done).length}`;const visible=list.filter(t=>filter==='all'||(filter==='done'?t.done:!t.done)).sort((a,b)=>a.date.localeCompare(b.date)||Number(a.done)-Number(b.done));$('#task-list').replaceChildren();if(!visible.length){const e=document.createElement('div');e.className='empty';e.textContent=filter==='done'?'Здесь появятся выполненные дела':filter==='open'?'Всё готово. Можно выдохнуть':'Пока чистый лист. Каким будет твой день?';$('#task-list').append(e)}visible.forEach(t=>{const row=document.createElement('div');row.className='task'+(t.done?' done':'');const check=document.createElement('button');check.className='check';check.textContent=t.done?'✓':'';check.setAttribute('aria-label',(t.done?'Вернуть в планы: ':'Завершить: ')+t.title);check.setAttribute('aria-pressed',t.done);check.onclick=()=>{if(t.seriesId){const series=recurring.find(r=>r.id===t.seriesId);series.completed[t.date]=!t.done}else t.done=!t.done;save();render()};const body=document.createElement('div');body.className='task-body';const title=document.createElement('button');title.type='button';title.className='task-title task-open';title.textContent=t.title+' ›';title.setAttribute('aria-label','Открыть задачу: '+t.title);title.onclick=()=>openDetails(t.id);const meta=document.createElement('div');meta.className='task-meta';const cat=document.createElement('span');cat.className='category'+(t.category==='Работа'?' work':t.category==='Здоровье'?' health':'');cat.textContent=t.category;const dot=document.createElement('i');dot.className='priority '+t.priority;const priority=document.createElement('span');priority.textContent=priorities[t.priority];meta.append(cat,dot,priority);if(t.seriesId){const badge=document.createElement('span');badge.className='recurring-badge';badge.textContent='↻ '+repeatLabel(recurring.find(r=>r.id===t.seriesId).weekdays);meta.append(badge)}if(view!=='today'){const d=document.createElement('span');d.textContent=labelDate(t.date);meta.append(d)}if(t.notes){const detail=document.createElement('span');detail.className='subtask-summary';detail.textContent='✎ Заметки';meta.append(detail)}body.append(title,meta);const actions=document.createElement('div');actions.className='task-actions';const edit=document.createElement('button');edit.textContent='✎';edit.setAttribute('aria-label','Редактировать: '+t.title);edit.onclick=()=>openDialog(t);const del=document.createElement('button');del.textContent='×';del.setAttribute('aria-label','Удалить: '+t.title);del.onclick=()=>deleteTask(t);actions.append(edit,del);row.append(check,body,actions);$('#task-list').append(row)})}
function openDialog(task){
 const series=task?.seriesId?recurring.find(r=>r.id===task.seriesId):null;
 editId=task?.id??null;editingSeriesId=series?.id??null;
 $('#dialog-title').textContent=series?'Редактировать повторение':task?'Редактировать задачу':'Новая задача';
 $('#task-title').value=task?.title??'';$('#task-date').value=series?.startDate??task?.date??selectedDate;$('#task-priority').value=task?.priority??'normal';$('#task-category').value=task?.category??'Личное';
 draftSubtasks=(task?.subtasks??series?.subtasks??[]).map(s=>({...s}));$('#task-notes').value=series?.notes??task?.notes??'';
 $('#task-repeat').value=series?'weekly':'none';$('#series-hint').hidden=!series;
 const defaultDay=(new Date((task?.date??selectedDate)+'T12:00:00').getDay()+6)%7;
 document.querySelectorAll('#repeat-days input').forEach(c=>c.checked=series?series.weekdays.includes(Number(c.value)):Number(c.value)===defaultDay);
 updateRepeatFields();$('#task-dialog').showModal();$('#task-title').focus();
}
['#add-top','#add-small','#add-bottom'].forEach(s=>$(s).onclick=()=>openDialog());$('#close-dialog').onclick=()=>$('#task-dialog').close();$('#task-dialog').addEventListener('click',e=>{if(e.target===$('#task-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}});
$('#task-form').onsubmit=e=>{
 e.preventDefault();const title=$('#task-title').value.trim();if(!title){$('#task-title').setCustomValidity('Напиши название задачи');$('#task-title').reportValidity();return}
 const data={title,date:$('#task-date').value,priority:$('#task-priority').value,category:$('#task-category').value,notes:$('#task-notes').value.trim(),subtasks:draftSubtasks};
 const repeat=$('#task-repeat').value==='weekly';const selectedDays=[...document.querySelectorAll('#repeat-days input:checked')].map(c=>Number(c.value));
 if(repeat&&!selectedDays.length){$('#repeat-error').hidden=false;return}
 const series=recurring.find(r=>r.id===editingSeriesId);
 if(repeat){
  if(series){Object.assign(series,{title,priority:data.priority,category:data.category,startDate:data.date,weekdays:selectedDays,notes:data.notes,subtasks:data.subtasks})}
  else {const original=tasks.find(t=>t.id===editId);const completed={};if(original?.done&&selectedDays.includes((new Date(original.date+'T12:00:00').getDay()+6)%7))completed[original.date]=true;recurring.push({id:crypto.randomUUID(),title,priority:data.priority,category:data.category,startDate:data.date,weekdays:selectedDays,completed,skipped:[],notes:data.notes,subtasks:data.subtasks,subtaskCompletion:original?.date?{[original.date]:Object.fromEntries(data.subtasks.map(s=>[s.id,!!s.done]))}:{}});if(original)tasks=tasks.filter(t=>t.id!==editId)}
 }else if(series){recurring=recurring.filter(r=>r.id!==series.id);tasks.push({...data,id:crypto.randomUUID(),done:!!series.completed[data.date]})}
 else if(editId)Object.assign(tasks.find(t=>t.id===editId),data);else tasks.push({...data,id:crypto.randomUUID(),done:false});
 save();$('#task-dialog').close();render();toast(repeat?'Повторение сохранено: '+repeatLabel(selectedDays):'Задача сохранена');
};$('#task-title').oninput=()=>$('#task-title').setCustomValidity('');
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('selected',x===b));render()});document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===b));$('#crumb').textContent={today:'Мой день',week:'Эта неделя',all:'Все задачи'}[view];$('#heading').textContent={today:'Хороший день для твоих планов',week:'Неделя маленьких шагов',all:'Всё, что ты задумал'}[view];$('#tasks-heading').replaceChild(document.createTextNode({today:'Планы на сегодня ',week:'Планы на неделю ',all:'Все задачи '}[view]),$('#tasks-heading').firstChild);render()});
window.addEventListener('storage',e=>{if(e.key===storageKey){try{const data=JSON.parse(e.newValue);if(data?.tasks){tasks=data.tasks;recurring=Array.isArray(data.recurring)?data.recurring:[];$('#focus').value=data.focus??'';$('#notes').value=data.notes??'';render()}}catch{}}});

function shiftWeek(offset){const d=new Date(days[0]+'T12:00:00');d.setDate(d.getDate()+offset*7);monday=d;days=Array.from({length:7},(_,i)=>{const k=new Date(d);k.setDate(k.getDate()+i);return dateKey(k)});selectedDate=days[(new Date(selectedDate+'T12:00:00').getDay()+6)%7];render()}
function selectDay(key){selectedDate=key;view='today';document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));render()}
function renderCalendar(){
 $('#today-date').textContent=new Date().toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'});
 const range=`${labelDate(days[0])} — ${labelDate(days[6])}`;$('#calendar-range').textContent=range;$('#week-range').textContent=range;
 $('#crumb').textContent=view==='today'?(selectedDate===today?'Мой день':labelDate(selectedDate)):view==='week'?'Эта неделя':'Все задачи';
 $('#tasks-heading').firstChild.textContent=view==='today'?(selectedDate===today?'Планы на сегодня ':`Планы на ${labelDate(selectedDate)} `):view==='week'?'Планы на неделю ':'Все задачи ';
 $('#day-picker').replaceChildren();days.forEach((key,i)=>{const b=document.createElement('button');b.className='day-option'+(key===selectedDate?' chosen':'')+(key===today?' current':'');b.setAttribute('aria-label',`${weekdays[i]}, ${labelDate(key)}${key===today?', сегодня':''}`);b.setAttribute('aria-pressed',key===selectedDate);if(key===today)b.setAttribute('aria-current','date');const name=document.createElement('span');name.textContent=weekdays[i];const num=document.createElement('b');num.textContent=Number(key.slice(-2));const status=document.createElement('small');const n=allTasks().filter(t=>t.date===key).length;status.textContent=key===today?'сегодня':n?`${n} задач`:'свободно';const dots=document.createElement('i');dots.className='day-dot';dots.style.opacity=n?'1':'0';b.append(name,num,status,dots);b.onclick=()=>selectDay(key);$('#day-picker').append(b)});
}
function renderAnalytics(){
 const list=scoped(),done=list.filter(t=>t.done).length,pct=list.length?Math.round(done/list.length*100):0;
 $('#balance-period').textContent=view==='today'?labelDate(selectedDate):view==='week'?'НЕДЕЛЯ':'ВСЁ ВРЕМЯ';$('#balance-pct').textContent=pct+'%';$('#balance-donut').style.background=`conic-gradient(#8da575 0% ${pct}%,#e9eddc ${pct}% 100%)`;
 $('#balance-donut').setAttribute('role','img');$('#balance-donut').setAttribute('aria-label',`Выполнено ${done} из ${list.length} задач`);
 $('#balance-legend').replaceChildren();[['#8da575','Готово',done],['#e9eddc','В планах',list.length-done]].forEach(([color,label,n])=>{const row=document.createElement('div');const dot=document.createElement('i');dot.style.background=color;const text=document.createElement('span');text.textContent=label;const value=document.createElement('b');value.textContent=n;row.append(dot,text,value);$('#balance-legend').append(row)});
 const week=allTasks().filter(t=>days.includes(t.date));$('#category-chart').replaceChildren();[['Работа','#9faec5'],['Личное','#a2b885'],['Здоровье','#d5bb94'],['Учёба','#baa5c7']].forEach(([name,color])=>{const n=week.filter(t=>t.category===name).length;const row=document.createElement('div');row.className='category-row';const label=document.createElement('span');label.textContent=name;const track=document.createElement('div');const fill=document.createElement('i');fill.style.width=(week.length?n/week.length*100:0)+'%';fill.style.background=color;track.append(fill);const count=document.createElement('b');count.textContent=n;row.append(label,track,count);$('#category-chart').append(row)});
 const values=days.map(k=>week.filter(t=>t.date===k&&t.done).length),max=Math.max(1,...values);const svgNS='http://www.w3.org/2000/svg';const svg=document.createElementNS(svgNS,'svg');svg.setAttribute('viewBox','0 0 280 100');svg.setAttribute('role','img');svg.setAttribute('aria-label','Выполненные задачи по дням: '+values.join(', '));
 const points=values.map((v,i)=>`${10+i*43.3},${80-v/max*65}`);const area=document.createElementNS(svgNS,'polygon');area.setAttribute('points',`10,90 ${points.join(' ')} 270,90`);area.setAttribute('fill','#edf1e3');const line=document.createElementNS(svgNS,'polyline');line.setAttribute('points',points.join(' '));line.setAttribute('fill','none');line.setAttribute('stroke','#98ad7d');line.setAttribute('stroke-width','2.5');line.setAttribute('stroke-linejoin','round');svg.append(area,line);values.forEach((v,i)=>{const circle=document.createElementNS(svgNS,'circle');circle.setAttribute('cx',10+i*43.3);circle.setAttribute('cy',80-v/max*65);circle.setAttribute('r','4');circle.setAttribute('fill','#98ad7d');const title=document.createElementNS(svgNS,'title');title.textContent=`${weekdays[i]}: ${v} выполнено`;circle.append(title);svg.append(circle)});$('#activity-chart').replaceChildren(svg);const labels=document.createElement('div');labels.className='activity-labels';weekdays.forEach(w=>{const l=document.createElement('span');l.textContent=w;labels.append(l)});$('#activity-chart').append(labels);$('#activity-caption').textContent=week.length?`${values.reduce((a,b)=>a+b,0)} выполненных дел за неделю`:'Первые победы появятся здесь';
}
$('#prev-week').onclick=()=>shiftWeek(-1);$('#next-week').onclick=()=>shiftWeek(1);$('#go-today').onclick=()=>{const d=new Date();today=dateKey(d);const m=new Date(d.getFullYear(),d.getMonth(),d.getDate()-((d.getDay()+6)%7));monday=m;days=Array.from({length:7},(_,i)=>{const k=new Date(m);k.setDate(k.getDate()+i);return dateKey(k)});selectDay(today)};
function syncClock(){const current=dateKey(new Date());if(current!==today){const follow=selectedDate===today,oldToday=today;today=current;now=new Date();if(follow){selectedDate=current;if(!days.includes(current)){$('#go-today').click();return}}render()}}
setInterval(syncClock,30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncClock()});window.addEventListener('focus',syncClock);

let editingSeriesId=null,pendingDelete=null,draftSubtasks=[],detailTaskId=null;
function repeatLabel(values){return values.length===7?'Каждый день':values.map(i=>weekdays[i]).join(', ')}
function allTasks(){
 const dates=new Set(days);dates.add(selectedDate);
 recurring.forEach(r=>[...Object.keys(r.completed),...Object.keys(r.subtaskCompletion??{})].forEach(d=>dates.add(d)));
 const instances=[];
 recurring.forEach(r=>{for(const date of dates){if(date<r.startDate||r.skipped.includes(date)||!r.weekdays.includes((new Date(date+'T12:00:00').getDay()+6)%7))continue;instances.push({id:r.id+':'+date,seriesId:r.id,title:r.title,priority:r.priority,category:r.category,date,done:!!r.completed[date],notes:r.notes??'',subtasks:(r.subtasks??[]).map(s=>({...s,done:!!r.subtaskCompletion?.[date]?.[s.id]}))})}});
 return [...tasks,...instances];
}
function updateRepeatFields(){$('#repeat-days').hidden=$('#task-repeat').value!=='weekly';$('#repeat-error').hidden=true}
const repeatError=document.createElement('p');repeatError.id='repeat-error';repeatError.textContent='Выбери хотя бы один день недели';repeatError.hidden=true;repeatError.className='repeat-error';$('#repeat-days').append(repeatError);
$('#task-repeat').onchange=updateRepeatFields;
document.querySelectorAll('#repeat-days input').forEach(c=>c.onchange=()=>$('#repeat-error').hidden=true);
function deleteTask(task){if(!task.seriesId){tasks=tasks.filter(t=>t.id!==task.id);save();render();toast('Задача удалена');return}pendingDelete=task;$('#delete-description').textContent=`«${task.title}» · ${labelDate(task.date)}. Можно убрать одно повторение или всю серию вместе с её историей.`;$('#delete-dialog').showModal()}
$('#delete-cancel').onclick=()=>$('#delete-dialog').close();
$('#delete-one').onclick=()=>{const series=recurring.find(r=>r.id===pendingDelete.seriesId);series.skipped.push(pendingDelete.date);save();$('#delete-dialog').close();render();toast('Повторение на эту дату удалено')};
$('#delete-series').onclick=()=>{recurring=recurring.filter(r=>r.id!==pendingDelete.seriesId);save();$('#delete-dialog').close();render();toast('Серия удалена')};

function openDetails(id){detailTaskId=id;renderDetails();$('#detail-dialog').showModal()}
function renderDetails(){
 const task=allTasks().find(t=>t.id===detailTaskId);if(!task){$('#detail-dialog').close();return}
 $('#detail-title').textContent=task.title;$('#detail-date').textContent=labelDate(task.date)+(task.seriesId?' · ↻ '+repeatLabel(recurring.find(r=>r.id===task.seriesId).weekdays):'');

 $('#detail-note-input').value=noteText(task);
 $('#detail-save-status').textContent='Сохраняется автоматически';
 $('#detail-hint').textContent=task.seriesId?'Заметка общая для всех повторений этой задачи.':'Твоё место для программы, идей и деталей.';

}
function noteText(task){
 const text=task.notes??'';const old=task.subtasks??[];
 return text+(old.length?'\n\n'+old.map(s=>s.title).join('\n'):'');
}
$('#detail-note-input').addEventListener('input',()=>{
 const task=allTasks().find(t=>t.id===detailTaskId);if(!task)return;
 const target=task.seriesId?recurring.find(r=>r.id===task.seriesId):tasks.find(t=>t.id===task.id);
 target.notes=$('#detail-note-input').value;target.subtasks=[];
 save();render();$('#detail-save-status').textContent='Сохранено в браузере ✓';
});
$('#detail-close').onclick=()=>$('#detail-dialog').close();$('#detail-edit').onclick=()=>{const task=allTasks().find(t=>t.id===detailTaskId);$('#detail-dialog').close();if(task)openDialog(task)};
render();save();

$('#mascot-button').addEventListener('click',()=>{
 const button=$('#mascot-button');button.classList.remove('mascot-wave');void button.offsetWidth;button.classList.add('mascot-wave');
 const lines=['Одна задача за раз. Даже суперутки так делают.','Плащ на месте. План есть. Погнали!','Ты справишься. Я тут на подстраховке.'];
 $('#mascot-message').textContent=lines[Math.floor(Math.random()*lines.length)];
});
$('#mascot-button').addEventListener('animationend',e=>{if(e.animationName==='mascot-greeting')e.currentTarget.classList.remove('mascot-wave')});

const themeMedia=matchMedia('(prefers-color-scheme: dark)');
function applyTheme(theme){
 document.documentElement.dataset.theme=theme;
 const dark=theme==='dark';$('#theme-toggle').setAttribute('aria-pressed',String(dark));$('#theme-toggle').setAttribute('aria-label',dark?'Включить светлую тему':'Включить тёмную тему');$('#theme-icon').textContent=dark?'☀':'☾';$('#theme-label').textContent=dark?'Светлая тема':'Тёмная тема';document.querySelector('meta[name="theme-color"]').content=dark?'#142421':'#eaf1ed';
}
$('#theme-toggle').onclick=()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';applyTheme(theme);try{localStorage.setItem('den-theme',theme)}catch{toast('Тема изменена. Браузер не разрешил сохранить выбор.')}};
themeMedia.addEventListener('change',e=>{try{if(!localStorage.getItem('den-theme'))applyTheme(e.matches?'dark':'light')}catch{}});
window.addEventListener('storage',e=>{if(e.key==='den-theme')applyTheme(e.newValue||(themeMedia.matches?'dark':'light'))});
applyTheme(document.documentElement.dataset.theme||'light');

window.denJournal={
 snapshot(){return {tasks,recurring,focus:$('#focus').value,notes:$('#notes').value}},
 activate(key,data){
  document.querySelectorAll('dialog[open]').forEach(d=>{if(d.id!=='account-dialog')d.close()});
  storageKey=key;tasks=Array.isArray(data?.tasks)?data.tasks:[];recurring=Array.isArray(data?.recurring)?data.recurring:[];
  $('#focus').value=data?.focus??'';$('#notes').value=data?.notes??'';
  filter='all';document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('selected',b.dataset.filter==='all'));render();
 },
 cache(){localStorage.setItem(storageKey,JSON.stringify(this.snapshot()))},
 importGuest(guest){
  const known=new Set(tasks.map(t=>t.id)),seriesIds=new Set(recurring.map(r=>r.id));
  tasks.push(...(guest.tasks??[]).filter(t=>!known.has(t.id)));recurring.push(...(guest.recurring??[]).filter(r=>!seriesIds.has(r.id)));
  if(!$('#focus').value)$('#focus').value=guest.focus??'';if(!$('#notes').value)$('#notes').value=guest.notes??'';save();render();
 }
};
