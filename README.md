# Weather Pulse Card

[![TikTok | Segui](assets/tiktok-segui.svg)](https://www.tiktok.com/@luigi.regolo)
[![License: GPL-3.0-only](https://img.shields.io/badge/license-GPL--3.0--only-blue?style=flat-square)](LICENSE)
[![HACS](https://img.shields.io/badge/HACS-Repository-41BDF5?style=flat-square)](https://my.home-assistant.io/redirect/hacs_repository/?owner=luigi-regolo&repository=weather-pulse-card&category=plugin)
[![GitHub Stars](https://img.shields.io/github/stars/luigi-regolo/weather-pulse-card?style=flat-square)](https://github.com/luigi-regolo/weather-pulse-card/stargazers)

## Overview

**Weather Pulse Card** is a custom weather card for Home Assistant dashboards, designed with a minimalist interface inspired by the Edera Light and Dark visual styles.

It brings together current weather conditions, daily forecasts, sunrise and sunset information, and optional weather alerts in a compact, responsive layout.

The card uses weather entities and forecasts already available in Home Assistant. It does not require a dedicated account, paid weather APIs, or additional cloud services.

## Preview

![Weather Pulse Card — Edera Light dashboard preview](assets/weather-pulse-card-preview.webp)

*Weather Pulse Card interface in Edera Light mode. The displayed weather information depends on the configured Home Assistant integration.*

## Features

- **Current weather:** Temperature, weather conditions, date, and time.
- **Three-day forecast:** Forecast conditions and daily minimum and maximum temperatures.
- **Hourly forecast:** The next eight hours, weather icons, temperatures, and an optional temperature trend chart.
- **Precipitation:** Forecast probability (%) and precipitation amount (mm or another supported unit), when provided by the weather source.
- **Cloud coverage:** Percentage shown when available from the weather entity or hourly forecasts.
- **Sunrise and sunset:** Solar information based on the location and time zone configured in Home Assistant.
- **Solar details:** Daylight duration and a visual representation of the sun's progress.
- **Optional moon phase:** Information from a compatible Home Assistant sensor.
- **Optional weather alerts:** Indicators and available details from compatible sensors or binary sensors.
- **Weather conditions:** Humidity, wind speed, atmospheric pressure, and other supported weather data.
- **Edera appearance:** Automatic, Light, and Dark themes with Home Assistant Material Design Icons.
- **Visual configuration:** Entity selection and setting customization through the dashboard editor.
- **Responsive layout:** A responsive interface for desktop, smartphone, and tablet dashboards.

Displayed information depends on the capabilities of the configured weather integration. Missing data is not estimated or replaced with invented values.

## Installation

### HACS

Weather Pulse Card can be installed through HACS using the custom GitHub repository.

[![Open Weather Pulse Card in HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=luigi-regolo&repository=weather-pulse-card&category=plugin)

1. Open **HACS** in Home Assistant.
2. Search for **Weather Pulse Card** in the catalog.
3. If it is not available in the default catalog, open the HACS menu and select **Custom repositories**.
4. Enter the repository URL:

   `https://github.com/luigi-regolo/weather-pulse-card`

5. Select **Dashboard** as the repository type and add it.
6. Find **Weather Pulse Card** in HACS and download it.
7. Reload the Home Assistant dashboard if necessary.
8. Add the card using the visual editor.

The repository contains `hacs.json` and the distributable JavaScript module `dist/weather-pulse-card.js`.

**Note:** The HACS badge provides a shortcut to the repository in Home Assistant but does not necessarily indicate inclusion in the default HACS catalog.

### Manual installation

1. Download `dist/weather-pulse-card.js` from the GitHub repository.
2. Copy it to the `www` directory of your Home Assistant configuration as `weather-pulse-card.js`.
3. Open **Settings → Dashboards → Resources** in Home Assistant.
4. Add the following resource:

   `/local/weather-pulse-card.js`

5. Select **JavaScript module** as the resource type.
6. Reload the dashboard and add the custom card.

If the `www` directory was just created, Home Assistant may need to be restarted before the file becomes accessible.

## Configuration and Usage

### Visual editor

Open a dashboard in edit mode, add **Weather Pulse Card**, and configure the available settings.

The editor includes three main sections:

- **Weather:** Select the weather entity, configure sun and moon options, and set optional weather alerts.
- **Appearance:** Customize the title, header label, Edera theme, and optional location display.
- **Advanced:** Control the display of the hourly temperature chart.

A Home Assistant `weather.*` entity is required to display weather conditions and forecasts.

### Example YAML configuration

```yaml
type: custom:weather-pulse-card
weather_entity: weather.example_forecast
theme_mode: auto
show_hourly_chart: true
show_location: false
```

Replace `weather.example_forecast` with an existing weather entity in your Home Assistant installation.

### Configuration options

| Option | Description |
|---|---|
| `weather_entity` | Home Assistant weather entity (`weather.*`). |
| `theme_mode` | `auto`, `light`, or `dark`. |
| `title` | Main card title. |
| `eyebrow` | Small header label above the title. |
| `show_hourly_chart` | Enables or disables the hourly temperature chart. |
| `show_location` | Optionally displays the location. Disabled by default. |
| `location_label` | Custom location text. |
| `moon_entity` | Optional moon-phase sensor (`sensor.*`). |
| `alert_entity` | Optional weather-alert sensor (`sensor.*` or `binary_sensor.*`). |

Sunrise and sunset information uses the location and time zone configured in Home Assistant, with solar data from the Sun integration where available.

### Weather data availability

Weather Pulse Card uses data provided by the configured Home Assistant integrations.

- **Precipitation probability (%):** Displayed only when supplied by the forecast source.
- **Precipitation amount:** Displayed with an available measurement unit.
- **Cloud coverage (%):** Displayed when the corresponding value is available.
- **Moon phase:** Available through a configured compatible sensor.
- **Weather alerts:** Displayed when a compatible source is configured.

The card does not automatically calculate precipitation probability from rainfall amounts, humidity, or cloud coverage.

Some weather providers supply forecast precipitation amounts without a corresponding percentage probability. This difference depends on the data source.

## Compatibility and Requirements

Weather Pulse Card requires:

- Home Assistant with support for custom JavaScript dashboard modules.
- A configured `weather.*` entity.
- A weather integration providing daily and/or hourly forecasts for the corresponding features.
- A configured location and time zone in Home Assistant for solar information.

Optional:

- A compatible moon-phase sensor.
- A compatible weather-alert sensor or binary sensor.

No specific minimum Home Assistant version has been independently verified or declared for this repository.

The card uses native Home Assistant functionality and does not require additional JavaScript libraries, subscriptions, or dedicated paid services.

## Data Sources, Privacy and Security

Weather Pulse Card uses entities and weather information available through Home Assistant.

The card does not implement advertising, user tracking, telemetry, direct external weather API requests, or device GPS location requests.

Solar information is calculated using the geographical coordinates and time zone already configured in Home Assistant.

The location label is hidden by default and can be enabled by the user.

Home Assistant weather integrations may communicate with external services under their respective privacy policies and terms of use.

### Weather alerts

Weather alerts are provided for informational purposes only.

Their availability, accuracy, severity, and validity period depend on the configured source.

An unknown or unavailable status must not be interpreted as confirmation that no weather alerts exist.

For emergency decisions and official warnings, always refer to the relevant public authorities.

## Copyright & License

Copyright © 2026 luigi-regolo.

Original project created and maintained by **luigi-regolo**.

Licensed under the **GNU General Public License version 3 only (GPL-3.0-only)**.

See the [LICENSE](LICENSE) file for the complete license terms.

The software is provided without warranty to the extent permitted by applicable law.
