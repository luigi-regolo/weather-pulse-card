import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src=fs.readFileSync(new URL('../src/weather-pulse-card.js',import.meta.url),'utf8');
const dist=fs.readFileSync(new URL('../dist/weather-pulse-card.js',import.meta.url),'utf8');
const context=vm.createContext({
  HTMLElement:class {},customElements:{get(){return undefined;},define(){}},
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
test('three days after today',()=>{
  const x=get('wpNextDays([{datetime:"2026-10-19T00:00:00+02:00"},{datetime:"2026-10-20T00:00:00+02:00"},{datetime:"2026-10-21T00:00:00+02:00"},{datetime:"2026-10-22T00:00:00+02:00"}],new Date("2026-10-19T11:00:00Z"),"Europe/Rome")');
  assert.equal(x.length,3);
  assert.equal(x[0].day,'2026-10-20');
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
  assert.match(css,/\.wp-dialog-head strong\{flex:1;font-size:17px;font-weight:600/);
  assert.match(css,/\.wp-close\{display:flex;align-items:center;justify-content:center;line-height:0/);
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
  assert.match(css,/\.wp-detail\{display:inline-flex;align-items:center;justify-content:center;vertical-align:top/);
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
