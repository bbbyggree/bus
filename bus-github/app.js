const $ = (id) => document.getElementById(id);
let selected = null, rows = [], busy = false, timer = null;
function loadStored(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function store(key, data) { try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* storage optional */ } }
let favorites = loadStored('bus-favorites', []);
if (!Array.isArray(favorites)) favorites = [];
function el(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
async function api(params) {
  const response = await fetch('/api/bus?' + new URLSearchParams(params));
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error || '조회에 실패했습니다.');
  return data;
}
function showMessage(text, error = false) { $('message').textContent = text; $('message').className = error ? 'error' : ''; $('message').hidden = !text; }
function render() {
  const filter = $('route-filter').value.trim().toLowerCase();
  const list = rows.filter(row => String(row.routeno).toLowerCase().includes(filter));
  list.sort($('sort').value === 'route' ? (a,b) => String(a.routeno).localeCompare(String(b.routeno), 'ko', { numeric: true }) : (a,b) => Number(a.arrtime) - Number(b.arrtime));
  $('arrivals').replaceChildren();
  for (const row of list) {
    const card = el('article', 'arrival'), info = el('div'), number = el('div', 'route-number', row.routeno ?? '미상');
    number.append(el('span', 'badge', row.routetp || '버스'));
    info.append(number, el('div', 'route-detail', `${row.vehicletp || '차량 정보 없음'} · ${row.arrprevstationcnt ?? '?'}개 정류소 전`));
    const secs = Number(row.arrtime), valid = Number.isFinite(secs) && secs >= 0;
    const eta = el('div', 'eta' + (valid && secs < 120 ? ' soon' : ''), !valid ? '시간 미제공' : secs < 60 ? '곧 도착' : `${Math.floor(secs / 60)}분 ${secs % 60}초`);
    eta.append(el('small', '', valid ? '도착 예정' : '정보 확인 중'));
    card.append(info, eta); $('arrivals').append(card);
  }
  if (rows.length) showMessage(list.length ? '' : '해당 번호의 버스가 없습니다.');
}
function renderFavorites() {
  $('favorites').replaceChildren();
  if (!favorites.length) $('favorites').append(el('p', 'hint', '조회한 정류소를 저장해 빠르게 찾아보세요.'));
  favorites.forEach((stop, index) => {
    const row = el('div', 'favorite'), button = el('button', '', stop.name || stop.nodeId), remove = el('button', 'delete', '×');
    button.append(el('small', '', `${stop.cityCode} · ${stop.nodeId}`));
    button.onclick = () => { if (busy) return; $('city-code').value = stop.cityCode; $('node').value = stop.nodeId; lookup(stop); };
    remove.setAttribute('aria-label', `${stop.name || stop.nodeId} 즐겨찾기 삭제`);
    remove.onclick = () => { favorites.splice(index, 1); store('bus-favorites', favorites); renderFavorites(); };
    row.append(button, remove); $('favorites').append(row);
  });
}
async function lookup(stop) {
  if (busy) return;
  clearTimeout(timer);
  busy = true; $('search').disabled = true; $('refresh').disabled = true; $('save').disabled = true;
  rows = []; render(); $('updated').textContent = ''; showMessage('도착 정보를 불러오고 있습니다…'); $('live-label').textContent = '조회 중';
  selected = { cityCode: stop.cityCode, nodeId: stop.nodeId };
  $('save').textContent = favorites.some(s => s.cityCode === selected.cityCode && s.nodeId === selected.nodeId) ? '★ 저장됨' : '☆ 저장';
  $('stop-name').textContent = stop.nodeId;
  $('stop-meta').textContent = `도시코드 ${stop.cityCode} · ${stop.nodeId}`;
  try {
    const data = await api({ action: 'arrivals', ...selected });
    rows = data.items; selected.name = rows[0]?.nodenm || stop.nodeId;
    $('stop-name').textContent = selected.name;
    $('live-label').textContent = `${rows.length}대 도착 예정`;
    $('updated').textContent = `${new Date(data.updatedAt).toLocaleTimeString('ko-KR')} 기준${data.truncated ? ' · 일부 결과만 표시' : ''}`;
    showMessage(rows.length ? '' : '현재 도착 예정인 버스가 없습니다. 도시코드와 정류소 ID도 확인해 주세요.');
    store('bus-last-stop', selected); render();
  } catch (error) { $('live-label').textContent = '조회 실패'; showMessage(error.message, true); }
  finally { busy = false; $('search').disabled = false; $('refresh').disabled = false; $('save').disabled = false; schedule(); }
}
function schedule() { clearTimeout(timer); if ($('auto').checked && selected && !document.hidden) timer = setTimeout(() => lookup(selected), 30000); }
$('search-form').onsubmit = (event) => { event.preventDefault(); lookup({ cityCode: $('city-code').value.trim() || $('city').value, nodeId: $('node').value.trim() }); };
$('refresh').onclick = () => selected && lookup(selected);
$('auto').onchange = schedule;
document.addEventListener('visibilitychange', schedule);
$('route-filter').oninput = render; $('sort').onchange = render;
$('save').onclick = () => { if (!selected) return; if (!favorites.some(s => s.cityCode === selected.cityCode && s.nodeId === selected.nodeId)) { favorites.push({ ...selected }); store('bus-favorites', favorites); renderFavorites(); } $('save').textContent = '★ 저장됨'; };
renderFavorites();
const last = loadStored('bus-last-stop', null);
if (last?.cityCode && last?.nodeId) { $('city-code').value = last.cityCode; $('node').value = last.nodeId; }
api({ action: 'cities' }).then(data => {
  if (!data.items.length) throw new Error('도시 목록이 비어 있습니다.');
  $('city').replaceChildren(...data.items.map(city => { const option = el('option', '', `${city.cityname} (${city.citycode})`); option.value = city.citycode; return option; }));
  if ([...$('city').options].some(option => option.value === '25')) $('city').value = '25';
  $('city-status').textContent = `${data.items.length}개 도시를 불러왔습니다.`;
}).catch(error => { $('city-status').textContent = `도시 목록 로딩 실패: ${error.message} 도시코드를 직접 입력할 수 있습니다.`; });
