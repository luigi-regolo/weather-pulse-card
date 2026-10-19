/**
 * Weather Pulse Card — Home Assistant dashboard card.
 * SPDX-License-Identifier: GPL-3.0-only.
 * No remote dependencies, telemetry, advertising or location requests.
 */
const WP_TAG = 'weather-pulse-card';
const WP_TYPE = 'custom:weather-pulse-card';
const WP_EDITOR_TAG = 'weather-pulse-card-editor';
const WP_DEFAULTS = Object.freeze({
  title: 'Meteo', eyebrow: 'WEATHER PULSE CARD', theme_mode: 'auto',
  weather_entity: '', alert_entity: '', moon_entity: '', show_hourly_chart: true, show_location: false, location_label: ''
});
function wpText(value, limit = 90) { return String(value ?? '').trim().slice(0, limit); }
function wpEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
}
function wpMoonEntity(value) {
  const id=wpText(value,160);
  return /^sensor\.[a-z0-9_]+$/.test(id)?id:'';
}
function wpAlertEntity(value) {
  const id=wpText(value,160);
  return /^(binary_sensor|sensor)\.[a-z0-9_]+$/.test(id)?id:'';
}
function wpEntity(value) {
  const id = wpText(value, 160);
  return /^weather\.[a-z0-9_]+$/.test(id) ? id : '';
}
function wpConfig(raw = {}) {
  const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return {
    // Keep Lovelace visibility and layout options during editor changes.
    ...r,
    type: WP_TYPE,
    title: wpText(r.title ?? WP_DEFAULTS.title, 60).replace(/\.+$/, '') || 'Meteo',
    eyebrow: wpText(r.eyebrow ?? WP_DEFAULTS.eyebrow, 60),
    theme_mode: ['auto', 'light', 'dark'].includes(r.theme_mode) ? r.theme_mode : 'auto',
    weather_entity: wpEntity(r.weather_entity),
    alert_entity: wpAlertEntity(r.alert_entity),
    moon_entity: wpMoonEntity(r.moon_entity),
    show_hourly_chart: r.show_hourly_chart !== false,
    show_location: r.show_location === true,
    location_label: wpText(r.location_label, 70)
  };
}
function wpKnown(entity) { return !!entity && !['unavailable', 'unknown', ''].includes(entity.state); }
function wpNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function wpTemp(value, unit = '°C') {
  const n = wpNumber(value);
  return n === null ? 'Non disponibile' : `${Math.round(n)}${unit}`;
}
function wpMetric(value, suffix = '') {
  const n = wpNumber(value);
  return n === null ? 'Non disponibile' : `${new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 }).format(n)}${suffix}`;
}
const WP_CONDITIONS = Object.freeze({
  'clear-night': ['weather-night', 'Sereno'],
  'cloudy': ['weather-cloudy', 'Nuvoloso'],
  'exceptional': ['weather-lightning', 'Condizioni eccezionali'],
  'fog': ['weather-fog', 'Nebbia'],
  'hail': ['weather-hail', 'Grandine'],
  'lightning': ['weather-lightning', 'Temporali'],
  'lightning-rainy': ['weather-lightning-rainy', 'Temporali e pioggia'],
  'partlycloudy': ['weather-partly-cloudy', 'Parzialmente nuvoloso'],
  'pouring': ['weather-pouring', 'Pioggia intensa'],
  'rainy': ['weather-rainy', 'Pioggia'],
  'snowy': ['weather-snowy', 'Neve'],
  'snowy-rainy': ['weather-snowy-rainy', 'Neve e pioggia'],
  'sunny': ['weather-sunny', 'Soleggiato'],
  'windy': ['weather-windy', 'Ventoso'],
  'windy-variant': ['weather-windy-variant', 'Ventoso e nuvoloso']
});
function wpCondition(state) { return WP_CONDITIONS[state] || ['weather-cloudy-alert', state ? wpText(state, 60) : 'Non disponibile']; }
function wpIcon(name) { return `<ha-icon icon="mdi:${name}" aria-hidden="true"></ha-icon>`; }
function wpDate(now) { return new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(now); }
function wpClock(now) { return new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' }).format(now); }


function wpDayKey(value,zone='UTC'){
  const date=new Date(value);if(!Number.isFinite(date.getTime()))return '';
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).map(x=>[x.type,x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
function wpNextDays(items,now=new Date(),zone='UTC'){
  const today=wpDayKey(now,zone),seen=new Set();
  return (Array.isArray(items)?items:[]).filter(x=>x&&typeof x.datetime==='string')
    .map(x=>({...x,day:wpDayKey(x.datetime,zone)})).filter(x=>x.day&&x.day>today)
    .sort((a,b)=>a.day.localeCompare(b.day))
    .filter(x=>{if(seen.has(x.day))return false;seen.add(x.day);return true;}).slice(0,3);
}
function wpNextHours(items,now=new Date()){
  const from=now.getTime()-35*60000,seen=new Set();
  return (Array.isArray(items)?items:[])
    .filter(x=>x&&typeof x.datetime==='string'&&Number.isFinite(Date.parse(x.datetime))&&Date.parse(x.datetime)>=from)
    .sort((a,b)=>Date.parse(a.datetime)-Date.parse(b.datetime))
    .filter(x=>{const d=Date.parse(x.datetime);if(seen.has(d))return false;seen.add(d);return true;}).slice(0,8);
}
function wpLocalLabel(datetime,config,zone){
  return new Intl.DateTimeFormat('it-IT',{...config,timeZone:zone}).format(new Date(datetime));
}
function wpDayTile(day,unit,zone){
  const [mdi]=wpCondition(day.condition),hi=wpNumber(day.temperature),lo=wpNumber(day.templow);
  return `<div class="wp-day"><span>${wpEscape(wpLocalLabel(day.datetime,{weekday:'short'},zone))}</span>
   ${wpIcon(mdi)}<div><strong>${hi===null?'—':wpEscape(wpTemp(hi,unit))}</strong>
   <small>${lo===null?'—':wpEscape(wpTemp(lo,unit))}</small></div></div>`;
}
function wpRainData(forecast, unit='') {
  if(!forecast || typeof forecast!=='object')return {probability:null,amount:null};
  const chance=wpNumber(forecast.precipitation_probability);
  const quantity=wpNumber(forecast.precipitation);
  const precipitationUnit=wpText(unit,12);
  return {
    probability:chance!==null&&chance>=0&&chance<=100?wpMetric(chance,'%'):null,
    amount:quantity!==null&&quantity>=0&&precipitationUnit?wpMetric(quantity,' '+precipitationUnit):null
  };
}

function wpRainSummary(data,unit='') {
  const rain=wpRainData(data,unit);
  const parts=[];
  if(rain.probability!==null)parts.push('Probabilità precipitazioni '+rain.probability);
  if(rain.amount!==null)parts.push('Quantità '+rain.amount);
  return parts;
}

function wpCloudCoverage(value){
  const n=wpNumber(value);
  return n!==null&&n>=0&&n<=100?wpMetric(n,'%'):null;
}
function wpHoursHTML(hours,unit,zone,showChart=true,precipitationUnit=''){
  if(!hours.length)return '<div class="wp-empty">Previsioni orarie non disponibili.</div>';
  const valid=hours.map(x=>wpNumber(x.temperature)).filter(v=>v!==null);
  let graph='';
  if(showChart&&valid.length>=2){
    const min=Math.min(...valid),range=Math.max(1,Math.max(...valid)-min);
    const points=hours.map((x,i)=>{const t=wpNumber(x.temperature);return t===null?null:[31+i*62,56-35*(t-min)/range]});
    const segments=[];let current=[];
    for(const point of points){if(point)current.push(point.map(v=>v.toFixed(2)).join(','));else{if(current.length>1)segments.push(current);current=[];}}
    if(current.length>1)segments.push(current);
    graph=`<svg class="wp-hour-chart" viewBox="0 0 496 70" role="img" aria-label="Andamento delle temperature">
       ${segments.map(s=>`<polyline fill="none" stroke="var(--wp-accent)" stroke-width="2.5" points="${s.join(' ')}"/>`).join('')}
       ${points.filter(Boolean).map(p=>`<circle cx="${p[0].toFixed(2)}" cy="${p[1].toFixed(2)}" r="3" fill="var(--wp-accent)"/>`).join('')}</svg>`;
  }
  return `<div class="wp-hour-scroll"><div class="wp-hour-grid">${hours.map(x=>{
    const [mdi]=wpCondition(x.condition),temp=wpNumber(x.temperature),rain=wpRainData(x,precipitationUnit),cloud=wpCloudCoverage(x.cloud_coverage);
    return `<div class="wp-hour"><span>${wpEscape(wpLocalLabel(x.datetime,{hour:'2-digit',minute:'2-digit'},zone))}</span>
       ${wpIcon(mdi)}<strong>${temp===null?'—':wpEscape(wpTemp(temp,unit))}</strong>
       ${rain.probability===null?'':`<small class="wp-hour-rain" title="Probabilità precipitazioni">${wpEscape(rain.probability)}</small>`}
       ${rain.amount===null?'':`<small class="wp-hour-rain" title="Quantità precipitazioni">${wpEscape(rain.amount)}</small>`}
       ${cloud===null?'':`<small class="wp-hour-cloud" title="Copertura nuvolosa"><span>Nuvole</span><span>${wpEscape(cloud)}</span></small>`}</div>`;
  }).join('')}</div>${graph}</div>`;
}

function wpSolarDay(now,zone,latitude,longitude,sunEntity) {
  const key=wpDayKey(now,zone),p=key.split('-').map(Number);
  if(p.length!==3||p.some(v=>!Number.isInteger(v)))return {rise:null,set:null,progress:null,duration:null};
  const base=Date.UTC(p[0],p[1]-1,p[2]),lat=wpNumber(latitude),lon=wpNumber(longitude);
  let rise=null,set=null;
  if(lat!==null&&lon!==null&&lat>=-90&&lat<=90&&lon>=-180&&lon<=180){
    const rad=Math.PI/180,phi=lat*rad,day=(base-Date.UTC(p[0],0,1))/86400000+1;
    function calculate(kind){
      let minutes=kind==='rise'?360:1080;
      for(let i=0;i<4;i++){
        const g=2*Math.PI/365*(day-1+(minutes/60-12)/24);
        const eq=229.18*(.000075+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g));
        const dec=.006918-.399912*Math.cos(g)+.070257*Math.sin(g)-.006758*Math.cos(2*g)+.000907*Math.sin(2*g)-.002697*Math.cos(3*g)+.00148*Math.sin(3*g);
        const cosH=(Math.cos(90.833*rad)/(Math.cos(phi)*Math.cos(dec)))-Math.tan(phi)*Math.tan(dec);
        if(!Number.isFinite(cosH)||cosH>1||cosH< -1)return null;
        const hourAngle=Math.acos(cosH)/rad;
        minutes=720-4*(lon+(kind==='rise'?hourAngle:-hourAngle))-eq;
      }
      const date=new Date(base+minutes*60000);
      return wpDayKey(date,zone)===key?date:null;
    }
    rise=calculate('rise');set=calculate('set');
  }
  // sun.sun exposes the next events only. Use HA's precise timestamps when
  // they refer to today; otherwise retain the local computation for past events.
  const attrs=wpKnown(sunEntity)?sunEntity.attributes||{}:{};
  for(const [kind,attribute] of [['rise','next_rising'],['set','next_setting']]){
    const stamp=attrs[attribute],date=typeof stamp==='string'?new Date(stamp):null;
    if(!date||!Number.isFinite(date.getTime())||wpDayKey(date,zone)!==key)continue;
    if(kind==='rise')rise=date;else set=date;
  }
  if(!rise||!set||rise.getTime()>=set.getTime())return {rise:null,set:null,progress:null,duration:null};
  const elapsed=(now.getTime()-rise.getTime())/(set.getTime()-rise.getTime());
  return {rise,set,progress:Math.max(0,Math.min(1,elapsed)),duration:Math.round((set.getTime()-rise.getTime())/60000)};
}

function wpSolarTime(event,zone){
  return event?wpEscape(wpLocalLabel(event,{hour:'2-digit',minute:'2-digit'},zone)):'Non disponibile';
}

function wpSolarDuration(minutes){
  if(!Number.isFinite(minutes))return 'Non disponibile';
  const hrs=Math.floor(minutes/60),mins=minutes%60;
  return `${hrs} h ${String(mins).padStart(2,'0')} min`;
}

function wpSolarCards(sun,zone){
  return `<div class="wp-sun-cards">
    <div class="wp-sun-card"><span class="wp-sun-orb">${wpIcon('weather-sunset-up')}</span>
      <div><span class="wp-sun-label">Alba</span><strong>${wpSolarTime(sun.rise,zone)}</strong></div></div>
    <div class="wp-sun-card"><span class="wp-sun-orb">${wpIcon('weather-sunset-down')}</span>
      <div><span class="wp-sun-label">Tramonto</span><strong>${wpSolarTime(sun.set,zone)}</strong></div></div>
  </div>`;
}

function wpSolarArc(sun,zone){
  if(!sun.rise||!sun.set)return '<div class="wp-empty">Dati solari non disponibili.</div>';
  const t=sun.progress,x=(20+260*t).toFixed(2),y=(100-240*t*(1-t)).toFixed(2);
  return `<div class="wp-solar-detail">
    <svg class="wp-solar-svg" viewBox="0 0 300 115" role="img" aria-label="Avanzamento della giornata tra alba e tramonto">
      <path d="M 20 100 Q 150 -20 280 100" fill="none" stroke="var(--wp-line)" stroke-width="3" stroke-linecap="round"/>
      <line x1="20" y1="100" x2="280" y2="100" stroke="var(--wp-line)" stroke-width="1"/>
      <circle cx="${x}" cy="${y}" r="8" fill="var(--wp-accent)"/>
    </svg>
    <div class="wp-sun-times"><span>${wpIcon('weather-sunset-up')} ${wpSolarTime(sun.rise,zone)}</span>
      <span>${wpIcon('weather-sunset-down')} ${wpSolarTime(sun.set,zone)}</span></div>
    <div class="wp-solar-duration">Durata del giorno · <strong>${wpEscape(wpSolarDuration(sun.duration))}</strong></div>
  </div>`;
}

function wpAlertLevel(value) {
  const key=wpText(value,40).toLowerCase();
  if(['red','severe','extreme','critical','danger'].includes(key))return 'red';
  if(['orange','moderate'].includes(key))return 'orange';
  if(['yellow','minor','warning','watch','advisory'].includes(key))return 'yellow';
  return 'unspecified';
}

function wpAlertDate(raw) {
  if(typeof raw!=='string' || !raw.trim())return null;
  const value=new Date(raw);
  return Number.isFinite(value.getTime())?value:null;
}

function wpAlertItems(raw,now=new Date()) {
  if(!Array.isArray(raw))return [];
  const result=[];
  for(const item of raw.slice(0,30)) {
    if(!item || typeof item!=='object'||Array.isArray(item))continue;
    const starts=wpAlertDate(item.onset||item.start||item.starts);
    const ends=wpAlertDate(item.expires||item.end||item.ends);
    if(starts&&starts.getTime()>now.getTime())continue;
    if(ends&&ends.getTime()<=now.getTime())continue;
    const title=wpText(item.headline||item.title||item.event||item.name,140)||'Allerta meteorologica';
    const detail=wpText(item.description||item.message||item.instruction,650);
    result.push({title,detail,level:wpAlertLevel(item.severity||item.level),starts,ends});
    if(result.length>=6)break;
  }
  return result;
}

function wpAlertData(entity,now=new Date()) {
  const unknown={status:'unknown',level:'unspecified',title:'Allerte non verificabili',detail:'',items:[],source:'',starts:null,ends:null};
  if(!wpKnown(entity))return unknown;
  const state=wpText(entity.state,50).toLowerCase();
  const attrs=entity.attributes&&typeof entity.attributes==='object'?entity.attributes:{};
  const source=wpText(attrs.attribution||attrs.source||attrs.friendly_name,140);
  const rootStarts=wpAlertDate(attrs.onset||attrs.start||attrs.starts);
  const rootEnds=wpAlertDate(attrs.expires||attrs.end||attrs.ends);
  const rawItems=Array.isArray(attrs.alerts)?attrs.alerts:null;
  const items=wpAlertItems(rawItems,now);
  const domain=wpText(entity.entity_id).split('.')[0];
  const clear=attrs.active===false || (domain==='binary_sensor'&&state==='off') ||
    ['green','normal','clear','none','no alerts','no_alerts','off','false','ok','safe','0'].includes(state);
  const active=attrs.active===true || (domain==='binary_sensor'&&state==='on') ||
    ['red','orange','yellow','warning','watch','alert','active','on','severe','extreme','moderate','minor'].includes(state) ||
    items.length>0;
  const base={...unknown,source};
  if(clear)return {...base,status:'clear',title:'Nessuna allerta segnalata dalla sorgente configurata'};
  // Do not show an active banner for alerts outside a known validity window.
  if((rootStarts&&rootStarts.getTime()>now.getTime())||(rootEnds&&rootEnds.getTime()<=now.getTime()))return base;
  if(rawItems?.length && !items.length)return base;
  if(!active)return base;
  const scores={unspecified:0,yellow:1,orange:2,red:3};
  let level=wpAlertLevel(attrs.severity||attrs.level||state);
  for(const item of items)if(scores[item.level]>scores[level])level=item.level;
  return {...base,status:'active',level,items,
    title:wpText(attrs.headline||attrs.title||attrs.event,140)||items[0]?.title||'Allerta meteorologica',
    detail:wpText(attrs.description||attrs.message,650),starts:rootStarts,ends:rootEnds};
}

function wpAlertBanner(alert) {
  if(alert.status!=='active')return '';
  const kind=alert.level;
  const labels={yellow:'Gialla',orange:'Arancione',red:'Rossa',unspecified:''};
  const label=labels[kind]?`Allerta meteo ${labels[kind].toLowerCase()}`:'Allerta meteo';
  const extra=alert.items.length>1?` · ${alert.items.length} segnalazioni`:'';
  return `<button type="button" class="wp-alert wp-alert-${kind}" data-open="1"
    aria-label="Apri dettagli allerta meteorologica">${wpIcon('alert-outline')}
    <span><strong>${wpEscape(label)}</strong>
    <small>${wpEscape(alert.title+extra)}</small></span>${wpIcon('chevron-right')}</button>`;
}

function wpAlertTime(date,zone) {
  if(!date)return '';
  return new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:zone}).format(date);
}

function wpAlertDetails(alert,zone) {
  if(alert.status==='clear')return '<div class="wp-alert-note">Nessuna allerta segnalata dall’entità configurata. Verificare sempre le comunicazioni delle autorità competenti.</div>';
  if(alert.status!=='active')return '<div class="wp-alert-note">Stato delle allerte non disponibile o non verificabile. Consultare i canali ufficiali.</div>';
  const level={yellow:'Gialla',orange:'Arancione',red:'Rossa',unspecified:'Non specificata'}[alert.level];
  const safe=(value)=>wpEscape(value);
  const metadata=`<div class="wp-alert-meta">Gravità: ${safe(level)}${alert.source?' · Fonte: '+safe(alert.source):''}</div>`;
  const windowText=alert.starts||alert.ends?
    `<div class="wp-alert-meta">${alert.starts?'Inizio: '+safe(wpAlertTime(alert.starts,zone)):''}${alert.starts&&alert.ends?' · ':''}${alert.ends?'Fine: '+safe(wpAlertTime(alert.ends,zone)):''}</div>`:'';
  const details=alert.items.length?alert.items.map(item=>{
    const dates=item.starts||item.ends?
      `<div class="wp-alert-meta">${item.starts?'Da '+safe(wpAlertTime(item.starts,zone)):''}${item.starts&&item.ends?' · ':''}${item.ends?'a '+safe(wpAlertTime(item.ends,zone)):''}</div>`:'';
    return `<div class="wp-alert-entry"><strong>${safe(item.title)}</strong>
      ${item.detail?`<div class="wp-alert-description">${safe(item.detail)}</div>`:''}${dates}</div>`;
  }).join(''):`<div class="wp-alert-entry"><strong>${safe(alert.title)}</strong>
    <div class="wp-alert-description">${safe(alert.detail||'Segnalazione attiva nell’entità selezionata.')}</div></div>`;
  return `<div class="wp-alert-detail">${metadata}${windowText}${details}
    <div class="wp-alert-disclaimer">Per informazioni operative e aggiornamenti consultare gli avvisi delle autorità competenti.</div></div>`;
}

const WP_MOON_PHASES = Object.freeze({"new_moon":["moon-new","Luna nuova"],"waxing_crescent":["moon-waxing-crescent","Luna crescente"],"first_quarter":["moon-first-quarter","Primo quarto"],"waxing_gibbous":["moon-waxing-gibbous","Gibbosa crescente"],"full_moon":["moon-full","Luna piena"],"waning_gibbous":["moon-waning-gibbous","Gibbosa calante"],"last_quarter":["moon-last-quarter","Ultimo quarto"],"waning_crescent":["moon-waning-crescent","Luna calante"]});
function wpMoonData(entity) {
  const phase=wpKnown(entity)?wpText(entity.state,45).toLowerCase().replace(/[\s-]+/g,'_'):'';
  const found=Object.prototype.hasOwnProperty.call(WP_MOON_PHASES,phase)?WP_MOON_PHASES[phase]:null;
  return found?{icon:found[0],label:found[1],known:true}:{icon:'weather-night',label:'Fase lunare non disponibile',known:false};
}
function wpMoonDetails(entity) {
  const data=wpMoonData(entity);
  return `<div class="wp-moon"><span class="wp-moon-icon">${wpIcon(data.icon)}</span>
    <div><strong>Fase lunare</strong><div class="wp-moon-label">${wpEscape(data.label)}</div></div></div>`;
}

const WP_CSS = `
:host{display:block;box-sizing:border-box;width:100%;max-width:100%;min-width:0;font-family:var(--ha-font-family-body,Roboto,Arial,sans-serif);color:var(--wp-fg);font-size:var(--ha-font-size-m,14px)}
*,*:before,*:after{box-sizing:border-box}
.wp-container{display:block;width:100%;max-width:100%;min-width:0;container-type:inline-size}
.wp-shell{--wp-accent:#0a7156;--wp-bg:#fafbf9;--wp-tile:#f0f2ef;--wp-circle:#fff;--wp-line:#e0e5df;--wp-fg:#18221c;--wp-muted:#56675c;background:var(--wp-bg);color:var(--wp-fg);border:1px solid var(--wp-line);border-radius:26px;padding:18px;width:100%;max-width:100%;min-width:0}
.wp-backdrop{--wp-accent:#0a7156;--wp-bg:#fafbf9;--wp-tile:#f0f2ef;--wp-circle:#fff;--wp-line:#e0e5df;--wp-fg:#18221c;--wp-muted:#56675c}
.wp-shell.wp-dark,.wp-backdrop.wp-dark{--wp-accent:#0e795d;--wp-bg:#101211;--wp-tile:#191c1a;--wp-circle:#282b29;--wp-line:#2b302c;--wp-fg:#f5f7f4;--wp-muted:#bbc5bd}
.wp-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin:2px 4px 17px}
.wp-eyebrow{font-size:10px;letter-spacing:1.7px;font-weight:750;color:var(--wp-muted);margin-bottom:7px}
.wp-title{font-size:25px;line-height:1.14;font-weight:780;letter-spacing:-.7px;overflow-wrap:anywhere}
.wp-title b{color:var(--wp-accent);font-weight:800}
.wp-datetime{text-align:right;color:var(--wp-muted);white-space:nowrap;font-size:11px;line-height:1.5}
.wp-clock{font-size:21px;font-weight:600;color:var(--wp-fg);font-variant-numeric:tabular-nums}
.wp-panel{background:var(--wp-tile);border:1px solid var(--wp-line);border-radius:24px;padding:13px;min-width:0}
.wp-current{display:flex;align-items:center;gap:12px}
.wp-orb{display:grid;place-items:center;flex:none;width:52px;height:52px;border-radius:50%;background:var(--wp-circle)}
.wp-orb ha-icon{--mdc-icon-size:31px;width:31px;height:31px}
.wp-main{min-width:0;flex:1}.wp-temp{font-size:29px;font-weight:650;line-height:1.15;letter-spacing:-.7px}
.wp-condition{font-size:14px;font-weight:600;line-height:1.3;margin-top:3px;overflow-wrap:anywhere}
.wp-sub{font-size:11.5px;line-height:1.4;color:var(--wp-muted);margin-top:3px}
.wp-location{display:inline-flex;gap:4px;align-items:center;color:var(--wp-muted);font-size:11px;margin-top:7px}
.wp-location ha-icon{--mdc-icon-size:14px;width:14px;height:14px}
.wp-detail{display:inline-flex;align-items:center;justify-content:center;vertical-align:top;gap:5px;border:0;border-radius:999px;color:#fff;background:var(--wp-accent);padding:5px 9px;margin:12px 0 0;font-family:inherit;font-size:11px;font-weight:650;line-height:1.2;cursor:pointer;white-space:nowrap}
.wp-detail ha-icon{display:block;flex:none;margin:0;--mdc-icon-size:14px;width:14px;height:14px;color:inherit}
button{font:inherit;cursor:pointer}button:focus-visible{outline:2px solid var(--wp-accent);outline-offset:3px}
.wp-empty{color:var(--wp-muted);font-size:12px;line-height:1.45}
.wp-backdrop{position:fixed;inset:0;z-index:9999;background:#0009;display:grid;place-items:center;overflow:hidden;padding:max(24px,env(safe-area-inset-top)) 24px max(24px,env(safe-area-inset-bottom))}
.wp-dialog{background:var(--wp-bg);color:var(--wp-fg);border:1px solid var(--wp-line);border-radius:24px;box-shadow:0 18px 60px #0005;padding:18px;width:min(350px,100%);max-width:100%;min-width:0;max-height:min(68vh,560px);max-height:min(68dvh,560px);overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;font-family:inherit;font-size:inherit}
.wp-dialog-head{display:flex;align-items:center;gap:10px;min-height:38px;margin-bottom:10px;position:sticky;top:0;z-index:1;background:var(--wp-bg)}
.wp-dialog-head strong{flex:1;font-size:17px;font-weight:600;line-height:1.3}
.wp-close{display:flex;align-items:center;justify-content:center;line-height:0;margin:0;padding:0;width:36px;height:36px;flex:none;border:0;border-radius:50%;background:var(--wp-tile);color:var(--wp-fg)}
.wp-close ha-icon{display:block;flex:none;margin:0;--mdc-icon-size:18px;width:18px;height:18px}
.wp-metric{display:flex;justify-content:space-between;align-items:center;gap:12px;background:var(--wp-tile);border:1px solid var(--wp-line);padding:12px 14px;border-radius:14px;margin-top:8px}
.wp-metric span{color:var(--wp-muted);font-size:12px}
.wp-metric strong{font-size:13px;font-weight:600}

.wp-forecast-heading{margin:17px 4px 10px;color:var(--wp-muted);font-size:10px;letter-spacing:1.3px;font-weight:600}
.wp-days{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.wp-day{display:flex;flex-direction:column;align-items:center;gap:7px;min-width:0;padding:10px 4px;border-radius:16px;border:1px solid var(--wp-line);background:var(--wp-circle);font-size:11px}
.wp-day>span{color:var(--wp-muted)}.wp-day ha-icon{--mdc-icon-size:24px;width:24px;height:24px}
.wp-day strong{font-size:12px;font-weight:600}.wp-day small{font-size:11px;color:var(--wp-muted);margin-left:5px}
.wp-forecast-note{color:var(--wp-muted);font-size:11px;line-height:1.45}
.wp-detail-heading{font-weight:600;font-size:13px;margin:17px 0 10px}
.wp-hour-scroll{overflow-x:auto;max-width:100%;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;padding:8px 0 12px}
.wp-hour-grid{display:grid;grid-template-columns:repeat(8,62px);width:496px}
.wp-hour{display:flex;flex-direction:column;align-items:center;gap:8px;font-size:11px}
.wp-hour>span,.wp-hour>small{color:var(--wp-muted);font-size:10px}
.wp-hour ha-icon{--mdc-icon-size:23px;width:23px;height:23px}.wp-hour strong{font-size:12px;font-weight:600}.wp-hour-rain{line-height:1.1;text-align:center;white-space:nowrap}.wp-hour-cloud{display:flex;flex-direction:column;align-items:center;gap:1px;line-height:1.2;white-space:nowrap}
.wp-hour-chart{display:block;width:496px;height:70px}
.wp-daily-detail{background:var(--wp-tile);border-radius:13px;margin-top:7px;padding:11px 13px}
.wp-daily-detail strong{font-size:12px;font-weight:600}.wp-daily-detail .wp-sub{margin-top:5px}

.wp-sun-heading{color:var(--wp-muted);font-size:10px;font-weight:600;letter-spacing:1.3px;margin:17px 4px 10px}
.wp-sun-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.wp-sun-card{display:flex;gap:10px;align-items:center;min-width:0;background:var(--wp-circle);border:1px solid var(--wp-line);padding:9px;border-radius:16px}
.wp-sun-orb{display:grid;place-items:center;flex:none;width:35px;height:35px;background:var(--wp-tile);border-radius:50%}
.wp-sun-orb ha-icon{width:20px;height:20px;--mdc-icon-size:20px;color:var(--wp-fg)}
.wp-sun-card>div{display:flex;flex-direction:column;gap:4px;min-width:0}
.wp-sun-label{font-size:11px;color:var(--wp-muted)}
.wp-sun-card strong{font-size:12px;font-weight:600;white-space:nowrap}
.wp-solar-detail{background:var(--wp-tile);border:1px solid var(--wp-line);border-radius:17px;padding:10px 14px}
.wp-solar-svg{width:100%;height:122px;display:block}
.wp-sun-times{display:flex;align-items:center;justify-content:space-between;gap:14px;font-size:12px;font-weight:600}
.wp-sun-times span{display:flex;align-items:center;gap:5px}
.wp-sun-times ha-icon{width:16px;height:16px;--mdc-icon-size:16px}
.wp-solar-duration{text-align:center;margin-top:14px;color:var(--wp-muted);font-size:11px}
.wp-solar-duration strong{color:var(--wp-fg)}
@media(max-width:330px){.wp-sun-card{padding:7px;gap:6px}.wp-sun-orb{width:29px;height:29px}.wp-sun-card strong{font-size:11px}}

.wp-alert{--wp-alert-border:#d3bd63;--wp-alert-bg:#f9f3de;--wp-alert-fg:#5f4a10;display:flex;align-items:center;text-align:left;width:100%;gap:10px;margin-top:12px;padding:11px 12px;border-radius:16px;border:1px solid var(--wp-alert-border);background:var(--wp-alert-bg);color:var(--wp-alert-fg);font:inherit;cursor:pointer}
.wp-alert-orange{--wp-alert-border:#d6a06b;--wp-alert-bg:#f9e8d6;--wp-alert-fg:#884b0f}
.wp-alert-red{--wp-alert-border:#cf8d8c;--wp-alert-bg:#fae5e3;--wp-alert-fg:#923330}
.wp-alert-unspecified{--wp-alert-border:var(--wp-line);--wp-alert-bg:var(--wp-tile);--wp-alert-fg:var(--wp-fg)}
.wp-dark .wp-alert-yellow,.wp-dark .wp-alert-unspecified{--wp-alert-border:#816e31;--wp-alert-bg:#302b1b;--wp-alert-fg:#f1d78b}
.wp-dark .wp-alert-orange{--wp-alert-border:#995b24;--wp-alert-bg:#392618;--wp-alert-fg:#ffd49a}
.wp-dark .wp-alert-red{--wp-alert-border:#9c4844;--wp-alert-bg:#3d2221;--wp-alert-fg:#ffb7b0}
.wp-alert>ha-icon:first-child{flex:none;--mdc-icon-size:23px;width:23px;height:23px;color:currentColor}
.wp-alert>ha-icon:last-child{flex:none;margin-left:auto;--mdc-icon-size:16px;width:16px;height:16px;color:currentColor}
.wp-alert>span{min-width:0;display:flex;flex-direction:column;gap:4px}
.wp-alert strong{font-size:12px;font-weight:600;line-height:1.3}
.wp-alert small{font-size:11px;line-height:1.35;overflow-wrap:anywhere}
.wp-alert-note{background:var(--wp-tile);border-radius:14px;padding:11px 13px;font-size:12px;color:var(--wp-muted);line-height:1.5}
.wp-alert-detail{font-size:12px;line-height:1.5}
.wp-alert-meta{color:var(--wp-muted);font-size:11px;line-height:1.5;margin-bottom:6px}
.wp-alert-entry{background:var(--wp-tile);border:1px solid var(--wp-line);border-radius:14px;padding:12px;margin-top:9px;overflow-wrap:anywhere}
.wp-alert-entry strong{font-size:12px}
.wp-alert-description{margin-top:7px;white-space:pre-line;overflow-wrap:anywhere}
.wp-alert-disclaimer{margin-top:14px;font-size:11px;line-height:1.45;color:var(--wp-muted)}
.wp-editor-alert{margin:21px 0 12px;padding-top:14px;border-top:1px solid var(--divider-color)}
.wp-editor-alert strong{font-size:13px}
.wp-clear-alert{margin-top:8px;background:var(--secondary-background-color);border:1px solid var(--divider-color);border-radius:10px;padding:8px 12px;color:var(--primary-text-color);font:inherit;cursor:pointer}

.wp-moon{display:flex;align-items:center;gap:12px;border:1px solid var(--wp-line);background:var(--wp-tile);padding:12px 14px;border-radius:16px;margin-top:9px}
.wp-moon-icon{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:var(--wp-circle);flex:none}
.wp-moon-icon ha-icon{--mdc-icon-size:24px;width:24px;height:24px}
.wp-moon strong{font-size:12px;font-weight:600}.wp-moon-label{color:var(--wp-muted);font-size:11px;margin-top:4px}
@media(max-width:420px){.wp-shell{padding:13px;border-radius:23px}.wp-title{font-size:23px}.wp-head{gap:7px}.wp-datetime{font-size:10px}.wp-clock{font-size:19px}.wp-orb{width:43px;height:43px}.wp-temp{font-size:25px}.wp-panel{padding:10px}}
@container (max-width:380px){.wp-shell{padding:13px;border-radius:23px}.wp-title{font-size:23px}.wp-head{gap:7px}.wp-datetime{font-size:10px}.wp-clock{font-size:19px}.wp-orb{width:43px;height:43px}.wp-temp{font-size:25px}.wp-panel{padding:10px}}
@container (max-width:310px){.wp-shell{padding:10px}.wp-head{margin:2px 0 12px}.wp-title{font-size:21px}.wp-eyebrow{font-size:9px}.wp-current{gap:8px}.wp-orb{width:37px;height:37px}.wp-orb ha-icon{--mdc-icon-size:25px;width:25px;height:25px}.wp-days{gap:5px}.wp-day{padding:8px 2px;gap:5px}.wp-sun-cards{grid-template-columns:1fr}.wp-sun-card{padding:8px}.wp-panel{padding:8px}.wp-detail{white-space:normal}}
@media(prefers-reduced-motion:reduce){.wp-detail{transition:none}}
`;

class WeatherPulseCard extends HTMLElement {
  static getStubConfig() { return wpConfig(); }
  static getConfigElement() { return document.createElement(WP_EDITOR_TAG); }
  constructor() {
    super();
    this.attachShadow({mode:'open'});
    this._config = wpConfig();
    this._hass = null;
    this._open = false;
    this._clockTimer = null;
    this._lastSignature = '';
    this._forecast = {daily:null,hourly:null};
    this._forecastState = {daily:'idle',hourly:'idle'};
    this._forecastUnsubscribe = [];
    this._forecastConnection = null;
    this._forecastId = '';
    this._forecastVersion = 0;
    this._media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    this._onAppearance = () => { this._lastSignature=''; this._paint(); };
    this.shadowRoot.addEventListener('click', e => {
      if (e.target?.dataset?.backdrop === '1' || e.target.closest('[data-close]')) { this._open=false; this._lastSignature=''; this._paint(); return; }
      if (e.target.closest('[data-open]')) { this._open=true; this._lastSignature=''; this._paint(); }
    });
    this.shadowRoot.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this._open) { this._open=false; this._lastSignature=''; this._paint(); }
    });
  }
  connectedCallback() {
    this._media?.addEventListener?.('change', this._onAppearance);
    this._clockTimer = window.setInterval(() => this._paint(), 15000);
    this._subscribeForecasts();
    this._paint();
  }
  disconnectedCallback() {
    this._media?.removeEventListener?.('change', this._onAppearance);
    if (this._clockTimer !== null) window.clearInterval(this._clockTimer);
    this._clockTimer = null;
    this._unsubscribeForecasts();
  }
  setConfig(raw) {
    const next=wpConfig(raw);
    if(next.weather_entity!==this._config.weather_entity)this._unsubscribeForecasts();
    this._config=next;this._lastSignature='';this._subscribeForecasts();this._paint();
  }
  set hass(hass) {
    if(this._hass?.connection && this._hass.connection!==hass?.connection)this._unsubscribeForecasts();
    this._hass=hass;this._subscribeForecasts();this._paint();
  }
  _unsubscribeForecasts() {
    this._forecastVersion++;
    for(const off of this._forecastUnsubscribe.splice(0)) {
      try {Promise.resolve(off()).catch(()=>{});} catch {}
    }
    this._forecastConnection=null;this._forecastId='';
    this._forecast={daily:null,hourly:null};
    this._forecastState={daily:'idle',hourly:'idle'};
  }
  _subscribeForecasts() {
    const id=this._config.weather_entity;
    const conn=this._hass?.connection;
    if(!this.isConnected||!id||!conn||typeof conn.subscribeMessage!=='function')return;
    if(this._forecastConnection===conn && this._forecastId===id)return;
    this._unsubscribeForecasts();
    this._forecastConnection=conn;this._forecastId=id;
    const version=this._forecastVersion;
    const features=Number(this._hass?.states?.[id]?.attributes?.supported_features||0);
    for(const [type,feature] of [['daily',1],['hourly',2]]) {
      if(features!==0 && !(features&feature)){this._forecastState[type]='unsupported';continue;}
      this._forecastState[type]='loading';
      Promise.resolve().then(()=>conn.subscribeMessage(event=>{
        if(version!==this._forecastVersion||id!==this._forecastId)return;
        this._forecast[type]=Array.isArray(event?.forecast)?event.forecast:[];
        this._forecastState[type]='ready';this._lastSignature='';this._paint();
      },{type:'weather/subscribe_forecast',entity_id:id,forecast_type:type}))
      .then(off=>{
        if(version!==this._forecastVersion){
          if(typeof off==='function')Promise.resolve(off()).catch(()=>{});
        }else if(typeof off==='function')this._forecastUnsubscribe.push(off);
      })
      .catch(()=>{
        if(version!==this._forecastVersion)return;
        this._forecastState[type]='error';this._lastSignature='';this._paint();
      });
    }
  }
  getCardSize() { return 5; }
  _zone(){return this._hass?.config?.time_zone||Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';}
  _weather() { return this._hass?.states?.[this._config.weather_entity]; }
  _alert() {return wpAlertData(this._config.alert_entity?this._hass?.states?.[this._config.alert_entity]:null);}
  _isDark() {
    return this._config.theme_mode === 'dark' ||
      (this._config.theme_mode === 'auto' && (typeof this._hass?.themes?.darkMode === 'boolean' ? this._hass.themes.darkMode : !!this._media?.matches));
  }

  _popup(entity){
    const a=wpKnown(entity)?entity.attributes||{}:{};
    const unit=wpText(a.temperature_unit||this._hass?.config?.unit_system?.temperature||'°C',8);
    const precipitationUnit=wpText(a.precipitation_unit||this._hass?.config?.unit_system?.accumulated_precipitation||this._hass?.config?.unit_system?.precipitation||'',12);
    const zone=this._zone(),hours=wpNextHours(this._forecast.hourly),days=wpNextDays(this._forecast.daily,new Date(),zone);
    const sun=wpSolarDay(new Date(),zone,this._hass?.config?.latitude,this._hass?.config?.longitude,this._hass?.states?.['sun.sun']);
    const alert=this._alert();
    const metrics=[['Temperatura',wpTemp(a.temperature,unit)],
      ['Umidità',wpMetric(a.humidity,'%')],['Vento',wpMetric(a.wind_speed,a.wind_speed_unit?' '+wpText(a.wind_speed_unit,14):'')],
      ['Pressione',wpMetric(a.pressure,a.pressure_unit?' '+wpText(a.pressure_unit,14):'')]];
    const currentCloud=wpCloudCoverage(a.cloud_coverage);
    if(currentCloud!==null)metrics.push(['Copertura nuvolosa',currentCloud]);
    const hourly=this._forecastState.hourly==='ready'?wpHoursHTML(hours,unit,zone,this._config.show_hourly_chart,precipitationUnit):
      '<div class="wp-empty">'+(this._forecastState.hourly==='loading'?'Caricamento previsioni…':'Previsioni orarie non disponibili.')+'</div>';
    const daily=this._forecastState.daily==='ready'&&days.length?days.map(d=>{
      const [,condition]=wpCondition(d.condition),rain=wpRainSummary(d,precipitationUnit);
      return `<div class="wp-daily-detail"><strong>${wpEscape(wpLocalLabel(d.datetime,{weekday:'long',day:'numeric',month:'long'},zone))} · ${wpEscape(condition)}</strong>
        <div class="wp-sub">Max ${wpNumber(d.temperature)===null?'—':wpEscape(wpTemp(d.temperature,unit))} ·
        Min ${wpNumber(d.templow)===null?'—':wpEscape(wpTemp(d.templow,unit))}${rain.length?' · '+rain.map(wpEscape).join(' · '):''}</div></div>`;
    }).join(''):'<div class="wp-empty">Previsioni giornaliere non disponibili.</div>';
    return `<div class="wp-backdrop ${this._isDark()?'wp-dark':'wp-light'}" data-backdrop="1"><div class="wp-dialog" role="dialog" aria-modal="true" aria-label="Dettagli meteo">
      <div class="wp-dialog-head"><strong>Dettagli meteo</strong><button type="button" class="wp-close" data-close="1" aria-label="Chiudi">${wpIcon('close')}</button></div>
      <div class="wp-detail-heading">Prossime 8 ore</div>${hourly}
      <div class="wp-detail-heading">Prossimi 3 giorni</div>${daily}
      <div class="wp-detail-heading">${this._config.moon_entity?"Sole e luna":"Sole"}</div>${wpSolarArc(sun,zone)}
      ${this._config.moon_entity?wpMoonDetails(this._hass?.states?.[this._config.moon_entity]):""}
      ${this._config.alert_entity?`<div class="wp-detail-heading">Allerte meteorologiche</div>${wpAlertDetails(alert,zone)}`:""}
      <div class="wp-detail-heading">Condizioni attuali</div>
      ${metrics.map(([label,value])=>`<div class="wp-metric"><span>${wpEscape(label)}</span><strong>${wpEscape(value)}</strong></div>`).join('')}
    </div></div>`;
  }

  _paint() {
    if (!this.isConnected) return;
    const entity = this._weather();
    const attrs = wpKnown(entity) ? entity.attributes || {} : {};
    const now = new Date();
    const signature = JSON.stringify([this._config,this._hass?.themes?.darkMode,this._isDark(),entity?.state,attrs,Math.floor(now.getTime()/60000),this._open,this._forecast,this._forecastState,this._hass?.config?.time_zone,this._hass?.config?.latitude,this._hass?.config?.longitude,this._hass?.states?.['sun.sun']?.state,this._hass?.states?.['sun.sun']?.attributes,this._config.alert_entity?this._hass?.states?.[this._config.alert_entity]:null,this._config.moon_entity?this._hass?.states?.[this._config.moon_entity]:null]);
    if (signature === this._lastSignature) return;
    this._lastSignature = signature;
    const known = wpKnown(entity);
    const [icon, condition] = known ? wpCondition(entity.state) : ['weather-cloudy-alert','Meteo non disponibile'];
    const temperature = wpTemp(known ? attrs.temperature : null, wpText(attrs.temperature_unit || this._hass?.config?.unit_system?.temperature || '°C',8));
    const location = this._config.show_location && this._config.location_label ?
      `<div class="wp-location">${wpIcon('map-marker-outline')}${wpEscape(this._config.location_label)}</div>` : '';
    const zone=this._zone(),unit=wpText(attrs.temperature_unit||this._hass?.config?.unit_system?.temperature||'°C',8);
    const days=wpNextDays(this._forecast.daily,now,zone);
    const sun=wpSolarDay(now,zone,this._hass?.config?.latitude,this._hass?.config?.longitude,this._hass?.states?.['sun.sun']);
    const alert=this._alert();
    const daySection=!this._config.weather_entity?'':days.length?
      '<div class="wp-forecast-heading">PROSSIMI 3 GIORNI</div><div class="wp-days">'+days.map(d=>wpDayTile(d,unit,zone)).join('')+'</div>':
      '<div class="wp-forecast-heading">PROSSIMI 3 GIORNI</div><div class="wp-forecast-note">'+
      (this._forecastState.daily==='loading'?'Caricamento previsioni…':'Previsioni non disponibili.')+'</div>';
    this.shadowRoot.innerHTML = `<style>${WP_CSS}</style>
      <div class="wp-container"><div class="wp-shell ${this._isDark()?'wp-dark':'wp-light'}">
        <div class="wp-head"><div><div class="wp-eyebrow">${wpEscape(this._config.eyebrow)}</div>
          <div class="wp-title">${wpEscape(this._config.title)}<b>.</b></div></div>
          <div class="wp-datetime">${wpEscape(wpDate(now))}<div class="wp-clock">${wpEscape(wpClock(now))}</div></div>
        </div>
        <div class="wp-panel"><div class="wp-current">
          <span class="wp-orb">${wpIcon(icon)}</span><div class="wp-main">
            <div class="wp-temp">${wpEscape(temperature)}</div><div class="wp-condition">${wpEscape(condition)}</div>
            ${location}
          </div></div>
          ${daySection}
          <div class="wp-sun-heading">ALBA E TRAMONTO</div>${wpSolarCards(sun,zone)}
          ${this._config.alert_entity?wpAlertBanner(alert):""}
          ${this._config.weather_entity ? '' : '<div class="wp-empty">Seleziona un’entità meteo nell’editor della card.</div>'}
        </div>
        <button type="button" class="wp-detail" data-open="1">${wpIcon('information-outline')} Dettagli e stato</button>
      </div></div>
      ${this._open ? this._popup(entity) : ''}`;
  }
}
const WP_EDITOR_CSS=`
:host{display:block;color:var(--primary-text-color,#18221c);font-family:var(--ha-font-family-body,Roboto,Arial,sans-serif);font-size:var(--ha-font-size-m,14px)}
*,*:before,*:after{box-sizing:border-box}
.wp-editor{display:block}
.wp-tabs{display:flex;gap:5px;overflow-x:auto;padding-bottom:14px;border-bottom:1px solid var(--divider-color,#dfe5df)}
.wp-tab{border:0;background:none;color:var(--secondary-text-color,#536359);border-radius:13px;padding:10px 13px;white-space:nowrap;font:inherit;cursor:pointer}
.wp-tab.active{color:var(--primary-text-color,#17231c);background:var(--secondary-background-color,#f0f2ef);font-weight:650}
.wp-heading{font-size:21px;font-weight:500;margin:25px 0 9px}
.wp-desc{color:var(--secondary-text-color,#55665a);font-size:13px;line-height:1.5;margin-bottom:24px}
.wp-field{display:block;margin:20px 0}
.wp-label{font-size:14px;margin-bottom:10px}
.wp-input{display:block;width:100%;background:var(--secondary-background-color,#f0f2ef);color:var(--primary-text-color,#18221c);border:0;border-bottom:1px solid var(--divider-color,#a5afa5);padding:14px 13px;min-height:50px;border-radius:11px 11px 0 0;font:inherit}
.wp-editor ha-selector{display:block;width:100%;--mdc-theme-primary:var(--primary-color,#0b7457)}
.wp-fallback{display:none}.wp-no-native .wp-fallback{display:block}.wp-no-native ha-selector{display:none}
.wp-row{border-bottom:1px solid var(--divider-color,#e3e7e3);padding:13px 0;display:flex;align-items:center;justify-content:space-between;gap:15px}
.wp-row label{flex:1}.wp-row input[type=checkbox]{width:18px;height:18px;accent-color:var(--primary-color,#0c7157)}
.wp-muted{font-size:12px;line-height:1.5;color:var(--secondary-text-color,#5e6c62)}
.wp-action{background:var(--secondary-background-color,#eff2ee);border:1px solid var(--divider-color,#dbe2db);color:var(--primary-text-color,#18221c);padding:10px 14px;border-radius:14px;font:inherit;cursor:pointer}
.wp-action:disabled{opacity:.45;cursor:not-allowed}
.wp-tiny{font-size:11px;color:var(--secondary-text-color,#55665a);margin:9px 0}
.wp-input:focus-visible,.wp-action:focus-visible,.wp-tab:focus-visible,.wp-clear:focus-visible{outline:2px solid var(--primary-color,#0b7457);outline-offset:2px}
.wp-more{margin:19px 0 10px;border-bottom:1px solid var(--divider-color,#dfe5df);padding:0 0 11px}
.wp-more summary{cursor:pointer;padding:13px 4px;color:var(--secondary-text-color,#56665d);font-size:13px;list-style:none}
.wp-more summary:before{content:"▸";font-size:10px;margin-right:10px}
.wp-more[open] summary:before{content:"▾"}.wp-more summary::-webkit-details-marker{display:none}
.wp-more-body{padding:2px 0 8px}
.wp-selector-line{display:flex;align-items:center;gap:8px;min-width:0}
.wp-selector-grow{flex:1;min-width:0}
.wp-clear{display:flex;align-items:center;justify-content:center;flex:none;width:36px;height:36px;background:var(--secondary-background-color,#eef1ef);border:1px solid var(--divider-color,#dfe5df);border-radius:50%;cursor:pointer;color:var(--secondary-text-color,#57655c);padding:0}
.wp-clear ha-icon{width:18px;height:18px;--mdc-icon-size:18px}
.wp-camera-group{padding-bottom:20px}
.wp-camera-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:20px}.wp-section-picker{display:flex;gap:5px;overflow-x:auto;border-bottom:1px solid var(--divider-color,#dfe5df);padding:14px 0 12px}.wp-section-chip{border:0;border-radius:13px;padding:10px 12px;flex:none;background:none;color:var(--secondary-text-color,#536359);font:inherit;font-size:13px;cursor:pointer}.wp-section-chip.active{background:var(--secondary-background-color,#f0f2ef);color:var(--primary-text-color,#17231c);font-weight:650}
.wp-camera-head strong{font-size:15px;font-weight:600}
.wp-controls{display:flex;gap:6px;flex:none}
.wp-controls .wp-action{padding:5px 9px;border-radius:10px}
.wp-add{display:block;margin:12px 0 25px}
.wp-notice{margin-top:10px;color:var(--error-color,#bd4b42);font-size:12px}
`;

class WeatherPulseCardEditor extends HTMLElement {
  constructor(){
    super();
    this.attachShadow({mode:'open'});
    this._config=wpConfig();
    this._hass=null;
    this._tab='meteo';
    this._section='previsioni';
    this._details={};
    this._nativeTried=false;
    this._renderScheduled=false;
    this._duringConfigEvent=false;
    this.shadowRoot.addEventListener('click',e=>this._click(e));
    this.shadowRoot.addEventListener('change',e=>this._change(e));
  }
  set hass(hass){
    this._hass=hass;
    this.shadowRoot.querySelectorAll('ha-selector').forEach(el=>el.hass=hass);
  }
  setConfig(raw){
    const next=wpConfig(raw);
    if(JSON.stringify(next)===JSON.stringify(this._config)&&this.shadowRoot.querySelector('.wp-editor'))return;
    this._config=next;
    if(this._duringConfigEvent||this._renderScheduled)this._scheduleRender();
    else this._render();
  }
  connectedCallback(){this._render();this._ensureNative();}
  async _ensureNative(){
    if(this._nativeTried)return;
    this._nativeTried=true;
    if(!customElements.get('ha-selector')){
      try{
        const helper=await window.loadCardHelpers?.();
        await helper?.importSelector?.();
      }catch{}
    }
    this._render();
  }
  _scheduleRender(){
    if(!this.isConnected||this._renderScheduled)return;
    this._renderScheduled=true;
    const done=()=>{this._renderScheduled=false;if(this.isConnected)this._render();};
    if(typeof window!=='undefined'&&typeof window.requestAnimationFrame==='function'){
      window.requestAnimationFrame(done);
    }else Promise.resolve().then(done);
  }
  _update(patch){
    const next=wpConfig({...this._config,...patch});
    if(JSON.stringify(next)===JSON.stringify(this._config))return;
    this._config=next;
    this._duringConfigEvent=true;
    try{
      this.dispatchEvent(new CustomEvent('config-changed',{
        detail:{config:this._config},bubbles:true,composed:true
      }));
    }finally{
      this._duringConfigEvent=false;
      this._scheduleRender();
    }
  }
  _field(label,inner,help=''){
    return `<div class="wp-field"><div class="wp-label">${wpEscape(label)}</div>${inner}${help?`<div class="wp-tiny">${wpEscape(help)}</div>`:''}</div>`;
  }
  _text(key,label,max=70){
    return this._field(label,`<input class="wp-input" type="text" maxlength="${max}" data-key="${key}" value="${wpEscape(this._config[key]||'')}"/>`);
  }
  _select(key,label,options){
    return this._field(label,`<select class="wp-input" data-key="${key}">
      ${options.map(([value,caption])=>`<option value="${value}" ${this._config[key]===value?'selected':''}>${wpEscape(caption)}</option>`).join('')}
    </select>`);
  }
  _check(key,label,help=''){
    return `<div class="wp-row"><label for="wp-${key}">${wpEscape(label)}
      ${help?`<div class="wp-muted">${wpEscape(help)}</div>`:''}</label>
      <input type="checkbox" id="wp-${key}" data-key="${key}" ${this._config[key]?'checked':''}/></div>`;
  }
  _entityField(key,label,hint=''){
    const value=this._config[key];
    const placeholder=key==='weather_entity'?'weather.*':key==='moon_entity'?'sensor.*':'sensor.* / binary_sensor.*';
    const field=`<div class="wp-selector-line"><div class="wp-selector-grow">
        <div data-entity-slot="${key}"></div>
        <div class="wp-fallback"><input class="wp-input" type="text" data-key="${key}"
          placeholder="${placeholder}" value="${wpEscape(value||'')}"/></div>
      </div>${value?`<button type="button" class="wp-clear" data-clear="${key}" aria-label="Rimuovi ${wpEscape(label)}"
        title="Rimuovi ${wpEscape(label)}">${wpIcon('close')}</button>`:''}</div>`;
    return this._field(label,field,hint);
  }
  _meteo(){
    const sections=[['previsioni','Previsioni'],['sole','Sole e luna'],['allerte','Allerte']];
    let body='<div class="wp-heading">Configurazione meteo</div>'+
      '<div class="wp-desc">Seleziona una sezione, poi configura le sue entità e le opzioni disponibili.</div>'+
      `<div class="wp-section-picker">${sections.map(([id,label])=>`<button type="button" class="wp-section-chip ${id===this._section?'active':''}"
        data-section="${id}" aria-pressed="${id===this._section}">${label}</button>`).join('')}</div>`;
    if(this._section==='previsioni'){
      body+='<div class="wp-heading">Previsioni meteorologiche</div>'+
        this._entityField('weather_entity','Entità meteorologica (weather.*)',
          'Seleziona l’entità meteo già presente in Home Assistant. La disponibilità delle previsioni dipende dalla sorgente scelta.')+
        '<div class="wp-muted">Sono utilizzate le previsioni orarie e giornaliere fornite da Home Assistant.</div>';
    }
    if(this._section==='sole'){
      body+='<div class="wp-heading">Sole e luna</div><div class="wp-desc">Alba e tramonto utilizzano la posizione e il fuso orario configurati in Home Assistant.</div>'+
        this._entityField('moon_entity','Fase lunare (facoltativa)',
          'Seleziona un sensore dell’integrazione Moon, se disponibile. Senza sensore lunare vengono mostrati solo i dati solari.');
    }
    if(this._section==='allerte'){
      body+='<div class="wp-heading">Allerte meteorologiche</div><div class="wp-desc">Le allerte sono facoltative. Seleziona un’entità che rappresenta effettivamente allerte meteo.</div>'+
        this._entityField('alert_entity','Entità allerta (facoltativa)',
          'La card mostra soltanto allerte segnalate dalla sorgente. Uno stato sconosciuto non significa assenza di allerte.')+
        '<div class="wp-muted">Per i provvedimenti di sicurezza verifica sempre gli avvisi delle autorità competenti.</div>';
    }
    return body;
  }
  _content(){
    if(this._tab==='meteo')return this._meteo();
    if(this._tab==='aspetto')return '<div class="wp-heading">Aspetto Edera</div><div class="wp-desc">Personalizza il titolo e il tema mantenendo lo stile Edera Light/Dark.</div>'+
      this._text('title','Titolo',60)+this._text('eyebrow','Intestazione superiore',60)+
      this._select('theme_mode','Tema',[['auto','Automatico (Home Assistant)'],['light','Light Edera'],['dark','Dark Edera']])+
      this._check('show_location','Mostra località','La località resta nascosta finché non abiliti questa opzione.')+
      (this._config.show_location?this._text('location_label','Nome località',70):'');
    if(this._tab==='avanzate')return '<div class="wp-heading">Opzioni avanzate</div><div class="wp-desc">Impostazioni facoltative per i dettagli meteo.</div>'+
      this._check('show_hourly_chart','Mostra grafico delle prossime 8 ore',
        'Le previsioni orarie rimangono visibili nel popup anche se il grafico è disattivato.')+
      '<div class="wp-muted">La card utilizza i dati delle integrazioni Home Assistant configurate e non richiede chiavi API dedicate.</div>';
    return '';
  }
  _click(event){
    const tab=event.target.closest('[data-tab]');
    if(tab){this._tab=tab.dataset.tab;this._render();return;}
    const section=event.target.closest('[data-section]');
    if(section){this._section=section.dataset.section;this._render();return;}
    const clear=event.target.closest('[data-clear]');
    if(clear){this._update({[clear.dataset.clear]:''});}
  }
  _change(event){
    const input=event.target,key=input?.dataset?.key;
    if(!key)return;
    const value=input.type==='checkbox'?input.checked:input.value;
    if(key==='weather_entity'){this._update({[key]:wpEntity(value)});return;}
    if(key==='moon_entity'){this._update({[key]:wpMoonEntity(value)});return;}
    if(key==='alert_entity'){this._update({[key]:wpAlertEntity(value)});return;}
    if(['title','eyebrow','theme_mode','show_hourly_chart','show_location','location_label'].includes(key))this._update({[key]:value});
  }
  _render(){
    if(!this.isConnected)return;
    const tabs=[['meteo','Meteo'],['aspetto','Aspetto'],['avanzate','Avanzate']];
    this.shadowRoot.innerHTML=`<style>${WP_EDITOR_CSS}</style>
      <div class="wp-editor"><div class="wp-tabs">${tabs.map(([id,label])=>`<button type="button" class="wp-tab ${this._tab===id?'active':''}"
      data-tab="${id}" aria-pressed="${id===this._tab}">${label}</button>`).join('')}</div>${this._content()}</div>`;
    const root=this.shadowRoot.querySelector('.wp-editor');
    if(!customElements.get('ha-selector')){root.classList.add('wp-no-native');return;}
    const selectors={weather_entity:{entity:{domain:'weather'}},
      moon_entity:{entity:{domain:'sensor'}},
      alert_entity:{entity:{domain:['sensor','binary_sensor']}}};
    const validators={weather_entity:wpEntity,moon_entity:wpMoonEntity,alert_entity:wpAlertEntity};
    this.shadowRoot.querySelectorAll('[data-entity-slot]').forEach(slot=>{
      const key=slot.dataset.entitySlot;
      if(!selectors[key])return;
      const el=document.createElement('ha-selector');
      el.hass=this._hass;el.selector=selectors[key];el.value=this._config[key]||'';
      el.setAttribute('aria-label',key==='weather_entity'?'Entità meteorologica':key==='moon_entity'?'Fase lunare':'Entità allerta');
      el.addEventListener('value-changed',event=>{
        event.stopPropagation();
        if(!event.detail||!Object.prototype.hasOwnProperty.call(event.detail,'value'))return;
        this._update({[key]:validators[key](event.detail.value)});
      });
      slot.appendChild(el);
    });
  }
}
if (!customElements.get(WP_TAG)) customElements.define(WP_TAG,WeatherPulseCard);
if (!customElements.get(WP_EDITOR_TAG)) customElements.define(WP_EDITOR_TAG,WeatherPulseCardEditor);
if (typeof window !== 'undefined') {
  window.customCards=window.customCards || [];
  if (!window.customCards.some(card=>card.type===WP_TAG)) {
    window.customCards.push({type:WP_TAG,name:'Weather Pulse Card',description:'Previsioni meteo minimal in stile Edera.',preview:true});
  }
}
