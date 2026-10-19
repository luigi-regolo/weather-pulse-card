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
test('visual editor has five panels',()=>{
  const editor=get('Object.create(WeatherPulseCardEditor.prototype)');
  editor._config=get('wpConfig()');editor._hass={states:{}};
  for(const tab of ['meteo','sole','allerte','aspetto','avanzate']){
    editor._tab=tab;assert.ok(editor._content().length>90,tab);
  }
});
