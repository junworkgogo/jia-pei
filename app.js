'use strict';
// The builder is pure so every combination can be checked without a browser.
const DEFAULTS = Object.freeze({tool:'gpt',mode:'single',doors:'remove',wardrobe:'open',density:'full',clothes:'natural',glass:'closed',style:'original',wall:'original',wood:'original',floor:'original',angle:'iso',background:'original',light:'original',project:'',confirmed:'',extra:''});
const OPTIONS = {tool:['gpt','magnific','higgsfield','other'],mode:['single','multi'],doors:['remove','keep'],wardrobe:['open','closed'],density:['full','moderate'],clothes:['natural','neutral','monochrome'],glass:['closed','original'],style:['original','modern','warm','hotel','japandi'],wall:['original','dark','light'],wood:['original','light','medium','dark'],floor:['original','wood','stone'],angle:['original','top','iso','low'],background:['original','white','gray','cream'],light:['original','soft','studio']};
function normalizeSettings(raw) {
  const result={...DEFAULTS};
  if (!raw || typeof raw!=='object' || Array.isArray(raw)) return result;
  for (const key of Object.keys(OPTIONS)) if (OPTIONS[key].includes(raw[key])) result[key]=raw[key];
  for (const [key,max] of [['project',80],['confirmed',3000],['extra',2000]]) if(typeof raw[key]==='string') result[key]=raw[key].slice(0,max);
  return result;
}
function buildPrompt(raw) {
  const s=normalizeSettings(raw);
  const ask=s.tool==='gpt';
  const multi=s.mode==='multi';
  const parts=[
    '請將這張 2D 家配圖轉成立體家配圖。先辨識建築、家具與設備的實際形體，再將製圖符號轉換成實體物件，不要把平面圖上的所有線條直接畫成立體表面的圖案。'+(ask?'':'直接輸出完成的圖片，不需要回覆文字或提問。'),
    multi?
      '【輸入範圍：多層分開】\n原圖包含多個樓層的平面圖。先依圖上的樓層標示（例如 1F、2F、3F）辨識每一層，再把每一層各自轉成一個獨立的立體家配，依原圖的排列順序與方向並排在同一張圖中，樓層之間保留清楚的留白。\n\n每一層只使用該層自己的格局與物件，不得合併、上下疊在一起、互相借用或補齊其他樓層的內容。各層使用相同的視角、比例與光線。'+(ask?'若無法分辨樓層的範圍或順序，先指出位置並請我確認。':'無法分辨的樓層範圍，依原圖的分隔與排列方式判斷，不自行合併。')
      :'【輸入範圍】\n本次只處理所附原圖中的單一樓層。'+(ask?'若圖中同時出現多個樓層、不同戶型或多張平面圖，先停止並請我提供要處理的單層圖，不要自行合併、挑選或混用格局。':'不要合併、挑選或混用其他樓層、戶型或平面圖的格局。'),
    '【房間名稱】\n原圖上的空間名稱（例如客廳、餐廳、主臥、次臥、廚房、浴室、陽台）用來判斷每個空間的用途與應有的設備，例如浴室的馬桶、洗手台與淋浴區，廚房的流理台與爐具。只轉換原圖已畫出的物件，不因空間名稱額外增加家具或設備。判讀完成後，名稱文字不出現在成品中。',
    '【格局與配置】\n保留原圖的外牆輪廓、隔間、門窗開口，以及家具的位置、尺寸、數量與朝向。不得為了美化構圖而移動、旋轉、增減物件，或改變門洞與通道寬度。'
  ];
  if(multi) parts.push('【樓層對齊】\n各樓層的外牆輪廓、樓梯、電梯、管道間與結構柱，依原圖位置上下對應；樓梯在每一層的位置、方向與梯段數保持一致，不可移位或改變走向。各層使用同一比例尺，原圖外框尺寸相同的樓層，成品中也保持相同大小。');
  if(s.project.trim()) parts.splice(1,0,'【專案名稱】\n'+s.project.trim());
  let wardrobe='【衣櫃與掛衣區】\n已確認為衣櫃、且原圖內有衣架或掛衣符號的區域，依原圖範圍建立實體木質櫃身、側板、背板、掛衣桿與衣架。';
  if(s.wardrobe==='open'){
    wardrobe+='\n\n衣櫃採敞頂俯視表現：移除衣櫃頂板，正面開放，保留具有厚度的木質櫃體邊框，讓整排衣架與衣物從上方完整可見，不被頂板或櫃門遮住。';
    wardrobe+='\n\n每個衣架上都掛有自然垂墜的衣物，沿掛衣桿成排排列。衣物需有可辨識的肩線、布料厚度、自然皺褶與前後層疊，';
    wardrobe+=s.density==='full'?'形成飽滿、連續的整排掛衣效果。不要只呈現空衣架、稀疏幾件衣服、平面線條，或改成摺疊衣物堆。':'以適中密度排列，保留少量自然間距，仍須形成可辨識的整排掛衣。不要只呈現空衣架、平面線條，或改成摺疊衣物堆。';
    if(s.clothes==='neutral') wardrobe+='衣物以米白、淺灰與大地色為主。';
    if(s.clothes==='monochrome') wardrobe+='衣物以黑、白、灰配色為主。';
  } else {
    wardrobe+='\n\n衣櫃採完整櫃體表現：保留連續、不透明的木質頂板，正面使用關閉的木質櫃門，只保留合理門縫。櫃內掛衣桿、衣架與衣物位於櫃體內部，不穿透頂板或門片展示，不額外開孔或使用透明櫃門。';
  }
  wardrobe+='\n\n衣物與衣架均限制在原有櫃體範圍內，不突出至走道、床鋪或門洞。不得改變衣櫃的位置、尺寸與朝向。\n\n平面圖中的衣架、掛衣線條與對角線僅作為判讀資訊，須轉換成實際掛衣桿、衣架與衣物，不可複製成櫃體表面裝飾。';
  parts.push(wardrobe);
  parts.push('【其他收納櫃】\n已確認為鞋櫃或其他收納櫃的區域，依原圖範圍建立實體櫃身，頂部保留連續、不透明的木質封板，正面使用關閉的木質門片，只保留合理門縫。\n\n框內 X 線與對角線均為製圖符號，不得出現在成品表面，也不得轉成 X 形裝飾或交叉木條。\n\n封板僅覆蓋櫃體本身，不延伸至走道、房間或門洞。'+(s.wardrobe==='open'?'衣櫃的敞頂規則不適用於這類收納櫃。':''));
  parts.push(s.doors==='remove'?
    '【一般建築門片】\n移除所有一般建築門片，包括入口門、房間門、一般浴室門及一般推拉門；保留原圖門洞的位置、寬度與牆體邊界，不得封住、縮小或移動開口。\n\n此要求僅適用於一般建築門，不適用於櫃門、浴室乾濕分離玻璃門、淋浴玻璃隔屏或窗戶。\n\n所有開門圓弧都只是製圖符號，不是實體，不繪製在成品中。':
    '【一般建築門片】\n保留所有一般建築門片，包括入口門、房間門、一般浴室門及一般推拉門，維持原圖的位置、尺寸、門型與數量，並將門片一律呈現為完全關閉，不保留原圖的開門角度。保留原圖門洞的位置、寬度與牆體邊界，關閉的門片對齊原有門洞，不得砌成實牆、縮小或移動開口。\n\n門片與門框須轉換為實體。所有開門圓弧都只是製圖符號，不是實體，不繪製在成品中。此設定不改變櫃門、浴室乾濕分離玻璃門、淋浴玻璃隔屏或窗戶的個別規則。');
  let glass='【浴室乾濕分離玻璃門】\n保留所有浴室乾濕分離玻璃門與淋浴玻璃隔屏，';
  glass+=s.glass==='closed'?'並將玻璃門一律呈現為完全關閉，不保留原圖的開門角度。\n\n關閉的門片對齊原有門洞與淋浴區邊界，':'玻璃門維持原圖開啟狀態與角度。\n\n門片依原圖位置與淋浴區邊界建立，';
  glass+='以薄片透明玻璃表現，保留細緻玻璃邊緣、輕微反射及必要的簡潔五金。不要做成厚重玻璃牆、粗框門或不透明門板，也不要過度染藍、染綠。\n\n保留原有門型與分片方式：推拉門維持推拉結構，鉸鏈門維持鉸鏈結構；';
  glass+=s.glass==='closed'?'只改為關閉狀態，':'維持原圖狀態，';
  glass+='不改變位置、開口寬度與淋浴區範圍，不額外增加玻璃分片。原有固定玻璃隔屏保持原位。\n\n'+(ask?'不需僅因鉸鏈側或開啟方向不清楚而詢問，也不要自行添加無法確認的鉸鏈或把手細節。若連玻璃門的位置、範圍或門型都無法確認，才先指出位置請我確認。':'不要自行添加無法確認的鉸鏈或把手細節。門型不清楚時，依原圖線條最接近的形式呈現。');
  parts.push(glass);
  parts.push('【窗戶】\n保留所有窗戶的形式、位置、尺寸及原有開啟狀態，不得移除、封閉或改成其他形式。');
  parts.push('【室外冷氣機】\n圖面上標示「AC」的位置，一律是室外冷氣機，不是室內冷氣。依原圖位置建立實體室外冷氣機；「AC」字樣只是標示，不出現在成品中。');
  parts.push('【顯示方式】\n移除屋頂以看見室內。'+(s.wardrobe==='open'?'衣櫃與掛衣區採敞頂表現，讓整排衣物完整可見；鞋櫃與其他收納櫃保留完整、不透明的木質頂板。':'衣櫃、鞋櫃與其他收納櫃均保留完整、不透明的木質頂板及關閉門片。')+'\n\n製圖輔助線、尺寸線、文字、X 記號、非實體對角線及開門圓弧均不出現在成品中；實際物件的接縫、材質分界與邊界仍須保留。');
  parts.push('【材質、配色與光線】\n地坪、牆面、家具與櫃體的顏色和材質，依原圖的著色與圖例轉換：原圖有上色時（例如木地板紋路、磁磚格線、石材色塊、家具顏色），照原圖的色系與材質呈現，並保留原圖的地坪分區；原圖為黑白線稿時，採中性、自然的材質。不額外改變風格，也不加入原圖沒有的擺飾、地毯或植栽。\n\n光線一律為白天的自然光，陰影柔和、方向一致。不出現夜景、室內燈光效果或戲劇化的光影。');
  const angles={top:'【視角】\n採垂直正上方俯視（90°），保持原圖上下左右方向，完整呈現全戶。',iso:'【視角】\n採約 45° 的斜俯視立體角度，鏡頭位於原圖下方、朝上方看，保持原圖上下左右方向與物件的相對位置，完整呈現全戶，不裁切任何物件。為了看清室內，靠近鏡頭一側的外牆以剖切方式降低高度，但不刪除或移動牆體。',low:'【視角】\n採約 30° 的低角度鳥瞰，鏡頭位於原圖下方、朝上方看，讓牆面高度與家具立面更明顯，保持原圖上下左右方向與物件的相對位置，完整呈現全戶，不裁切任何物件。靠近鏡頭一側的外牆以剖切方式降低高度，但不刪除或移動牆體。'};
  if(angles[s.angle]) parts.push(angles[s.angle]+(multi?'所有樓層使用同一視角。':''));
  const visual=[];
  const style={modern:'室內採現代簡約風格，以簡潔材質與克制配色呈現。',warm:'室內採暖木自然風格，以溫潤木質與柔和中性色呈現。',hotel:'室內採高端飯店風格，以細緻質感與沉穩配色呈現。',japandi:'室內採日式侘寂風格，以低彩度、自然肌理與簡潔材質呈現。'};
  const wall={dark:'牆體（外牆與隔間牆）統一採深色。',light:'牆體（外牆與隔間牆）統一採淺色。'};
  const wood={light:'木質櫃體統一採淺色橡木。',medium:'木質櫃體統一採溫潤中木色。',dark:'木質櫃體統一採深色胡桃木。'};
  const floor={wood:'公共區與臥室採淺木地板；廚房與浴室保留原有適用材質及分區。',stone:'公共區採淺色石材、臥室採木地板；廚房與浴室保留原有適用材質及分區。'};
    const background={white:'畫面背景採純白色。',gray:'畫面背景採淺灰色。',cream:'畫面背景採暖米白色。'};
  const light={soft:'以柔和自然光與細緻陰影表現物件體積。',studio:'以均勻棚拍光與清晰物件邊界表現，不加入實際燈具。'};
  for(const [key,map] of Object.entries({style,wall,wood,floor,background,light})) if(map[s[key]]) visual.push(map[s[key]]);
  if(visual.length) parts.push('【材質與畫面】\n'+visual.join('\n')+'\n以上只調整材質、配色與光線，不增減家具、擺飾或植栽，不改變建築與物件的位置、尺寸、數量或朝向。保留原有接縫、材質分界與區域邊界。');
  if(s.confirmed.trim())parts.push('【使用者已確認的區域資訊】\n'+s.confirmed.trim()+'\n以上已確認項目直接沿用，不必重複詢問；其他未確認區域不得據此類推。若文字與原圖或設定衝突，先指出具體位置並詢問，不自行變更格局或物件。');
  if(s.extra.trim())parts.push('【使用者補充偏好】\n'+s.extra.trim()+'\n補充偏好不覆蓋格局與物件配置規則；若與其他設定衝突，先提出具體衝突請我確認，不擅自套用。');
  parts.push(ask?'【不確定的地方】\n不要把所有 X 記號一律認定為衣櫃，也不要把不明線條一律轉成衣架或衣物。\n\n無法確認某區域是衣櫃、其他收納櫃、平台、管道間、設備或其他物件時，先指出具體位置並向我確認，再生成。已經確認過的項目直接沿用，不必重複詢問。':'【不確定的地方】\n不要把所有 X 記號一律認定為衣櫃，也不要把不明線條一律轉成衣架或衣物。\n\n無法確認用途的區域，依原圖的線條與範圍保守呈現為簡潔的實體量體，或維持空地；不要自行猜測加入衣物、設備或家具。');
  return parts.join('\n\n');
}
if(typeof document!=='undefined'){
  document.documentElement.lang='zh-Hant';
  const $=id=>document.getElementById(id);
  const form=$('settings-form');
  const storageKey='jun-plan-prompt-settings-v1';
  let state={...DEFAULTS},toastTimer;
  function notify(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4000);}
  function readForm(){return normalizeSettings(Object.fromEntries(new FormData(form)));}
  function applyToForm(s){for(const [key,value] of Object.entries(s)){const field=form.elements.namedItem(key);if(field)field.value=value;}}
  function render(){
    state=readForm();
    const open=state.wardrobe==='open';
    $('clothing-options').hidden=!open;
    // Keep remembered clothing choices in form data; the builder ignores them for closed cabinets.
    $('prompt').value=buildPrompt(state);
    $('char-count').textContent=Array.from($('prompt').value).length.toLocaleString('zh-TW')+' 字';
    $('tag-door').textContent=state.doors==='remove'?'移除門片':'門片關閉';
    $('tag-wardrobe').textContent=open?'衣櫃敞頂':'完整衣櫃';
    $('tag-glass').textContent=state.glass==='closed'?'玻璃門關閉':'玻璃門原狀';
    $('summary-door').textContent=state.doors==='remove'?'移除門片，保留門洞':'保留門片，完全關閉';
    $('summary-wardrobe').textContent=open?'敞頂展示，正面開放':'完整櫃體，關閉櫃門';
    $('summary-clothing-row').hidden=!open;
    $('summary-clothing').textContent=(state.density==='full'?'飽滿連續':'適中留白')+' · '+({natural:'自然配色',neutral:'米白與大地色',monochrome:'黑白灰'}[state.clothes]);
    $('summary-glass').textContent=state.glass==='closed'?'完全關閉':'保留原圖狀態';
    const toolName={gpt:'GPT',magnific:'Magnific',higgsfield:'Higgsfield',other:'其他'}[state.tool];
    const angleName={original:'不指定',top:'正俯視 90°',iso:'斜俯視 45°',low:'低角度 30°'}[state.angle];
    $('tag-tool').textContent=toolName;$('tag-mode').textContent=state.mode==='multi'?'多層分開':'單層一張';$('tag-angle').textContent=angleName;
    $('summary-tool').textContent=toolName+(state.tool==='gpt'?'，不確定處會先問你':'，一次出圖、不提問');
    $('summary-mode').textContent=state.mode==='multi'?'多層分開，並排輸出':'單層一張';
    $('summary-angle').textContent=angleName;
    $('multi-note').hidden=state.mode!=='multi';
    $('tool-note').textContent={gpt:'直接把原圖和咒語貼進 ChatGPT。不確定的區域，GPT 會先問你再生成。',magnific:'建議在 Magnific 的圖片生成選 Nano Banana Pro，上傳原圖當參考圖，再貼上咒語。',higgsfield:'建議在 Higgsfield 選 Image → Nano Banana Pro，使用 Image-to-Image，上傳原圖再貼上咒語。',other:'適用一次出圖的工具：上傳原圖當參考圖，再貼上咒語。咒語不會要求工具提問。'}[state.tool];
    $('usage-note').textContent=state.mode==='multi'?'多層原圖可整張上傳，各層會分開轉 3D 並排輸出。':'每次搭配一張單層平面圖；透天可改選「多層分開」。';
    $('show-demo').hidden=state.mode==='multi';
  }
  form.addEventListener('input',render);form.addEventListener('change',render);form.addEventListener('submit',e=>e.preventDefault());
  function selectTab(tab,focus=false){document.querySelectorAll('[role="tab"]').forEach(t=>{const active=t===tab;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;$(t.getAttribute('aria-controls')).hidden=!active;});if(focus)tab.focus();}
  const tabs=[...document.querySelectorAll('[role="tab"]')];
  tabs.forEach((t,i)=>{t.addEventListener('click',()=>selectTab(t));t.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=(i+1)%tabs.length;if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();selectTab(tabs[next],true);}});});
  $('save').addEventListener('click',()=>{try{localStorage.setItem(storageKey,JSON.stringify({version:1,settings:state}));$('save-note').textContent='已儲存在此瀏覽器，下次開啟將自動載入。';notify('已儲存你的設定');}catch{notify('此瀏覽器無法儲存設定，仍可複製咒語。');}});
  $('reset').addEventListener('click',()=>$('reset-dialog').showModal());
  $('cancel-reset').addEventListener('click',()=>$('reset-dialog').close());
  $('confirm-reset').addEventListener('click',()=>{applyToForm(DEFAULTS);render();$('prompt').scrollTop=0;$('reset-dialog').close();$('save-note').textContent='已恢復標準版。如要下次沿用，請按「儲存我的設定」。';notify('已恢復標準版');});
  $('view-prompt').addEventListener('click',()=>{$('prompt-dialog-note').textContent='點擊視窗外的空白處，或按 Esc 即可關閉。';$('prompt').scrollTop=0;$('prompt-dialog').showModal();});
  $('close-prompt').addEventListener('click',()=>$('prompt-dialog').close());
  let copying=false;
  async function copyPrompt(){
    if(copying)return;copying=true;
    const buttons=[$('copy'),$('copy-mobile')];buttons.forEach(b=>b.disabled=true);
    try{
      if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
      await navigator.clipboard.writeText($('prompt').value);
      notify('已複製完整咒語，可搭配平面圖使用');
    }catch{
      if(!$('prompt-dialog').open)$('prompt-dialog').showModal();$('prompt').focus();$('prompt').select();
      $('prompt-dialog-note').textContent='無法自動複製，已選取全文。請長按複製，或按 ⌘C / Ctrl+C。';
    }finally{copying=false;buttons.forEach(b=>b.disabled=false);}
  }
  $('copy').addEventListener('click',copyPrompt);
  $('copy-mobile').addEventListener('click',copyPrompt);
  $('view-preview').addEventListener('click',()=>{$('preview').focus({preventScroll:true});$('preview').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});});
  $('help').addEventListener('click',()=>$('help-dialog').showModal());
  $('show-demo').addEventListener('click',()=>{$('help-dialog').showModal();$('demo-title').scrollIntoView({block:'nearest'});});
  document.querySelectorAll('#help-dialog .close-dialog,#help-dialog .close-help').forEach(b=>b.addEventListener('click',()=>$('help-dialog').close()));
  document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{const r=d.getBoundingClientRect();if(e.target===d&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))d.close();}));
  try{const stored=JSON.parse(localStorage.getItem(storageKey)||'null');if(stored?.version===1&&stored.settings&&typeof stored.settings==='object'&&!Array.isArray(stored.settings)){state=normalizeSettings(stored.settings);$('save-note').textContent='已載入此瀏覽器先前儲存的設定。';}}catch{$('save-note').textContent='未載入儲存設定，目前使用標準版。';}
  applyToForm(state);render();
}

