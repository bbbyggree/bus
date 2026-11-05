const BASE = 'https://apis.data.go.kr/1613000/ArvlInfoInqireService/';
export function itemsOf(body) {
  const item = body?.items?.item;
  return !item ? [] : Array.isArray(item) ? item : [item];
}
export function parseResponse(raw) {
  let data;
  try { data = JSON.parse(raw); } catch {
    const code = raw.match(/<(?:returnReasonCode|resultCode)>([^<]*)</)?.[1];
    throw new Error(code ? `공공데이터 API 인증/서비스 오류 (${code}). 활용신청 승인과 인증키를 확인하세요.` : '공공데이터 API가 JSON 응답을 반환하지 않았습니다. 잠시 후 다시 시도하세요.');
  }
  const { header, body } = data.response || {};
  if (!header || !['00', '0'].includes(String(header.resultCode))) {
    throw new Error(`공공데이터 API 오류 (${header?.resultCode ?? 'UNKNOWN'}): ${header?.resultMsg ?? '응답 형식을 확인하세요.'}`);
  }
  return body || {};
}
export async function query(operation, params = {}, fetcher = fetch) {
  let key = process.env.DATA_GO_KR_SERVICE_KEY?.trim();
  if (!key) throw new Error('DATA_GO_KR_SERVICE_KEY가 없습니다. .env.local 또는 배포 환경변수를 설정하세요.');
  try { key = decodeURIComponent(key); } catch { /* raw key */ }
  const url = new URL(operation, BASE);
  url.search = new URLSearchParams({ serviceKey: key, _type: 'json', ...params });
  const response = await fetcher(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`공공데이터 API 연결 실패 (HTTP ${response.status}).`);
  return parseResponse(await response.text());
}
export async function getData(url, fetcher = fetch) {
  const action = url.searchParams.get('action') || 'arrivals';
  if (action === 'cities') {
    const body = await query('getCtyCodeList', {}, fetcher);
    return { items: itemsOf(body), updatedAt: new Date().toISOString() };
  }
  if (action !== 'arrivals') throw new Error('지원하지 않는 조회입니다.');
  const cityCode = url.searchParams.get('cityCode') || '';
  const nodeId = url.searchParams.get('nodeId')?.trim() || '';
  if (!/^\d{1,9}$/.test(cityCode) || !/^[A-Za-z0-9_-]{1,40}$/.test(nodeId)) throw new Error('도시코드와 TAGO 정류소 ID를 정확하게 입력하세요.');
  const items = [];
  let totalCount = 0;
  for (let pageNo = 1; pageNo <= 10; pageNo++) {
    const body = await query('getSttnAcctoArvlPrearngeInfoList', { cityCode, nodeId, pageNo: String(pageNo), numOfRows: '100' }, fetcher);
    const page = itemsOf(body);
    items.push(...page);
    totalCount = Number(body.totalCount ?? items.length);
    if (!page.length || items.length >= totalCount) break;
  }
  return { items, totalCount, truncated: items.length < totalCount, cityCode, nodeId, updatedAt: new Date().toISOString() };
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.statusCode = 405; res.setHeader('Allow', 'GET'); return res.end(JSON.stringify({ error: 'GET 요청만 지원합니다.' })); }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    res.end(JSON.stringify(await getData(new URL(req.url, 'http://localhost'))));
  } catch (error) {
    res.statusCode = 502;
    const message = error.name === 'TimeoutError' ? '응답 대기시간을 초과했습니다. 다시 조회하세요.' : error.message === 'fetch failed' ? 'API 서버에 연결할 수 없습니다. 네트워크 상태를 확인하세요.' : error.message;
    res.end(JSON.stringify({ error: message }));
  }
}
