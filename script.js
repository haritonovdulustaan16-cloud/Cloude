const apiKey = '05efea256b39746e284f72657e030c00';
const cityInput = document.getElementById('city');
const searchBtn = document.getElementById('search');
const geoBtn = document.getElementById('geo');
const result = document.getElementById('result');

searchBtn.addEventListener('click', () => searchByCity());
cityInput.addEventListener('keypress', e => { if (e.key === 'Enter') searchByCity(); });
geoBtn.addEventListener('click', () => searchByGeo());

window.addEventListener('load', () => searchByGeo());

// Перевод страны в русское название (для популярных)
const countryNames = {
  RU: 'Россия', UA: 'Украина', BY: 'Беларусь', KZ: 'Казахстан',
  US: 'США', GB: 'Великобритания', DE: 'Германия', FR: 'Франция',
  IT: 'Италия', ES: 'Испания', CN: 'Китай', JP: 'Япония',
  TR: 'Турция', PL: 'Польша', UA_: 'Украина', MD: 'Молдова',
  GE: 'Грузия', AM: 'Армения', AZ: 'Азербайджан', UZ: 'Узбекистан',
  KG: 'Киргизия', TJ: 'Таджикистан', TM: 'Туркменистан', FI: 'Финляндия'
};

function searchByCity() {
  const city = cityInput.value.trim();
  if (!city) { result.innerHTML = '<p class="error">Введите город</p>'; return; }
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric&lang=ru`;
  loadWeather(url);
}

function searchByGeo() {
  if (!navigator.geolocation) {
    result.innerHTML = '<p class="error">Геолокация не поддерживается</p>';
    return;
  }
  result.innerHTML = '<p class="loading">Определяем местоположение…</p>';
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude, longitude } = pos.coords;
      const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric&lang=ru`;
      loadWeather(url);
    },
    () => { result.innerHTML = '<p class="error">Разрешите доступ к геолокации</p>'; }
  );
}

async function loadWeather(url) {
  result.innerHTML = '<p class="loading">Загрузка…</p>';
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Город не найден');
    const data = await response.json();
    renderForecast(data);
  } catch (err) {
    result.innerHTML = `<p class="error">${err.message}</p>`;
  }
}

function renderForecast(data) {
  const cityName = data.city.name;
  const countryCode = data.city.country;
  const countryName = countryNames[countryCode] || countryCode;

  const byDay = {};
  data.list.forEach(item => {
    const date = new Date(item.dt * 1000);
    const key = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', weekday: 'short' });
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(item);
  });

  const dayKeys = Object.keys(byDay).slice(0, 5);

  let html = `<div class="city-title">${cityName} <span style="font-size:14px;color:#666;">(${countryName})</span></div>`;
  html += `<div class="tip">${getTip(data.list)}</div>`;

  dayKeys.forEach(dayKey => {
    const hours = byDay[dayKey];
    const temps = hours.map(h => h.main.temp);
    const min = Math.round(Math.min(...temps));
    const max = Math.round(Math.max(...temps));
    const noon = hours.find(h => h.dt_txt.includes('12:00:00')) || hours[0];
    const emoji = getEmoji(noon.weather[0].main, noon.main.temp);

    html += `<div class="day-block" onclick="toggleDay(this)">`;
    html += `<div class="day-header">`;
    html += `<div class="day-title"><span class="day-icon">${emoji}</span>${dayKey}</div>`;
    html += `<div class="day-temp">${min}° / ${max}°</div>`;
    html += `</div>`;
    html += `<div class="day-details"><div class="hours-row">`;

    hours.forEach(item => {
      const time = new Date(item.dt * 1000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      const temp = Math.round(item.main.temp);
      const hourEmoji = getEmoji(item.weather[0].main, item.main.temp);
      html += `
        <div class="hour-card">
          <div>${time}</div>
          <div class="hour-temp">${hourEmoji} ${temp}°</div>
        </div>
      `;
    });

    html += `</div></div></div>`;
  });

  result.innerHTML = html;

  const firstDay = document.querySelector('.day-block');
  if (firstDay) firstDay.classList.add('open');
}

function toggleDay(el) {
  el.classList.toggle('open');
}

function getEmoji(main, temp) {
  if (temp <= 0 && (main === 'Rain' || main === 'Drizzle')) return '❄️';
  if (temp <= 0 && main === 'Thunderstorm') return '🌨️';

  const map = {
    Clear: '☀️',
    Clouds: '☁️',
    Rain: '🌧️',
    Drizzle: '🌦️',
    Thunderstorm: '⛈️',
    Snow: '❄️',
    Mist: '🌫️',
    Fog: '🌫️',
    Haze: '🌫️'
  };
  return map[main] || '🌤️';
}

function getTip(list) {
  const dayAvg = {};
  list.forEach(item => {
    const key = new Date(item.dt * 1000).toLocaleDateString('ru-RU');
    if (!dayAvg[key]) dayAvg[key] = [];
    dayAvg[key].push(item.main.temp);
  });

  const days = Object.keys(dayAvg).slice(0, 3);
  if (days.length < 2) return 'Прогноз на ближайшие дни';

  const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  const today = avg(dayAvg[days[0]]);
  const tomorrow = avg(dayAvg[days[1]]);
  const diff = tomorrow - today;

  if (diff >= 3) return `🌡 Завтра ожидается потепление на ${Math.round(diff)}°`;
  if (diff <= -3) return `❄️ Завтра ожидается похолодание на ${Math.round(-diff)}°`;
  if (diff > 0) return '🌤 Завтра будет чуть теплее';
  if (diff < 0) return '🌥 Завтра будет чуть прохладнее';
  return '☀️ Погода остаётся стабильной';
}