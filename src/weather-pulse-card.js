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
    this._paint();
  }
  disconnectedCallback() {
    this._media?.removeEventListener?.('change', this._onAppearance);
    if (this._clockTimer !== null) window.clearInterval(this._clockTimer);
    this._clockTimer = null;
  }
  setConfig(raw) { this._config=wpConfig(raw); this._lastSignature=''; this._paint(); }
  set hass(hass) { this._hass=hass; this._paint(); }
  getCardSize() { return 3; }
  _weather() { return this._hass?.states?.[this._config.weather_entity]; }
  _isDark() {
    return this._config.theme_mode === 'dark' ||
      (this._config.theme_mode === 'auto' && (typeof this._hass?.themes?.darkMode === 'boolean' ? this._hass.themes.darkMode : !!this._media?.matches));
  }
  _popup(entity) {
    const a = wpKnown(entity) ? entity.attributes || {} : {};
    const tempUnit = wpText(a.temperature_unit || this._hass?.config?.unit_system?.temperature || '°C', 8);
    const metrics = [
      ['Temperatura', wpTemp(a.temperature, tempUnit)],
      ['Temperatura percepita', wpTemp(a.apparent_temperature, tempUnit)],
      ['Umidità', wpMetric(a.humidity, '%')],
      ['Vento', wpMetric(a.wind_speed, a.wind_speed_unit ? ' ' + wpText(a.wind_speed_unit, 14) : '')],
      ['Pressione', wpMetric(a.pressure, a.pressure_unit ? ' ' + wpText(a.pressure_unit, 14) : '')]
    ];
    return `<div class="wp-backdrop" data-backdrop="1"><div class="wp-dialog" role="dialog" aria-modal="true" aria-label="Dettagli meteo"><div class="wp-dialog-head"><strong>Dettagli meteo</strong><button type="button" class="wp-close" data-close="1" aria-label="Chiudi">${wpIcon('close')}</button></div>${metrics.map(([label,value]) => `<div class="wp-metric"><span>${wpEscape(label)}</span><strong>${wpEscape(value)}</strong></div>`).join('')}</div></div>`;
  }
  _paint() {
    if (!this.isConnected) return;
    const entity = this._weather();
    const attrs = wpKnown(entity) ? entity.attributes || {} : {};
    const now = new Date();
    const signature = JSON.stringify([this._config,this._hass?.themes?.darkMode,this._isDark(),entity?.state,attrs,Math.floor(now.getTime()/60000),this._open]);
    if (signature === this._lastSignature) return;
    this._lastSignature = signature;
    const known = wpKnown(entity);
    const [icon, condition] = known ? wpCondition(entity.state) : ['weather-cloudy-alert','Meteo non disponibile'];
    const temperature = wpTemp(known ? attrs.temperature : null, wpText(attrs.temperature_unit || this._hass?.config?.unit_system?.temperature || '°C',8));
    const perceived = wpNumber(attrs.apparent_temperature);
    const location = this._config.show_location && this._config.location_label ?
      `<div class="wp-location">${wpIcon('map-marker-outline')}${wpEscape(this._config.location_label)}</div>` : '';
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
