'use strict';
const $ = selector => document.querySelector(selector);
const clone = value => structuredClone(value);
const palette = { background: '#f7f5ef', text: '#233b32', accent: '#285d46' };
const colors = ['#f3bf53', '#b9cdb8', '#eaa895', '#c1b8dc'];
const defaults = () => ({ theme: {...palette}, categories: colors.map((color, i) => ({id: `c${i}`, name: `Category ${i + 1}`, color})), prizes: ['Coffee on us', 'Sweet treat', 'Gift voucher', 'Mystery gift', 'Little surprise', 'Lucky bag', 'Bonus reward', 'Grand prize'].map((name, i) => ({id: `p${i}`, name, categoryId: `c${Math.floor(i / 2)}`, chance: 12.5, image: null})) });
let db, config, draft, history = [], spinning = false, ready = false, angle = 0;
let wheelOrder = [], imageCache = new WeakMap();
let imageURLs = [], settingsDirty = false, uploadsPending = 0;
const gift = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h16v11H4zM3 6h18v4H3zM12 6v15M12 6H8a2.5 2.5 0 1 1 2.5-2.5L12 6Zm0 0h4a2.5 2.5 0 1 0-2.5-2.5L12 6Z"/></svg>';
const prizeArt = {
  coffee: '<path d="M5 10h11v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Zm11 1h2a3 3 0 0 1 0 6h-2"/><path class="steam" d="M8 7c-3-3 3-3 0-6m5 6c-3-3 3-3 0-6"/>',
  treat: '<path d="m6 12 2 9h8l2-9ZM5 12h14a3 3 0 0 0-2-5 5 5 0 0 0-10 0 3 3 0 0 0-2 5ZM10 15v3m4-3v3"/>',
  voucher: '<path d="M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4ZM15 5v3m0 2v4m0 2v3M6 9h5m-5 5h4"/>',
  bag: '<path d="M5 8h14l2 13H3ZM8 8V6a4 4 0 0 1 8 0v2"/>',
  grand: '<path d="m4 8 4 4 4-8 4 8 4-4-2 12H6ZM8 23h8"/>',
  bonus: '<path d="m13 2-9 12h7l-1 8 10-13h-8Z"/>'
};
function prizeKind(prize) {
  const name = prize.name.toLowerCase();
  return /coffee|tea|drink/.test(name) ? 'coffee' : /sweet|treat|cake|food/.test(name) ? 'treat' : /voucher|ticket|coupon/.test(name) ? 'voucher' : /bag/.test(name) ? 'bag' : /grand|jackpot|trophy/.test(name) ? 'grand' : /bonus|reward/.test(name) ? 'bonus' : 'gift';
}
let audioContext, audioBus, soundEnabled = true;
function unlockSound() {
  if (!soundEnabled) return;
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioBus = audioContext.createGain(); audioBus.gain.value = .16; audioBus.connect(audioContext.destination);
    }
    audioContext.resume().catch(() => {});
  } catch { /* Sound is optional when the browser does not support audio. */ }
}
function tone(frequency, delay = 0, duration = .09) {
  if (!soundEnabled || !audioContext || audioContext.state !== 'running') return;
  const start = audioContext.currentTime + delay, osc = audioContext.createOscillator(), gain = audioContext.createGain();
  osc.type = 'sine'; osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.65, start + .008); gain.gain.exponentialRampToValueAtTime(.001, start + duration);
  osc.connect(gain); gain.connect(audioBus); osc.start(start); osc.stop(start + duration);
  osc.onended = () => { osc.disconnect(); gain.disconnect(); };
}
$('#sound-toggle').onclick = () => {
  soundEnabled = !soundEnabled;
  $('#sound-toggle').textContent = soundEnabled ? 'Sound on' : 'Sound off';
  $('#sound-toggle').setAttribute('aria-pressed', String(soundEnabled));
  if (audioBus) audioBus.gain.value = soundEnabled ? .16 : 0;
  if (soundEnabled) { unlockSound(); tone(660); }
};
function welcome() {
  $('#welcome-name').value = ''; $('#welcome-name').setCustomValidity('');
  $('#welcome-anonymous').checked = false;
  $('#welcome').showModal();
}
$('#welcome-close').onclick = () => $('#welcome').close();
$('#welcome').addEventListener('close', () => { $('#welcome-name').value = ''; });
$('#welcome-name').oninput = () => $('#welcome-name').setCustomValidity('');
$('#welcome-form').onsubmit = event => {
  event.preventDefault();
  const name = $('#welcome-name').value.trim();
  if (!name) { $('#welcome-name').setCustomValidity('Please enter your name.'); $('#welcome-name').reportValidity(); return; }
  $('#participant').value = name; $('#participant').setCustomValidity('');
  $('#anonymous').checked = $('#welcome-anonymous').checked;
  unlockSound(); tone(523, 0, .12); tone(784, .1, .18);
  $('#welcome').close(); showView('spin'); $('#wheel-spin').focus();
};
function element(tag, attrs = {}, text) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  if (text !== undefined) el.textContent = text;
  return el;
}
function announce(message) { $('#notice').textContent = message; $('#notice').hidden = !message; }
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('goodspin', 1);
    request.onupgradeneeded = () => { request.result.createObjectStore('settings'); request.result.createObjectStore('history', {keyPath:'id'}); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Database blocked'));
  });
}
function storage(store, mode, callback) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    let result;
    const request = callback(tx.objectStore(store));
    if (request) request.onsuccess = () => { result = request.result; };
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Storage transaction aborted'));
  });
}
function contrast(hex) {
  const rgb = hex.slice(1).match(/../g).map(v => parseInt(v,16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722 > .179 ? '#17271f' : '#ffffff';
}
function applyTheme(settings) {
  const style = document.documentElement.style;
  style.setProperty('--bg', settings.theme.background); style.setProperty('--ink', settings.theme.text); style.setProperty('--accent', settings.theme.accent);
  style.setProperty('--on-accent', contrast(settings.theme.accent));
  style.setProperty('--surface', `color-mix(in srgb, ${settings.theme.background} 45%, white)`);
  style.setProperty('--muted', `color-mix(in srgb, ${settings.theme.text} 78%, ${settings.theme.background})`);
  style.setProperty('--line', `color-mix(in srgb, ${settings.theme.text} 18%, ${settings.theme.background})`);
  settings.categories.forEach((c,i) => style.setProperty(`--cat${i + 1}`, c.color));
  $('meta[name="theme-color"]').content = settings.theme.background;
}
function imageURL(blob) { if (imageCache.has(blob)) return imageCache.get(blob); const url = URL.createObjectURL(blob); imageURLs.push(url); imageCache.set(blob,url); return url; }
function sortedPrizes(settings) {
  const prizes = settings.categories.flatMap(c => settings.prizes.filter(p => p.categoryId === c.id));
  return wheelOrder.length ? prizes.sort((a,b) => wheelOrder.indexOf(a.id) - wheelOrder.indexOf(b.id)) : prizes;
}
$('#shuffle-button').onclick = () => {
  if (!ready || spinning || config.prizes.length < 2) return;
  const prizes = sortedPrizes(config);
  for (let i = prizes.length - 1; i > 0; i--) {
    const j = Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296 * (i + 1));
    [prizes[i],prizes[j]] = [prizes[j],prizes[i]];
  }
  wheelOrder = prizes.map(p => p.id);
  angle = 0; $('#wheel-rotor').style.transform = 'rotate(0deg)';
  $('#result').hidden = true; renderWheel();
  $('#spin-status').textContent = 'Positions shuffled. Winning percentages stay the same.';
  unlockSound(); tone(523,0,.1); tone(784,.09,.15);
};
function thumbnail(prize, category) {
  const wrap = element('div', {class:`prize-thumbnail motion-${prizeKind(prize)}`});
  wrap.style.background = category.color; wrap.style.color = contrast(category.color);
  if (prize.image) wrap.append(element('img', {src:imageURL(prize.image), alt:prize.name})); else wrap.innerHTML = prizeArt[prizeKind(prize)] ? `<svg viewBox="0 0 24 24" aria-hidden="true">${prizeArt[prizeKind(prize)]}</svg>` : gift;
  return wrap;
}
function renderWheel() {
  const svg = $('#wheel'); svg.replaceChildren();
  const prizes = sortedPrizes(config), count = prizes.length;
  const ns = 'http://www.w3.org/2000/svg';
  function shape(tag, attrs, text) { const node = document.createElementNS(ns, tag); Object.entries(attrs).forEach(([k,v]) => node.setAttribute(k,v)); if(text !== undefined) node.textContent = text; return node; }
  const point = degrees => { const rad = (degrees - 90) * Math.PI / 180; return [300 + 299 * Math.cos(rad), 300 + 299 * Math.sin(rad)]; };
  if (!count) svg.append(shape('circle',{cx:300,cy:300,r:299,fill:'#e4e6df'}));
  prizes.forEach((p,i) => {
    const category = config.categories.find(c => c.id === p.categoryId);
    const start = i * 360 / count, end = (i + 1) * 360 / count, mid = (start + end) / 2;
    const path = count === 1 ? shape('circle',{cx:300,cy:300,r:299,fill:category.color}) : shape('path',{d:`M300,300 L${point(start).join(',')} A299,299 0 ${end-start > 180 ? 1 : 0} 1 ${point(end).join(',')} Z`,fill:category.color,stroke:'#fffdf8','stroke-width':2});
    svg.append(path);
    const rad = (mid - 90) * Math.PI / 180, x = 300 + 194 * Math.cos(rad), y = 300 + 194 * Math.sin(rad);
    const group = shape('g',{transform:`translate(${x},${y}) rotate(${mid})`});
    const fontSize = count > 16 ? 11 : count > 10 ? 14 : 17;
    if (p.image) { const size = Math.min(62, 900/count); group.append(shape('image',{href:imageURL(p.image),x:-size/2,y:-size+7,width:size,height:size,preserveAspectRatio:'xMidYMid meet'})); }
    else if (count <= 12) {
      const icon=shape('svg',{x:-17,y:-43,width:34,height:34,viewBox:'0 0 24 24',fill:'none',stroke:contrast(category.color),'stroke-width':1.5});
      icon.innerHTML=prizeArt[prizeKind(p)] || '<path d="M4 10h16v11H4zM3 6h18v4H3zM12 6v15M12 6H8a2.5 2.5 0 1 1 2.5-2.5L12 6Zm0 0h4a2.5 2.5 0 1 0-2.5-2.5L12 6Z"/>';
      group.append(icon);
    }
    group.append(shape('text',{x:0,y: p.image ? 25 : 14,'text-anchor':'middle',fill:contrast(category.color),'font-family':'DM Sans, sans-serif','font-size':fontSize,'font-weight':600},p.name.length > 17 ? `${p.name.slice(0,15)}…` : p.name));
    svg.append(group);
  });
  $('#prize-count').textContent = `${count} ${count === 1 ? 'prize' : 'prizes'} · 4 categories`;
  $('#legend').replaceChildren(...config.categories.map(c => { const item = element('span',{class:'legend-item'}); const swatch=element('i',{class:'swatch'}); swatch.style.background=c.color; item.append(swatch,document.createTextNode(c.name));return item; }));
  $('#prize-list').replaceChildren(...prizes.map(p => { const c=config.categories.find(c=>c.id===p.categoryId), row=element('div',{class:'prize-item'}), info=element('div',{class:'prize-info'}); info.append(element('strong',{},p.name),element('small',{},c.name)); row.append(thumbnail(p,c),info,element('span',{class:'odds'},`${p.chance}%`)); return row; }));
  if(!count) $('#prize-list').append(element('p',{},'No prizes yet. Add your first one in Settings.'));
  updateSpinState();
}
function updateSpinState() {
  const error = WheelLogic.validate(config.prizes);
  $('#spin-button').disabled = $('#wheel-spin').disabled = !ready || spinning || !!error;
  $('#shuffle-button').disabled = !ready || spinning || config.prizes.length < 2;
  $('#spin-status').textContent = spinning ? 'A good thing is coming…' : error || 'Ready when you are. Good luck!';
}
function renderHistory() {
  $('#history-count').textContent = history.length;
  $('#clear-history').disabled = !history.length || spinning || !ready;
  const root = $('#history-list'); root.replaceChildren();
  if (!history.length) { const empty = element('div',{class:'empty-state'}); empty.append(element('h3',{},'The first good thing is still to come.'),element('p',{},'Give the wheel a spin. Your result will appear here.')); root.append(empty);return; }
  const wrap=element('div',{class:'history-wrap'}), table=element('table',{class:'history-table'}), head=element('thead'), tr=element('tr'), body=element('tbody');
  ['Participant','Prize','Category','When'].forEach(t=>tr.append(element('th',{scope:'col'},t)));head.append(tr);
  [...history].sort((a,b)=>b.timestamp-a.timestamp).forEach(record=>{ const row=element('tr'); row.append(element('td',{class:record.anonymous?'anonymous-name':''},record.name),element('td',{},record.prizeName),element('td',{},record.categoryName),element('td',{},new Date(record.timestamp).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'})));body.append(row); });
  table.append(head,body);wrap.append(table);root.append(wrap);
}
function showView(view) {
  if(spinning) return;
  if(!['spin','settings','history'].includes(view)) view='spin';
  document.querySelectorAll('.view').forEach(el=>el.hidden=el.id!==`${view}-view`);
  document.querySelectorAll('.nav').forEach(el=>{el.classList.toggle('active',el.dataset.view===view);if(el.dataset.view===view)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
  if(view==='settings' && !draft) {draft=clone(config);renderEditor();}
  window.history.replaceState(null,'',`#${view}`);
}
function updateTotal() {
  const sum=draft.prizes.reduce((sum,p)=>sum+WheelLogic.units(p.chance || 0),0)/100;
  $('#total').textContent=`${Number.isFinite(sum) ? sum.toFixed(2).replace(/\.00$/,'') : '—'} / 100%`;
  $('#total').classList.toggle('invalid',!!WheelLogic.validate(draft.prizes));
}
function markDirty() { settingsDirty=true;$('#settings-status').textContent='Unsaved changes';updateTotal(); }
function field(label, input, className) { const wrap=element('div',{class:className || ''}); const lbl=element('label',{for:input.id},label);wrap.append(lbl,input);return wrap; }
function renderEditor() {
  const focusedId=document.activeElement.id;
  const root=$('#category-editor');root.replaceChildren();
  draft.categories.forEach(category=>{
    const block=element('section',{class:'category-block'}), header=element('div',{class:'category-header'});
    const color=element('input',{type:'color',value:category.color,'aria-label':`${category.name} color`}); color.oninput=()=>{category.color=color.value;markDirty();};
    const name=element('input',{id:`category-name-${category.id}`,type:'text',value:category.name,required:'',maxlength:40,'aria-label':'Category name'});name.oninput=()=>{category.name=name.value;document.querySelectorAll('.category-control option').forEach(option=>{if(option.value===category.id)option.textContent=name.value;});markDirty();};
    const add=element('button',{type:'button',class:'secondary'},'+ Add prize');add.onclick=()=>{draft.prizes.push({id:crypto.randomUUID(),name:'New prize',categoryId:category.id,chance:0,image:null});WheelLogic.rebalance(draft.prizes);markDirty();renderEditor();};header.append(color,name,add);block.append(header);
    draft.prizes.filter(p=>p.categoryId===category.id).forEach(prize=>{
      const row=element('div',{class:'prize-edit'}), name=element('input',{id:`name-${prize.id}`,type:'text',value:prize.name,required:'',maxlength:60});name.oninput=()=>{prize.name=name.value;markDirty();};
      const select=element('select',{id:`category-${prize.id}`});draft.categories.forEach(c=>{const option=element('option',{value:c.id},c.name);option.selected=c.id===prize.categoryId;select.append(option);});select.onchange=()=>{prize.categoryId=select.value;markDirty();renderEditor();};
      const chance=element('input',{id:`chance-${prize.id}`,type:'number',min:0,max:100,step:'.01',required:'',value:prize.chance});chance.oninput=()=>{
        if (chance.value === '' || !chance.validity.valid) { prize.chance=NaN;markDirty();return; }
        WheelLogic.rebalance(draft.prizes, prize.id, Number(chance.value));
        draft.prizes.forEach(p=>{const input=document.getElementById(`chance-${p.id}`);if(input && (p.id!==prize.id || draft.prizes.length===1))input.value=p.chance;});
        markDirty();$('#settings-status').textContent='Chances balanced to 100%. Save to apply.';
      };
      const file=element('input',{id:`image-${prize.id}`,type:'file',accept:'image/png,image/jpeg,image/webp'}), upload=field('Prize image',file,'upload-controls');
      file.onchange=async()=>{const selected=file.files[0];if(!selected)return;uploadsPending++;$('#save-settings').disabled=true;file.disabled=true;announce('');try{prize.image=await resizeImage(selected);markDirty();renderEditor();}catch(error){announce(error.message);}finally{uploadsPending--;$('#save-settings').disabled=uploadsPending>0;file.disabled=false;file.value='';}};
      if(prize.image){const remove=element('button',{class:'text-button',type:'button'},'Remove image');remove.onclick=()=>{prize.image=null;markDirty();renderEditor();};upload.append(remove);}
      const remove=element('button',{type:'button',class:'delete-prize','aria-label':`Delete ${prize.name}`},'×');remove.onclick=()=>{draft.prizes=draft.prizes.filter(p=>p.id!==prize.id);WheelLogic.rebalance(draft.prizes);markDirty();renderEditor();};
      row.append(thumbnail(prize,category),field('Prize name',name,'name-control'),field('Category',select,'category-control'),field('Chance %',chance,'chance-control'),upload,remove);block.append(row);
    });
    if(!draft.prizes.some(p=>p.categoryId===category.id))block.append(element('p',{class:'form-note'},'No prizes in this category yet.'));
    root.append(block);
  });
  $('#theme-editor').replaceChildren(...Object.entries(draft.theme).map(([key,value])=>{const input=element('input',{type:'color',id:`theme-${key}`,value});input.oninput=()=>{draft.theme[key]=input.value;markDirty();};return field(key[0].toUpperCase()+key.slice(1),input,'theme-control');}));
  updateTotal();
  if(focusedId)document.getElementById(focusedId)?.focus({preventScroll:true});
}
async function resizeImage(file) {
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Choose a PNG, JPEG, or WebP image.');
  if(file.size>10*1024*1024)throw new Error('That image is too large. Choose an image under 10 MB.');
  let bitmap;
  try{bitmap=await createImageBitmap(file);}catch{throw new Error('This image could not be read. Try another image.');}
  const scale=Math.min(1,384/Math.max(bitmap.width,bitmap.height)), canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.85));if(!blob)throw new Error('The image could not be resized. Try another image.');return blob;
}
function lockUI(lock) {
  document.querySelectorAll('nav button, [data-view], #participant, #anonymous, #clear-history').forEach(el=>el.disabled=lock);
  $('#shuffle-button').disabled=lock;
  $('#spin-button').disabled=$('#wheel-spin').disabled=lock;
  if(!lock)updateSpinState();
}
$('#wheel-spin').onclick = event => {
  if (!$('#participant').value.trim()) { event.preventDefault(); welcome(); }
};
$('#spin-form').addEventListener('submit',async event=>{
  event.preventDefault();if(spinning || !ready)return;
  const name=$('#participant').value.trim();if(!name){$('#participant').setCustomValidity('Enter your name before spinning.');$('#participant').reportValidity();return;}
  const invalid=WheelLogic.validate(config.prizes);if(invalid){announce(invalid);return;}
  unlockSound();spinning=true;lockUI(true);updateSpinState();announce('');$('#result').hidden=true;
  const prizes=sortedPrizes(config), random=crypto.getRandomValues(new Uint32Array(1))[0]/4294967296, winner=WheelLogic.selectPrize(prizes,random), category=config.categories.find(c=>c.id===winner.categoryId), anonymous=$('#anonymous').checked;
  const record={id:crypto.randomUUID(),timestamp:Date.now(),name:anonymous?'Anonymous':name,anonymous,prizeName:winner.name,categoryName:category.name};
  try{await storage('history','readwrite',store=>store.add(record));}
  catch{spinning=false;lockUI(false);announce('Your result could not be saved, so the spin did not start. Free browser storage or allow site data, then try again.');return;}
  history.push(record);renderHistory();$('#participant').value='';
  const nextAngle=WheelLogic.targetAngle(prizes.findIndex(p=>p.id===winner.id),prizes.length,angle), reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  $('.wheel-stage').scrollIntoView({behavior:reduced?'instant':'smooth',block:'center'});
  if (!reduced) { let tick=0; for(let i=0; tick<4.6; i++){tone(780-i*9,tick,.035);tick+=.065+i*.012;} }
  const animation=$('#wheel-rotor').animate([{transform:`rotate(${angle}deg)`},{transform:`rotate(${nextAngle}deg)`}],{duration:reduced?0:4800,easing:'cubic-bezier(.12,.65,.12,1)',fill:'forwards'});
  try{await animation.finished;}catch{/* A canceled animation still has its saved result. */}
  angle=nextAngle;$('#wheel-rotor').style.transform=`rotate(${angle}deg)`;animation.cancel();
  const result=$('#result');result.replaceChildren();result.append(thumbnail(winner,category));[523,659,784,1047].forEach((note,i)=>tone(note,i*.12,.3));result.append(element('p',{},anonymous?'A little luck found you!':`${record.name}, a little luck found you!`),element('h3',{},winner.name),element('p',{},`${category.name} · Saved to your history`));const again=element('button',{class:'secondary',type:'button'},'Next lucky person');again.onclick=()=>{result.hidden=true;welcome();};result.append(again);result.hidden=false;result.setAttribute('tabindex','-1');result.focus({preventScroll:true});result.scrollIntoView({behavior:reduced?'instant':'smooth',block:'center'});
  spinning=false;lockUI(false);renderHistory();$('#spin-status').textContent='Your result is saved. Who’s next?';
});
$('#participant').oninput=()=>$('#participant').setCustomValidity('');
$('#settings-form').addEventListener('submit',async event=>{
  event.preventDefault();if(!ready || uploadsPending)return;
  if(draft.categories.some(c=>!c.name.trim())){announce('Give all four categories a name.');return;}
  const error=WheelLogic.validate(draft.prizes);
  // Drafts with incomplete totals can be saved; the wheel stays disabled until valid.
  if(error && error!=='Prize chances must total exactly 100%.' && error!=='Add at least one prize before spinning.'){announce(error);return;}
  $('#save-settings').disabled=true;
  const next=clone(draft);next.categories.forEach(c=>c.name=c.name.trim());next.prizes.forEach(p=>p.name=p.name.trim());
  try{await storage('settings','readwrite',store=>store.put(next,'config'));config=next;wheelOrder=[];draft=clone(config);settingsDirty=false;imageURLs.forEach(URL.revokeObjectURL);imageURLs=[];imageCache=new WeakMap();applyTheme(config);angle=0;$('#wheel-rotor').style.transform='rotate(0deg)';$('#result').hidden=true;renderWheel();renderEditor();$('#settings-status').textContent=error?'Saved. Complete your prize chances to enable spinning.':'All changes saved on this device.';announce('');}
  catch{announce('Changes could not be saved. Free browser storage or allow site data, then try again. Your edits are still here.');}
  finally{$('#save-settings').disabled=false;}
});
document.querySelectorAll('[data-view]').forEach(button=>button.onclick=()=>showView(button.dataset.view));
$('.brand').onclick=event=>{event.preventDefault();showView('spin');};
window.addEventListener('hashchange',()=>showView(location.hash.slice(1)));
document.querySelectorAll('[data-preset]').forEach(button=>button.onclick=()=>{const presets={picnic:{theme:palette,colors},berry:{theme:{background:'#faf0f2',text:'#4b2436',accent:'#8b3155'},colors:['#efb7c5','#e1c5ef','#f3ca82','#b9d5c6']},lagoon:{theme:{background:'#f0f7f6',text:'#193e45',accent:'#126971'},colors:['#a3d6d0','#f2cf84','#aebfe2','#eab6a8']}};const preset=presets[button.dataset.preset];draft.theme={...preset.theme};draft.categories.forEach((c,i)=>c.color=preset.colors[i]);markDirty();renderEditor();});
$('#reset-theme').onclick=()=>{draft.theme={...palette};draft.categories.forEach((c,i)=>c.color=colors[i]);markDirty();renderEditor();};
$('#clear-history').onclick=async()=>{if(spinning || !history.length || !confirm('Clear all spin history on this browser? This cannot be undone.'))return;try{await storage('history','readwrite',store=>store.clear());history=[];renderHistory();announce('');}catch{announce('History could not be cleared. Try again.');}};
window.addEventListener('beforeunload',event=>{if(settingsDirty || uploadsPending){event.preventDefault();event.returnValue='';}});
async function init() {
  config=defaults();applyTheme(config);renderWheel();renderHistory();
  try{db=await openDatabase();db.onversionchange=()=>{db.close();ready=false;updateSpinState();announce('Storage changed in another tab. Reload this page to continue.');};const [saved,records]=await Promise.all([storage('settings','readonly',store=>store.get('config')),storage('history','readonly',store=>store.getAll())]);if(saved)config=saved;else await storage('settings','readwrite',store=>store.put(config,'config'));history=records;ready=true;applyTheme(config);renderWheel();renderHistory();}
  catch{announce('Browser storage is unavailable. Allow site data and reload to save settings and spin results.');$('#spin-status').textContent='Storage is required before spinning.';$('#save-settings').disabled=true;}
  showView(location.hash.slice(1)||'spin');welcome();
}
init();
