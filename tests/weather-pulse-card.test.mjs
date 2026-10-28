import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src=fs.readFileSync(new URL('../src/weather-pulse-card.js',import.meta.url),'utf8');
const dist=fs.readFileSync(new URL('../dist/weather-pulse-card.js',import.meta.url),'utf8');
const context=vm.createContext({
  HTMLElement:class {},customElements:{get(){return undefined;},define(){}},
  CustomEvent:class {constructor(type,options={}){this.type=type;this.detail=options.detail??null;this.bubbles=!!options.bubbles;this.composed=!!options.composed;}},
  window:undefined,Intl,Date,Math,Number,String,Array,Object,Set,Map,
});
vm.runInContext(src,context,{filename:'weather-pulse-card.js'});
const get=(expr)=>vm.runInContext(expr,context);

test('dist bundle matches source',()=>assert.equal(dist,src));
test('default privacy and alert configuration',()=>{
  assert.equal(get('wpConfig().show_location'),false);
  assert.equal(get('wpConfig().alert_entity'),'');
  assert.equal(get('wpConfig().title'),'Meteo');
});
test('entity domain validation',()=>{
  assert.equal(get('wpEntity("script.example")'),'');
  assert.equal(get('wpEntity("weather.home")'),'weather.home');
  assert.equal(get('wpAlertEntity("binary_sensor.alert")'),'binary_sensor.alert');
  assert.equal(get('wpMoonEntity("sensor.moon_phase")'),'sensor.moon_phase');
});
test('title has no duplicate period',()=>assert.equal(get('wpConfig({title:"Meteo."}).title'),'Meteo'));
test('optional hourly chart',()=>{
  assert.equal(get('wpConfig({show_hourly_chart:false}).show_hourly_chart'),false);
  assert.equal(get('wpConfig({show_hourly_chart:true}).show_hourly_chart'),true);
});
test('zero and missing values are distinct',()=>{
  assert.equal(get('wpNumber(0)'),0);
  assert.equal(get('wpNumber(null)'),null);
  assert.equal(get('wpNumber("unknown")'),null);
});
test('HTML escaping',()=>{
  assert.equal(get('wpEscape("<script>")'),'&lt;script&gt;');
  assert.doesNotMatch(get('wpAlertBanner(wpAlertData({entity_id:"sensor.alert",state:"red",attributes:{headline:"<script>"}}))'),/<script>/);
});
test('up to six days after today',()=>{
  const days=[19,20,21,22,23,24,25,26,27].map(d=>`{datetime:"2026-10-${d}T00:00:00+02:00"}`).join(',');
  const x=get(`wpNextDays([${days}],new Date("2026-10-19T11:00:00Z"),"Europe/Rome")`);
  assert.equal(x.length,6);
  assert.equal(x[0].day,'2026-10-20');
  assert.equal(x[5].day,'2026-10-25');
});
test('fewer than six days are shown as provided',()=>{
  const x=get('wpNextDays([{datetime:"2026-10-19T00:00:00+02:00"},{datetime:"2026-10-20T00:00:00+02:00"},{datetime:"2026-10-21T00:00:00+02:00"},{datetime:"2026-10-22T00:00:00+02:00"}],new Date("2026-10-19T11:00:00Z"),"Europe/Rome")');
  assert.equal(x.length,3);
  assert.equal(x[0].day,'2026-10-20');
});
test('day pages: dots only when more than three days',()=>{
  assert.equal(get('wpDaysDots(3)'),'');
  assert.equal(get('(wpDaysDots(4).match(/data-page=/g)||[]).length'),2);
  assert.equal(get('(wpDaysDots(6).match(/data-page=/g)||[]).length'),2);
  assert.match(get('wpDaysDots(6)'),/aria-label="Giorni 4–6"/);
  assert.match(get('wpDaysDots(4)'),/aria-label="Giorni 4–4"/);
  assert.equal(get('wpDaysTitle(6)'),'prossimi 6 giorni');
  assert.equal(get('wpDaysTitle(1)'),'prossimo giorno');
});
test('daily forecast swipes in pages of three',()=>{
  const css=get('WP_CSS');
  assert.match(css,/\.wp-days\{[^}]*display:flex;[^}]*overflow-x:auto;[^}]*scroll-snap-type:x mandatory/);
  assert.match(css,/\.wp-day\{flex:0 0 calc\(\(100% - 2\*var\(--wp-gap\)\)\/3\);scroll-snap-align:start/);
  assert.match(css,/\.wp-dot\[aria-current="true"\]:before\{background:var\(--wp-accent\)/);
});
test('past hourly forecast is excluded',()=>{
  assert.equal(get('wpNextHours([{datetime:"2026-10-19T08:00:00Z"},{datetime:"2026-10-19T12:00:00Z"}],new Date("2026-10-19T11:00:00Z")).length'),1);
});
test('unknown alerts are not classified as clear',()=>assert.equal(get('wpAlertData(null).status'),'unknown'));
test('active and clear alert states',()=>{
  assert.equal(get('wpAlertData({entity_id:"binary_sensor.alert",state:"off",attributes:{}}).status'),'clear');
  assert.equal(get('wpAlertData({entity_id:"binary_sensor.alert",state:"on",attributes:{}}).status'),'active');
  assert.equal(get('wpAlertBanner(wpAlertData({entity_id:"binary_sensor.alert",state:"off",attributes:{}}))'),'');
});
test('expired alert is not active',()=>{
  assert.equal(get('wpAlertData({entity_id:"sensor.alert",state:"red",attributes:{expires:"2020-01-01T00:00:00Z"}}).status'),'unknown');
});
test('moon missing and full-moon values',()=>{
  assert.equal(get('wpMoonData(null).known'),false);
  assert.equal(get('wpMoonData({state:"full_moon",attributes:{}}).label'),'Luna piena');
});
test('solar times for October',()=>{
  const x=get('wpSolarDay(new Date("2026-10-19T11:00:00Z"),"Europe/Rome",45.4642,9.19,null)');
  assert.ok(Number.isFinite(x.rise?.getTime()));
  assert.ok(Number.isFinite(x.set?.getTime()));
  assert.ok(x.duration>630&&x.duration<665);
});
test('solar information absent without valid coordinates',()=>{
  assert.equal(get('wpSolarDay(new Date("2026-10-19T11:00:00Z"),"Europe/Rome",null,null,null).rise'),null);
});
test('polar night without events',()=>{
  assert.equal(get('wpSolarDay(new Date("2026-12-21T12:00:00Z"),"Europe/Oslo",78.22,15.65,null).rise'),null);
});
test('visual editor uses shared Edera tabs and grouped meteo sections',()=>{
  const editor=get('Object.create(WeatherPulseCardEditor.prototype)');
  editor._config=get('wpConfig()');editor._hass={states:{}};
  for(const tab of ['meteo','aspetto','avanzate']){
    editor._tab=tab;assert.ok(editor._content().length>90,tab);
  }
  editor._tab='meteo';
  for(const section of ['previsioni','sole','allerte']){
    editor._section=section;assert.ok(editor._content().length>90,section);
  }
});

test('card type and Lovelace settings survive visual editing',()=>{
  const c=get('wpConfig({weather_entity:"weather.meteo",visibility:[{condition:"screen"}],grid_options:{columns:6}})');
  assert.equal(c.type,'custom:weather-pulse-card');
  assert.equal(c.weather_entity,'weather.meteo');
  assert.equal(c.visibility.length,1);
  assert.equal(c.grid_options.columns,6);
});
test('stub config supplies required card type',()=>{
  assert.equal(get('WeatherPulseCard.getStubConfig().type'),'custom:weather-pulse-card');
});
test('perceived temperature is absent',()=>{
  assert.doesNotMatch(src,/Percepita|perceived|Temperatura percepita/);
});
test('popup Edera typography and close button are aligned',()=>{
  const css=get('WP_CSS');
  assert.match(css,/\.wp-mtitle\{flex:1;min-width:0;margin:0;font-size:17px;font-weight:600/);
  assert.match(css,/\.wp-close\{display:grid;place-items:center;line-height:0;margin:0;padding:0;width:40px;height:40px/);
  assert.match(css,/\.wp-close ha-icon\{display:block;flex:none;margin:0/);
});
test('weather entity selection keeps type and defers editor repaint',async()=>{
  const Editor=get('WeatherPulseCardEditor');
  const ed=Object.create(Editor.prototype);
  ed.isConnected=true;ed._config=get('wpConfig()');ed._renderScheduled=false;ed._duringConfigEvent=false;
  ed.shadowRoot={querySelector(){return {};}};
  let renders=0,emitted=0;
  ed._render=()=>renders++;
  ed.dispatchEvent=e=>{emitted++;assert.equal(e.detail.config.type,'custom:weather-pulse-card');ed.setConfig(e.detail.config);return true;};
  ed._update({weather_entity:'weather.meteo'});
  assert.equal(emitted,1);assert.equal(renders,0);
  await Promise.resolve();
  assert.equal(renders,1);
});

test('Edera headings retain shared hierarchy with lighter weather labels',()=>{
  const css=get('WP_CSS');
  assert.match(css,/\.wp-title\{font-size:25px;line-height:1\.14;font-weight:780/);
  assert.match(css,/\.wp-temp\{font-size:29px;font-weight:650/);
  assert.match(css,/\.wp-condition\{font-size:14px;font-weight:600/);
  assert.match(css,/\.wp-forecast-heading\{margin:17px 4px 10px;[^}]*font-weight:600/);
  assert.match(css,/\.wp-sun-heading\{[^}]*font-weight:600/);
});
test('details pill aligns icon and label like Edera badges',()=>{
  const css=get('WP_CSS');
  assert.match(css,/\.wp-detail\{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:44px/);
  assert.match(css,/\.wp-detail\{[^}]*color-mix\(in srgb,var\(--wp-accent\) 45%,transparent\)/);
  assert.match(css,/\.wp-detail\{[^}]*color:var\(--wp-btn-fg\)/);
  assert.match(src,/Dettagli e stato \$\{wpIcon\('chevron-right'\)\}/);
  assert.match(css,/\.wp-detail ha-icon\{display:block;flex:none;margin:0;/);
});
test('precipitation probability and quantity remain distinct',()=>{
  assert.equal(get('wpRainData({precipitation_probability:70,precipitation:4.2},"mm").probability'),'70%');
  assert.equal(get('wpRainData({precipitation_probability:70,precipitation:4.2},"mm").amount'),'4,2 mm');
  assert.equal(get('wpRainSummary({precipitation:2},"mm")[0]'),'Quantità 2 mm');
  assert.equal(get('wpRainSummary({precipitation_probability:45},"mm")[0]'),'Probabilità precipitazioni 45%');
});
test('zero precipitation is valid and missing fields are omitted',()=>{
  assert.equal(get('wpRainData({precipitation_probability:0,precipitation:0},"mm").probability'),'0%');
  assert.equal(get('wpRainData({precipitation_probability:0,precipitation:0},"mm").amount'),'0 mm');
  assert.equal(get('wpRainSummary({}, "mm").length'),0);
  assert.equal(get('wpRainData({precipitation:2},"").amount'),null);
  assert.equal(get('wpRainData({precipitation_probability:110},"mm").probability'),null);
  assert.equal(get('wpRainData({precipitation:-1},"mm").amount'),null);
});
test('hourly forecast hides rain fields when unavailable and shows both when present',()=>{
  const rows=get('wpNextHours([{datetime:"2099-10-19T12:00:00Z",temperature:18,condition:"cloudy",precipitation_probability:70,precipitation:4.2}],new Date("2099-10-19T11:00:00Z"))');
  const html=get('wpHoursHTML') (rows, '°C','Europe/Rome',false,'mm');
  assert.match(html,/70%/);
  assert.match(html,/4,2 mm/);
  const missing=get('wpHoursHTML') ([{datetime:"2099-10-19T12:00:00Z",temperature:18}], '°C','Europe/Rome',false,'mm');
  assert.doesNotMatch(missing,/wp-hour-rain/);
  assert.doesNotMatch(missing,/Pioggia non disponibile/);
});

test('hourly cloud percentage is data-driven including zero and full cloud',()=>{
  assert.equal(get('wpCloudCoverage(17.2)'),'17,2%');
  assert.equal(get('wpCloudCoverage(100)'),'100%');
  assert.equal(get('wpCloudCoverage(0)'),'0%');
  assert.equal(get('wpCloudCoverage(null)'),null);
  assert.equal(get('wpCloudCoverage(-1)'),null);
  assert.equal(get('wpCloudCoverage(101)'),null);
});
test('hourly cloud appears when supplied and disappears when absent',()=>{
  const withCloud=get('wpHoursHTML')([{datetime:'2099-10-19T12:00:00Z',temperature:21.1,condition:'partlycloudy',cloud_coverage:17.2,precipitation:0}],'°C','Europe/Rome',false,'mm');
  assert.match(withCloud,/title="Copertura nuvolosa"/);
  assert.match(withCloud,/Nuvole<\/span><span>17,2%/);
  assert.match(withCloud,/0 mm/);
  const withoutCloud=get('wpHoursHTML')([{datetime:'2099-10-19T13:00:00Z',temperature:19}],'°C','Europe/Rome',false,'mm');
  assert.doesNotMatch(withoutCloud,/wp-hour-cloud/);
});
test('daily weather details avoid duplicate rain separators',()=>{
  const card=Object.create(get('WeatherPulseCard.prototype'));
  const day=new Date(Date.now()+2*86400000).toISOString();
  card._hass={config:{latitude:45.4,longitude:9.1,time_zone:'Europe/Rome',unit_system:{accumulated_precipitation:'mm'}}};
  card._config={moon_entity:'',alert_entity:'',show_hourly_chart:false};
  card._forecastState={daily:'ready',hourly:'idle'};
  card._forecast={daily:[{datetime:day,temperature:17,templow:16,condition:'rainy',precipitation:27.2}],hourly:[]};
  card._zone=()=> 'Europe/Rome';
  card._alert=()=>({status:'unknown'});
  const entity={state:'rainy',attributes:{temperature:17,precipitation_unit:'mm'}};
  const withRain=card._popup(entity);
  assert.match(withRain,/Max 17°C ·\s*Min 16°C · Quantità 27,2 mm/);
  assert.doesNotMatch(withRain,/Min 16°C\s*·\s*·/);
  card._forecast.daily=[{datetime:day,temperature:17,templow:16,condition:'rainy'}];
  const withoutRain=card._popup(entity);
  assert.match(withoutRain,/Max 17°C ·\s*Min 16°C<\/div>/);
  assert.doesNotMatch(withoutRain,/Min 16°C\s*·/);
});
test('current conditions show cloud only when present',()=>{
  const card=Object.create(get('WeatherPulseCard.prototype'));
  card._hass={config:{latitude:45.4,longitude:9.1,time_zone:'Europe/Rome',unit_system:{accumulated_precipitation:'mm'}}};
  card._config={moon_entity:'',alert_entity:'',show_hourly_chart:false};
  card._forecastState={daily:'idle',hourly:'idle'};
  card._forecast={daily:[],hourly:[]};
  card._zone=()=> 'Europe/Rome';
  card._alert=()=>({status:'unknown'});
  assert.match(card._popup({state:'cloudy',attributes:{cloud_coverage:85}}),/>Copertura nuvolosa<\/span><strong>85%<\/strong>/);
  assert.doesNotMatch(card._popup({state:'cloudy',attributes:{}}),/>Copertura nuvolosa<\/span>/);
});

test('weather card fits the dashboard column and adapts narrow cards',()=>{
  const css=get('WP_CSS');
  assert.match(css,/:host\{[^}]*width:100%;max-width:100%;min-width:0/);
  assert.match(css,/\.wp-container\{[^}]*container-type:inline-size/);
  assert.doesNotMatch(css,/:host\{[^}]*container-type:inline-size/);
  assert.match(css,/\.wp-shell\{[^}]*width:100%;max-width:100%;min-width:0/);
  assert.match(css,/@container \(max-width:380px\)/);
  assert.match(css,/@container \(max-width:310px\)/);
  assert.match(css,/@container \(max-width:310px\)\{[^}]*\.wp-shell\{[^}]*padding:10px/);
});
test('popup has compact viewport boundaries and a scrollable interior',()=>{
  const css=get('WP_CSS');
  assert.match(css,/\.wp-dialog\{[^}]*width:min\(390px,100%\)/);
  assert.doesNotMatch(css,/@media\(max-width:599px\)\{\.wp-backdrop/);
  assert.match(css,/\.wp-dialog\{[^}]*max-height:min\(88dvh,680px\)/);
  assert.match(css,/\.wp-dialog\{[^}]*display:flex;flex-direction:column;[^}]*overflow:hidden/);
  assert.match(css,/\.wp-mbody\{overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain/);
  assert.doesNotMatch(css,/\.wp-dialog\{[^}]*max-height:90vh/);
  assert.match(css,/\.wp-backdrop\{[^}]*safe-area-inset-top/);
  assert.match(css,/\.wp-backdrop\{[^}]*safe-area-inset-right[^}]*safe-area-inset-bottom[^}]*safe-area-inset-left/);
  assert.match(css,/\.wp-mhead\{flex:none;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 16px 12px 18px;background:var\(--wp-bg\);border-bottom:1px solid var\(--wp-line\)\}/);
  assert.match(css,/\.wp-hour-scroll\{[^}]*overflow-x:auto;max-width:100%/);
});

test('popup remains viewport-positioned outside its responsive layout container',()=>{
  const css=get('WP_CSS');
  assert.match(css,/\.wp-container\{[^}]*container-type:inline-size/);
  assert.doesNotMatch(css,/:host\{[^}]*container-type:inline-size/);
  assert.match(css,/\.wp-backdrop\{--wp-btn-fg:var\(--wp-accent\);--wp-accent:#0a7156;/);
  assert.match(css,/\.wp-shell\.wp-dark,\.wp-backdrop\.wp-dark\{--wp-btn-fg:var\(--wp-fg\);--wp-accent:/);
  const card=Object.create(get('WeatherPulseCard.prototype'));
  card.isConnected=true;
  card._config=get('wpConfig({weather_entity:"weather.meteo"})');
  card._hass={themes:{darkMode:false},config:{latitude:45.4,longitude:9.1,time_zone:'Europe/Rome'},states:{'weather.meteo':{state:'cloudy',attributes:{temperature:17}}}};
  card._forecast={daily:[],hourly:[]};card._forecastState={daily:'idle',hourly:'idle'};
  card._open=true;card._lastSignature='';
  card.shadowRoot={innerHTML:'',activeElement:null,querySelector(){return null;}};
  card._paint();
  const markup=card.shadowRoot.innerHTML;
  assert.match(markup,/<div class="wp-container"><div class="wp-shell wp-light">/);
  assert.match(markup,/<\/button><\/div>\s*<\/div><\/div>\s*<div class="wp-backdrop wp-light"/);
  assert.match(markup,/<div class="wp-foot"><button type="button" class="wp-detail"/);
  assert.match(markup,/class="wp-dialog" role="dialog" aria-modal="true" aria-labelledby="wp-mt"/);
  assert.match(markup,/<div class="wp-mhead"><h2 class="wp-mtitle" id="wp-mt">Dettagli meteo<\/h2>/);
  assert.match(markup,/<div class="wp-mbody">/);
});

test('tablet modal has camera-grid style width and a fixed header',()=>{
  const css=get('WP_CSS');
  assert.match(css,/\.wp-dialog\{width:min\(390px,100%\);[^}]*border-radius:26px;[^}]*overflow:hidden/);
  assert.match(css,/\.wp-dialog\{[^}]*max-height:min\(88dvh,680px\)/);
  assert.match(css,/\.wp-mbody\{overflow-y:auto;overflow-x:hidden/);
  assert.match(css,/\.wp-mhead\{flex:none;[^}]*background:var\(--wp-bg\)/);
  assert.doesNotMatch(css,/\.wp-dialog-head/);
});
test('phone popup keeps the shared size and tablet landscape remains inside viewport',()=>{
  const css=get('WP_CSS');
  assert.doesNotMatch(css,/68dvh|68vh/);
  assert.match(css,/@media\(max-height:480px\)\{\.wp-dialog\{max-height:calc\(100vh - 32px\);max-height:calc\(100dvh - 32px\)/);
});

test('popup keeps focus handling, scroll lock and scroll position across repaints',()=>{
  for(const piece of ["document.addEventListener('keydown', this._onKey)","document.removeEventListener('keydown', this._onKey)","event.key === 'Escape'","_lockScroll()","'wp-hour-scroll'","keep.body","keep.hours","keep.days","this._pendingFocus = 'open'","this._pendingFocus = 'close'"])
    assert.ok(src.includes(piece),piece);
});
