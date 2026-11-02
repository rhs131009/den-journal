/* Auth and cloud storage. Guest records are never uploaded without an import click. */
(()=>{
 const el=s=>document.querySelector(s),journal=window.denJournal;
 const config=window.DEN_CONFIG??{};
 let client=null,user=null,revision=0,pending=false,busy=false,mode='login',generation=0,sessionEpoch=0,timer=null,conflict=false,initializing=false,loadPromise=null,recovering=false;
 const cacheKey=id=>'den-journal-user-'+id;
 const metaKey=id=>cacheKey(id)+'-sync';
 const empty=()=>({tasks:[],recurring:[],focus:'',notes:''});
 const read=key=>{try{return JSON.parse(localStorage.getItem(key))}catch{return null}};
 function status(text,caption){el('#sync-status').textContent=text;el('#sync-caption').textContent=caption??''}
 function message(text,error=false){el('#auth-message').textContent=text;el('#auth-message').classList.toggle('error',error)}
 function meta(){if(user)localStorage.setItem(metaKey(user.id),JSON.stringify({revision,pending}))}
 function configured(){try{return new URL(config.supabaseUrl).protocol==='https:'&&!!config.supabasePublishableKey}catch{return false}}
 function accountUI(){
  const signed=!!user;
  el('#account-setup').hidden=configured();el('#account-auth').hidden=signed||recovering;el('#account-signed-in').hidden=!signed||recovering;el('#password-form').hidden=!recovering;
  el('#account-personal-id').value=user?.id??'';el('#account-copy-id').disabled=!signed;el('#account-copy-status').textContent='';
  el('#account-button-label').textContent=signed?'Аккаунт':'Войти';el('#account-email').textContent=user?.email??'';
  el('#account-name').textContent=signed?user.email.split('@')[0]:'Личное пространство';el('#account-avatar').textContent=signed?user.email[0].toUpperCase():'Д';
  el('#account-caption').textContent=signed?'Личный аккаунт':'Гостевой режим';
  el('#account-auth').inert=!configured();el('#auth-submit').disabled=!configured();el('#auth-forgot').disabled=!configured();
 }
 function open(){message('');accountUI();el('#account-dialog').showModal()}
 el('#account-open').onclick=open;el('#account-sidebar').onclick=open;el('#account-close').onclick=()=>el('#account-dialog').close();
 document.querySelectorAll('[data-auth-mode]').forEach(b=>b.onclick=()=>{
  mode=b.dataset.authMode;document.querySelectorAll('[data-auth-mode]').forEach(x=>x.classList.toggle('selected',x===b));el('#auth-submit').textContent=mode==='signup'?'Создать аккаунт':'Войти';el('#auth-password').autocomplete=mode==='signup'?'new-password':'current-password';message('');
 });
 function saveError(){status('Сохранено на устройстве','Облако недоступно — повторим при подключении')}
 function markConflict(){conflict=true;status('Конфликт изменений','Данные на другом устройстве изменились');message('Есть изменения с другого устройства. Скачай резервную копию местных записей, затем нажми «Загрузить облачную версию».',true);el('#account-sync').textContent='Загрузить облачную версию'}
 async function pull(force=false){
  if(!user||busy||initializing||(pending&&!force))return;
  if(!force&&(document.querySelector('dialog[open]')||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)))return;
  busy=true;const epoch=sessionEpoch,gen=generation,id=user.id;
  try{const {data,error}=await client.from('journals').select('data,revision').eq('user_id',id).maybeSingle();if(error)throw error;if(epoch!==sessionEpoch||gen!==generation)return;
   if(data&&(force||data.revision!==revision)){
    if(force)backup();revision=data.revision;journal.activate(cacheKey(id),data.data);journal.cache();pending=false;conflict=false;meta();el('#account-sync').textContent='Синхронизировать';status('Синхронизировано','Записи доступны на всех устройствах');
   }
  }catch{saveError()}finally{busy=false}
 }
 function backup(){if(user)localStorage.setItem(cacheKey(user.id)+'-backup-'+Date.now(),JSON.stringify(journal.snapshot()))}
 async function flush(){
  if(!client||!user||busy||initializing||!pending||conflict)return;
  busy=true;const epoch=sessionEpoch,gen=generation,id=user.id,expected=revision,snapshot=structuredClone(journal.snapshot());status('Синхронизация…','Сохраняем изменения в аккаунте');
  try{
   const row={user_id:id,data:snapshot,revision:expected+1,updated_at:new Date().toISOString()};
   const result=expected===0?await client.from('journals').insert(row).select('revision'):await client.from('journals').update(row).eq('user_id',id).eq('revision',expected).select('revision');
   if(epoch!==sessionEpoch)return;
   if(result.error?.code==='23505'||(!result.error&&!result.data?.length)){markConflict();return}
   if(result.error)throw result.error;
   revision=result.data[0].revision;pending=generation!==gen;meta();status(pending?'Есть новые изменения':'Синхронизировано',pending?'Скоро сохраним в аккаунте':'Записи доступны на всех устройствах');
  }catch{if(epoch===sessionEpoch)saveError()}finally{busy=false;if(pending&&!conflict)timer=setTimeout(flush,4000)}
 }
 window.denCloud={schedule(){if(!user)return;generation++;pending=true;try{meta()}catch{}status('Сохранено на устройстве','Отправляем изменения в аккаунт');clearTimeout(timer);timer=setTimeout(flush,700)}};
 async function activate(next){
  if(next?.id===user?.id){user=next;accountUI();return}
  sessionEpoch++;const epoch=sessionEpoch;clearTimeout(timer);generation++;pending=false;conflict=false;revision=0;initializing=true;
  user=next;accountUI();
  if(!user){journal.activate('den-journal-v1',read('den-journal-v1')??empty());status('Гостевой режим','Данные хранятся в этом браузере');initializing=false;return}
  const id=user.id,cached=read(cacheKey(id)),stored=read(metaKey(id));revision=stored?.revision??0;pending=!!stored?.pending;
  journal.activate(cacheKey(id),cached??empty());status('Подключаем аккаунт…','Загружаем твои записи');
  try{
   const {data,error}=await client.from('journals').select('data,revision').eq('user_id',id).maybeSingle();if(error)throw error;if(epoch!==sessionEpoch)return;
   if(pending){if((data?.revision??0)!==revision)markConflict()}
   else if(data){revision=data.revision;journal.activate(cacheKey(id),data.data);journal.cache();meta()}
   else {revision=0;pending=true;meta()}
   if(!conflict)status('Аккаунт подключён',pending?'Сохраняем записи':'Записи доступны на всех устройствах');
  }catch{if(epoch===sessionEpoch){saveError();message('Не удалось загрузить облачные записи. Проверь подключение и настройку базы.',true)}}finally{if(epoch===sessionEpoch){initializing=false;if(pending&&!conflict)flush()}}
 }
 async function load(){
  if(client)return client;if(loadPromise)return loadPromise;
  loadPromise=(async()=>{
   if(!configured())throw new Error('setup');
   const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.49.1');
   client=createClient(config.supabaseUrl,config.supabasePublishableKey);
   client.auth.onAuthStateChange((event,session)=>{
    if(event==='PASSWORD_RECOVERY'){recovering=true;queueMicrotask(()=>{accountUI();el('#account-dialog').showModal()})}
    if(event==='SIGNED_OUT'){recovering=false;setTimeout(()=>activate(null),0)}
    else if(session?.user&&session.user.id!==user?.id)setTimeout(()=>activate(session.user),0);
   });
   const {data,error}=await client.auth.getSession();if(error)throw error;
   if(data.session)await activate(data.session.user);return client;
  })().catch(e=>{loadPromise=null;throw e});return loadPromise;
 }
 el('#auth-form').onsubmit=async e=>{
  e.preventDefault();el('#auth-submit').disabled=true;message('Подключаемся…');
  try{
   await load();const email=el('#auth-email').value.trim(),password=el('#auth-password').value;
   const result=mode==='signup'?await client.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}}):await client.auth.signInWithPassword({email,password});
   if(result.error)throw result.error;el('#auth-password').value='';
   if(result.data.session){await activate(result.data.user);message('Ты вошёл в аккаунт.')}
   else message('Проверь почту: для завершения регистрации нужно подтвердить адрес.');
  }catch(e){const known={'Invalid login credentials':'Неверная почта или пароль.','Email not confirmed':'Подтверди почту по ссылке из письма.','User already registered':'Такая почта уже зарегистрирована.','Email rate limit exceeded':'Слишком много писем. Подожди перед новой попыткой.'};message(known[e.message]??'Не удалось войти. Проверь подключение, почту и пароль.',true)}finally{el('#auth-submit').disabled=!configured()}
 };
 el('#auth-forgot').onclick=async()=>{
  if(!el('#auth-email').reportValidity())return;
  try{await load();const {error}=await client.auth.resetPasswordForEmail(el('#auth-email').value.trim(),{redirectTo:location.origin+location.pathname});if(error)throw error;message('Если аккаунт существует, письмо для сброса пароля придёт на почту.')}catch{message('Не удалось отправить письмо. Попробуй позже.',true)}
 };
 el('#password-form').onsubmit=async e=>{e.preventDefault();try{const {error}=await client.auth.updateUser({password:el('#new-password').value});if(error)throw error;el('#new-password').value='';recovering=false;accountUI();message('Пароль обновлён.')}catch{message('Не удалось обновить пароль. Запроси новую ссылку.',true)}};
 el('#account-sync').onclick=async()=>{if(conflict){await pull(true)}else if(pending){await flush()}else await pull(true)};
 el('#account-import').onclick=()=>{if(!user||initializing)return;const guest=read('den-journal-v1');if(guest){journal.importGuest(guest);message('Гостевые записи добавлены. Оригиналы остались в браузере.')}else message('Гостевых записей нет.')};
 el('#account-copy-id').onclick=async()=>{if(!user)return;const id=user.id;try{await navigator.clipboard.writeText(id);el('#account-copy-status').textContent='ID скопирован ✓'}catch{const field=el('#account-personal-id');field.focus();field.select();el('#account-copy-status').textContent='ID выделен — скопируй его вручную.'}};
 el('#account-export').onclick=()=>{const blob=new Blob([JSON.stringify(journal.snapshot(),null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='den-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 el('#account-logout').onclick=async()=>{if(pending||busy){message('Есть несинхронизированные изменения. Сначала синхронизируй их или скачай копию.',true);return}try{const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;recovering=false;await activate(null);message('Ты вышел из аккаунта.')}catch{message('Не удалось выйти. Попробуй ещё раз.',true)}};
 window.addEventListener('online',()=>pending?flush():pull());window.addEventListener('focus',()=>pending?flush():pull());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)(pending?flush():pull())});
 setInterval(()=>{if(!document.hidden)(pending?flush():pull())},15000);
 accountUI();if(configured())load().catch(()=>{status('Вход недоступен','Проверь соединение и настройки аккаунтов')});
})();
