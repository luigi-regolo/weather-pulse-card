/**
 * Weather Pulse Card — Home Assistant dashboard card.
 * SPDX-License-Identifier: GPL-3.0-only.
 * No remote dependencies, telemetry, advertising or location requests.
 */
const WP_TAG = 'weather-pulse-card';
const WP_EDITOR_TAG = 'weather-pulse-card-editor';
const WP_DEFAULTS = Object.freeze({
  title: 'Meteo', eyebrow: 'WEATHER PULSE CARD', theme_mode: 'auto',
  weather_entity: '', show_location: false, location_label: ''
});
function wpText(value, limit = 90) { return String(value ?? '').trim().slice(0, limit); }
function wpEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
}
function wpEntity(value) {
  const id = wpText(value, 160);
  return /^weather\.[a-z0-9_]+$/.test(id) ? id : '';
}
function wpConfig(raw = {}) {
  const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return {
    title: wpText(r.title ?? WP_DEFAULTS.title, 60).replace(/\.+$/, '') || 'Meteo',
    eyebrow: wpText(r.eyebrow ?? WP_DEFAULTS.eyebrow, 60),
    theme_mode: ['auto', 'light', 'dark'].includes(r.theme_mode) ? r.theme_mode : 'auto',
    weather_entity: wpEntity(r.weather_entity),
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
function wpHoursHTML(hours,unit,zone){
  if(!hours.length)return '<div class="wp-empty">Previsioni orarie non disponibili.</div>';
  const valid=hours.map(x=>wpNumber(x.temperature)).filter(v=>v!==null);
  let graph='';
  if(valid.length>=2){
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
    const [mdi]=wpCondition(x.condition),temp=wpNumber(x.temperature),rain=wpNumber(x.precipitation_probability);
    return `<div class="wp-hour"><span>${wpEscape(wpLocalLabel(x.datetime,{hour:'2-digit',minute:'2-digit'},zone))}</span>
       ${wpIcon(mdi)}<strong>${temp===null?'—':wpEscape(wpTemp(temp,unit))}</strong>
       <small>${rain===null?'—':wpEscape(wpMetric(rain,'%'))}</small></div>`;
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

const WP_CSS = `
:host{display:block;box-sizing:border-box;font-family:var(--ha-font-family-body,Roboto,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif);color:var(--wp-fg);font-size:14px}
*,*:before,*:after{box-sizing:border-box}
.wp-shell{--wp-accent:#0a7156;--wp-bg:#fafbf9;--wp-tile:#f0f2ef;--wp-circle:#fff;--wp-line:#e0e5df;--wp-fg:#18221c;--wp-muted:#56675c;background:var(--wp-bg);color:var(--wp-fg);border:1px solid var(--wp-line);border-radius:26px;padding:18px;min-width:0}
.wp-shell.wp-dark{--wp-accent:#0e795d;--wp-bg:#101211;--wp-tile:#191c1a;--wp-circle:#282b29;--wp-line:#2b302c;--wp-fg:#f5f7f4;--wp-muted:#bbc5bd}
.wp-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin:2px 4px 17px}
.wp-eyebrow{font-size:10px;letter-spacing:1.7px;font-weight:750;color:var(--wp-muted);margin-bottom:7px}
.wp-title{font-size:25px;line-height:1.14;font-weight:780;letter-spacing:-.7px;overflow-wrap:anywhere}
.wp-title b{color:var(--wp-accent);font-weight:800}
.wp-datetime{text-align:right;color:var(--wp-muted);white-space:nowrap;font-size:11px;line-height:1.5}
.wp-clock{font-size:21px;font-weight:700;color:var(--wp-fg);font-variant-numeric:tabular-nums}
.wp-panel{background:var(--wp-tile);border:1px solid var(--wp-line);border-radius:24px;padding:13px;min-width:0}
.wp-current{display:flex;align-items:center;gap:12px}
.wp-orb{display:grid;place-items:center;flex:none;width:52px;height:52px;border-radius:50%;background:var(--wp-circle)}
.wp-orb ha-icon{--mdc-icon-size:31px;width:31px;height:31px}
.wp-main{min-width:0;flex:1}.wp-temp{font-size:29px;font-weight:780;line-height:1.15;letter-spacing:-.7px}
.wp-condition{font-size:13px;font-weight:600;margin-top:3px;overflow-wrap:anywhere}
.wp-sub{font-size:11.5px;line-height:1.4;color:var(--wp-muted);margin-top:3px}
.wp-location{display:inline-flex;gap:4px;align-items:center;color:var(--wp-muted);font-size:11px;margin-top:7px}
.wp-location ha-icon{--mdc-icon-size:14px;width:14px;height:14px}
.wp-detail{display:inline-flex;align-items:center;gap:6px;border:0;border-radius:999px;color:#fff;background:var(--wp-accent);padding:6px 11px;margin-top:12px;font-size:11px;font-weight:650;line-height:1.2;cursor:pointer}
.wp-detail ha-icon{--mdc-icon-size:14px;width:14px;height:14px;color:#fff}
button{font:inherit;cursor:pointer}button:focus-visible{outline:2px solid var(--wp-accent);outline-offset:3px}
.wp-empty{color:var(--wp-muted);font-size:12px;line-height:1.45}
.wp-backdrop{position:fixed;inset:0;z-index:9999;background:#0009;display:grid;place-items:center;padding:16px}
.wp-dialog{background:var(--wp-bg);color:var(--wp-fg);border:1px solid var(--wp-line);border-radius:26px;box-shadow:0 18px 60px #0005;padding:20px;width:min(430px,100%);max-height:90vh;overflow:auto}
.wp-dialog-head{display:flex;align-items:center;gap:10px;justify-content:space-between;margin-bottom:15px}
.wp-dialog-head strong{font-size:17px;font-weight:650}
.wp-close{display:grid;place-items:center;width:36px;height:36px;flex:none;border:0;border-radius:50%;background:var(--wp-tile);color:var(--wp-fg)}
.wp-close ha-icon{--mdc-icon-size:18px;width:18px;height:18px}
.wp-metric{display:flex;justify-content:space-between;align-items:center;gap:12px;background:var(--wp-tile);border:1px solid var(--wp-line);padding:12px 14px;border-radius:14px;margin-top:8px}
.wp-metric span{color:var(--wp-muted);font-size:12px}
.wp-metric strong{font-size:13px}

.wp-forecast-heading{margin:14px 1px 8px;color:var(--wp-muted);font-size:10px;letter-spacing:1px;font-weight:700}
.wp-days{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.wp-day{display:flex;flex-direction:column;align-items:center;gap:7px;min-width:0;padding:10px 4px;border-radius:16px;border:1px solid var(--wp-line);background:var(--wp-circle);font-size:11px}
.wp-day>span{color:var(--wp-muted)}.wp-day ha-icon{--mdc-icon-size:24px;width:24px;height:24px}
.wp-day strong{font-size:12px}.wp-day small{font-size:11px;color:var(--wp-muted);margin-left:5px}
.wp-forecast-note{color:var(--wp-muted);font-size:11px;line-height:1.45}
.wp-detail-heading{font-weight:650;font-size:13px;margin:17px 0 10px}
.wp-hour-scroll{overflow-x:auto;padding:8px 0 12px}
.wp-hour-grid{display:grid;grid-template-columns:repeat(8,62px);width:496px}
.wp-hour{display:flex;flex-direction:column;align-items:center;gap:8px;font-size:11px}
.wp-hour>span,.wp-hour>small{color:var(--wp-muted);font-size:10px}
.wp-hour ha-icon{--mdc-icon-size:23px;width:23px;height:23px}.wp-hour strong{font-size:12px}
.wp-hour-chart{display:block;width:496px;height:70px}
.wp-daily-detail{background:var(--wp-tile);border-radius:13px;margin-top:7px;padding:11px 13px}
.wp-daily-detail strong{font-size:12px}.wp-daily-detail .wp-sub{margin-top:5px}

.wp-sun-heading{color:var(--wp-muted);font-size:10px;font-weight:700;letter-spacing:1px;margin:14px 1px 8px}
.wp-sun-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.wp-sun-card{display:flex;gap:10px;align-items:center;min-width:0;background:var(--wp-circle);border:1px solid var(--wp-line);padding:9px;border-radius:16px}
.wp-sun-orb{display:grid;place-items:center;flex:none;width:35px;height:35px;background:var(--wp-tile);border-radius:50%}
.wp-sun-orb ha-icon{width:20px;height:20px;--mdc-icon-size:20px;color:var(--wp-fg)}
.wp-sun-card>div{display:flex;flex-direction:column;gap:4px;min-width:0}
.wp-sun-label{font-size:11px;color:var(--wp-muted)}
.wp-sun-card strong{font-size:12px;font-weight:650;white-space:nowrap}
.wp-solar-detail{background:var(--wp-tile);border:1px solid var(--wp-line);border-radius:17px;padding:10px 14px}
.wp-solar-svg{width:100%;height:122px;display:block}
.wp-sun-times{display:flex;align-items:center;justify-content:space-between;gap:14px;font-size:12px;font-weight:650}
.wp-sun-times span{display:flex;align-items:center;gap:5px}
.wp-sun-times ha-icon{width:16px;height:16px;--mdc-icon-size:16px}
.wp-solar-duration{text-align:center;margin-top:14px;color:var(--wp-muted);font-size:11px}
.wp-solar-duration strong{color:var(--wp-fg)}
@media(max-width:330px){.wp-sun-card{padding:7px;gap:6px}.wp-sun-orb{width:29px;height:29px}.wp-sun-card strong{font-size:11px}}
@media(max-width:420px){.wp-shell{padding:13px;border-radius:23px}.wp-title{font-size:23px}.wp-head{gap:7px}.wp-datetime{font-size:10px}.wp-clock{font-size:19px}.wp-orb{width:43px;height:43px}.wp-temp{font-size:25px}.wp-panel{padding:10px}}
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
  _isDark() {
    return this._config.theme_mode === 'dark' ||
      (this._config.theme_mode === 'auto' && (typeof this._hass?.themes?.darkMode === 'boolean' ? this._hass.themes.darkMode : !!this._media?.matches));
  }

  _popup(entity){
    const a=wpKnown(entity)?entity.attributes||{}:{};
    const unit=wpText(a.temperature_unit||this._hass?.config?.unit_system?.temperature||'°C',8);
    const zone=this._zone(),hours=wpNextHours(this._forecast.hourly),days=wpNextDays(this._forecast.daily,new Date(),zone);
    const sun=wpSolarDay(new Date(),zone,this._hass?.config?.latitude,this._hass?.config?.longitude,this._hass?.states?.['sun.sun']);
    const metrics=[['Temperatura',wpTemp(a.temperature,unit)],['Temperatura percepita',wpTemp(a.apparent_temperature,unit)],
      ['Umidità',wpMetric(a.humidity,'%')],['Vento',wpMetric(a.wind_speed,a.wind_speed_unit?' '+wpText(a.wind_speed_unit,14):'')],
      ['Pressione',wpMetric(a.pressure,a.pressure_unit?' '+wpText(a.pressure_unit,14):'')]];
    const hourly=this._forecastState.hourly==='ready'?wpHoursHTML(hours,unit,zone):
      '<div class="wp-empty">'+(this._forecastState.hourly==='loading'?'Caricamento previsioni…':'Previsioni orarie non disponibili.')+'</div>';
    const daily=this._forecastState.daily==='ready'&&days.length?days.map(d=>{
      const [,condition]=wpCondition(d.condition),chance=wpNumber(d.precipitation_probability);
      return `<div class="wp-daily-detail"><strong>${wpEscape(wpLocalLabel(d.datetime,{weekday:'long',day:'numeric',month:'long'},zone))} · ${wpEscape(condition)}</strong>
        <div class="wp-sub">Max ${wpNumber(d.temperature)===null?'—':wpEscape(wpTemp(d.temperature,unit))} ·
        Min ${wpNumber(d.templow)===null?'—':wpEscape(wpTemp(d.templow,unit))} ·
        Pioggia ${chance===null?'non disponibile':wpEscape(wpMetric(chance,'%'))}</div></div>`;
    }).join(''):'<div class="wp-empty">Previsioni giornaliere non disponibili.</div>';
    return `<div class="wp-backdrop" data-backdrop="1"><div class="wp-dialog" role="dialog" aria-modal="true" aria-label="Dettagli meteo">
      <div class="wp-dialog-head"><strong>Dettagli meteo</strong><button type="button" class="wp-close" data-close="1" aria-label="Chiudi">${wpIcon('close')}</button></div>
      <div class="wp-detail-heading">Prossime 8 ore</div>${hourly}
      <div class="wp-detail-heading">Prossimi 3 giorni</div>${daily}
      <div class="wp-detail-heading">Sole</div>${wpSolarArc(sun,zone)}
      <div class="wp-detail-heading">Condizioni attuali</div>
      ${metrics.map(([label,value])=>`<div class="wp-metric"><span>${wpEscape(label)}</span><strong>${wpEscape(value)}</strong></div>`).join('')}
    </div></div>`;
  }

  _paint() {
    if (!this.isConnected) return;
    const entity = this._weather();
    const attrs = wpKnown(entity) ? entity.attributes || {} : {};
    const now = new Date();
    const signature = JSON.stringify([this._config,this._hass?.themes?.darkMode,this._isDark(),entity?.state,attrs,Math.floor(now.getTime()/60000),this._open,this._forecast,this._forecastState,this._hass?.config?.time_zone,this._hass?.config?.latitude,this._hass?.config?.longitude,this._hass?.states?.['sun.sun']?.state,this._hass?.states?.['sun.sun']?.attributes]);
    if (signature === this._lastSignature) return;
    this._lastSignature = signature;
    const known = wpKnown(entity);
    const [icon, condition] = known ? wpCondition(entity.state) : ['weather-cloudy-alert','Meteo non disponibile'];
    const temperature = wpTemp(known ? attrs.temperature : null, wpText(attrs.temperature_unit || this._hass?.config?.unit_system?.temperature || '°C',8));
    const perceived = wpNumber(attrs.apparent_temperature);
    const location = this._config.show_location && this._config.location_label ?
      `<div class="wp-location">${wpIcon('map-marker-outline')}${wpEscape(this._config.location_label)}</div>` : '';
    const zone=this._zone(),unit=wpText(attrs.temperature_unit||this._hass?.config?.unit_system?.temperature||'°C',8);
    const days=wpNextDays(this._forecast.daily,now,zone);
    const sun=wpSolarDay(now,zone,this._hass?.config?.latitude,this._hass?.config?.longitude,this._hass?.states?.['sun.sun']);
    const daySection=!this._config.weather_entity?'':days.length?
      '<div class="wp-forecast-heading">PROSSIMI 3 GIORNI</div><div class="wp-days">'+days.map(d=>wpDayTile(d,unit,zone)).join('')+'</div>':
      '<div class="wp-forecast-heading">PROSSIMI 3 GIORNI</div><div class="wp-forecast-note">'+
      (this._forecastState.daily==='loading'?'Caricamento previsioni…':'Previsioni non disponibili.')+'</div>';
    this.shadowRoot.innerHTML = `<style>${WP_CSS}</style>
      <div class="wp-shell ${this._isDark()?'wp-dark':'wp-light'}">
        <div class="wp-head"><div><div class="wp-eyebrow">${wpEscape(this._config.eyebrow)}</div>
          <div class="wp-title">${wpEscape(this._config.title)}<b>.</b></div></div>
          <div class="wp-datetime">${wpEscape(wpDate(now))}<div class="wp-clock">${wpEscape(wpClock(now))}</div></div>
        </div>
        <div class="wp-panel"><div class="wp-current">
          <span class="wp-orb">${wpIcon(icon)}</span><div class="wp-main">
            <div class="wp-temp">${wpEscape(temperature)}</div><div class="wp-condition">${wpEscape(condition)}</div>
            <div class="wp-sub">${perceived === null ? 'Percepita · Non disponibile' : 'Percepita ' + wpEscape(wpTemp(perceived, wpText(attrs.temperature_unit || '°C',8)))}</div>
            ${location}
          </div></div>
          ${daySection}
          <div class="wp-sun-heading">ALBA E TRAMONTO</div>${wpSolarCards(sun,zone)}
          ${this._config.weather_entity ? '' : '<div class="wp-empty">Seleziona un’entità meteo nell’editor della card.</div>'}
        </div>
        <button type="button" class="wp-detail" data-open="1">${wpIcon('information-outline')} Dettagli e stato</button>
        ${this._open ? this._popup(entity) : ''}
      </div>`;
  }
}
const WP_EDITOR_CSS = `
:host{display:block;font-family:var(--ha-font-family-body,Roboto,Arial,sans-serif);color:var(--primary-text-color);font-size:14px}
*,*:before,*:after{box-sizing:border-box}
.wp-editor{padding:2px}.wp-field{margin:15px 0}.wp-label{display:block;font-size:13px;font-weight:600;margin-bottom:8px}
.wp-input{width:100%;font:inherit;color:var(--primary-text-color);background:var(--secondary-background-color);border:1px solid var(--divider-color);border-radius:10px;padding:10px}
.wp-sub{font-size:12px;color:var(--secondary-text-color);margin-top:6px;line-height:1.4}
.wp-row{display:flex;align-items:center;gap:12px}.wp-row label{flex:1}.wp-selector{display:block;width:100%}
.wp-editor ha-selector{display:block;--mdc-theme-primary:var(--primary-color)}
.wp-editor .wp-fallback{display:none}.wp-editor.wp-no-native .wp-fallback{display:block}.wp-editor.wp-no-native .wp-native{display:none}
.wp-input:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}
`;
class WeatherPulseCardEditor extends HTMLElement {
  constructor() {
    super(); this.attachShadow({mode:'open'}); this._config=wpConfig(); this._hass=null;
    this.shadowRoot.addEventListener('change', e => this._change(e));
  }
  setConfig(config) { this._config=wpConfig(config); this._render(); }
  set hass(hass) { this._hass=hass; this._render(); }
  _update(key,value) {
    this._config=wpConfig({...this._config,[key]:value});
    this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:this._config},bubbles:true,composed:true}));
    this._render();
  }
  _change(event) {
    const el = event.target;
    if (el.dataset.field==='weather_entity') this._update('weather_entity',wpEntity(el.value));
    if (el.dataset.field==='title') this._update('title',el.value);
    if (el.dataset.field==='theme_mode') this._update('theme_mode',el.value);
    if (el.dataset.field==='show_location') this._update('show_location',el.checked);
    if (el.dataset.field==='location_label') this._update('location_label',el.value);
  }
  _render() {
    if (!this.isConnected) return;
    const c = this._config;
    const opts = Object.keys(this._hass?.states || {}).filter(id=>id.startsWith('weather.')).sort();
    this.shadowRoot.innerHTML = `<style>${WP_EDITOR_CSS}</style><div class="wp-editor">
      <div class="wp-field"><label class="wp-label">Entità meteo</label><div class="wp-native wp-selector" data-selector="1"></div>
      <select class="wp-input wp-fallback" data-field="weather_entity" aria-label="Entità meteo"><option value="">Seleziona entità</option>
      ${opts.map(id => `<option value="${wpEscape(id)}" ${c.weather_entity===id?'selected':''}>${wpEscape(id)}</option>`).join('')}</select>
      <div class="wp-sub">Seleziona una delle entità weather.* già disponibili in Home Assistant.</div></div>
      <div class="wp-field"><label class="wp-label" for="wp-title">Titolo</label><input class="wp-input" id="wp-title" data-field="title" value="${wpEscape(c.title)}" maxlength="60"></div>
      <div class="wp-field"><label class="wp-label" for="wp-theme">Tema</label><select class="wp-input" id="wp-theme" data-field="theme_mode">
      ${[['auto','Automatico'],['light','Light Edera'],['dark','Dark Edera']].map(([v,l])=>`<option value="${v}" ${c.theme_mode===v?'selected':''}>${l}</option>`).join('')}</select></div>
      <div class="wp-field wp-row"><label for="wp-location">Mostra località</label><input type="checkbox" id="wp-location" data-field="show_location" ${c.show_location?'checked':''}></div>
      ${c.show_location?`<div class="wp-field"><label class="wp-label" for="wp-location-label">Nome località</label><input class="wp-input" id="wp-location-label" data-field="location_label" maxlength="70" value="${wpEscape(c.location_label)}"></div>`:''}
    </div>`;
    const wrapper = this.shadowRoot.querySelector('.wp-editor');
    if (!customElements.get('ha-selector')) { wrapper.classList.add('wp-no-native'); return; }
    const selector = document.createElement('ha-selector');
    selector.hass = this._hass;
    selector.selector = {entity:{domain:'weather'}};
    selector.value = c.weather_entity || '';
    selector.setAttribute('aria-label','Entità meteo');
    selector.addEventListener('value-changed',e=>{
      e.stopPropagation();
      if(e.detail && Object.prototype.hasOwnProperty.call(e.detail,'value')) this._update('weather_entity',wpEntity(e.detail.value));
    });
    this.shadowRoot.querySelector('[data-selector]').appendChild(selector);
  }
  connectedCallback() { this._render(); }
}
if (!customElements.get(WP_TAG)) customElements.define(WP_TAG,WeatherPulseCard);
if (!customElements.get(WP_EDITOR_TAG)) customElements.define(WP_EDITOR_TAG,WeatherPulseCardEditor);
if (typeof window !== 'undefined') {
  window.customCards=window.customCards || [];
  if (!window.customCards.some(card=>card.type===WP_TAG)) {
    window.customCards.push({type:WP_TAG,name:'Weather Pulse Card',description:'Previsioni meteo minimal in stile Edera.',preview:true});
  }
}
