const state = {
  cafes: [...(window.CAFES || [])],
  search: '',
  area: 'all',
  tag: 'all'
};

const cards = document.querySelector('#cards');
const searchInput = document.querySelector('#searchInput');
const areaFilter = document.querySelector('#areaFilter');
const tagFilter = document.querySelector('#tagFilter');
const totalCount = document.querySelector('#totalCount');
const importDialog = document.querySelector('#importDialog');
const csvInput = document.querySelector('#csvInput');

function mapsUrl(cafe) {
  if (cafe.mapUrl) {
    return cafe.mapUrl;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cafe.address || cafe.name)}`;
}

function telUrl(phone) {
  const cleaned = String(phone || '').replace(/[^0-9+]/g, '');
  return cleaned ? `tel:${cleaned}` : '#';
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'zh-Hant')
  );
}

function renderFilters() {
  const currentArea = state.area;
  const currentTag = state.tag;

  const areas = unique(state.cafes.map(cafe => cafe.area));
  const tags = unique(state.cafes.flatMap(cafe => cafe.tags || []));

  areaFilter.innerHTML =
    '<option value="all">全部地區</option>' +
    areas.map(area => `<option value="${area}">${area}</option>`).join('');

  tagFilter.innerHTML =
    '<option value="all">全部標籤</option>' +
    tags.map(tag => `<option value="${tag}">${tag}</option>`).join('');

  state.area = areas.includes(currentArea) ? currentArea : 'all';
  state.tag = tags.includes(currentTag) ? currentTag : 'all';

  areaFilter.value = state.area;
  tagFilter.value = state.tag;
}

function filteredCafes() {
  const q = state.search.trim().toLowerCase();

  return state.cafes.filter(cafe => {
    const haystack = [
      cafe.name,
      cafe.area,
      cafe.address,
      cafe.phone,
      cafe.hours,
      cafe.note,
      ...(cafe.tags || [])
    ]
      .join(' ')
      .toLowerCase();

    return (
      (!q || haystack.includes(q)) &&
      (state.area === 'all' || cafe.area === state.area) &&
      (state.tag === 'all' || (cafe.tags || []).includes(state.tag))
    );
  });
}

function renderCards() {
  const list = filteredCafes();

  if (totalCount) {
    totalCount.textContent = state.cafes.length;
  }

  if (!list.length) {
    cards.innerHTML = '<div class="empty">沒有符合條件的咖啡廳。</div>';
    return;
  }

  cards.innerHTML = list.map(cafe => `
    <article
      class="card ${cafe.image ? 'card--photo' : ''}"
      ${cafe.image ? `style="--card-image: url('${cafe.image}');"` : ''}
    >
      <div class="card-top">
        <div>
          <p class="area">${cafe.area || '未分類'}</p>
          <h2>${cafe.name}</h2>
        </div>

        <a class="nav-btn" href="${mapsUrl(cafe)}" target="_blank" rel="noopener">
          導航
        </a>
      </div>

      <div class="info-list">
        <p>
          <span>營業時間</span>
          ${cafe.hours || '待補'}
        </p>

        <p>
          <span>地點</span>
          ${cafe.address || '待補'}
        </p>

        <p>
          <span>電話</span>
          ${cafe.phone && cafe.phone !== 'X'
      ? `<a href="${telUrl(cafe.phone)}">${cafe.phone}</a>`
      : '待補'}
        </p>
      </div>

      ${(cafe.tags || []).length
      ? `<div class="tags">${cafe.tags.map(tag => `<span>${tag}</span>`).join('')}</div>`
      : ''}

      ${cafe.note ? `<p class="note">${cafe.note}</p>` : ''}
    </article>
  `).join('');
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function parseCsv(text) {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [name, area, address, phone, hours, tags, note] = parseCsvLine(line);

      return {
        name,
        area,
        address,
        phone,
        hours,
        tags: (tags || '').split(';').map(tag => tag.trim()).filter(Boolean),
        note
      };
    })
    .filter(cafe => cafe.name);
}

function download(filename, text) {
  const blob = new Blob([text], { type: 'text/javascript;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

searchInput.addEventListener('input', event => {
  state.search = event.target.value;
  renderCards();
});

areaFilter.addEventListener('change', event => {
  state.area = event.target.value;
  renderCards();
});

tagFilter.addEventListener('change', event => {
  state.tag = event.target.value;
  renderCards();
});

document.querySelector('#openImport').addEventListener('click', () => {
  importDialog.showModal();
});

document.querySelector('#applyImport').addEventListener('click', () => {
  const imported = parseCsv(csvInput.value);

  if (imported.length) {
    state.cafes = imported;
    state.area = 'all';
    state.tag = 'all';

    renderFilters();
    renderCards();
    importDialog.close();
  }
});

document.querySelector('#downloadData').addEventListener('click', () => {
  const imported = parseCsv(csvInput.value);
  const data = imported.length ? imported : state.cafes;

  download('data.js', `window.CAFES = ${JSON.stringify(data, null, 2)};\n`);
});

renderFilters();
renderCards();