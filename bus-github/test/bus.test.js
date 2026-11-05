import test from 'node:test';
import assert from 'node:assert/strict';
import { itemsOf, parseResponse, getData } from '../api/bus.js';
const response = body => JSON.stringify({ response: { header: { resultCode: '00', resultMsg: 'OK' }, body } });
test('빈 결과와 단건 및 복수 응답 정규화', () => {
  assert.deepEqual(itemsOf({ items: '' }), []);
  assert.deepEqual(itemsOf({ items: { item: { routeno: 5 } } }), [{ routeno: 5 }]);
  assert.deepEqual(itemsOf({ items: { item: [{ routeno: 5 }] } }), [{ routeno: 5 }]);
});
test('JSON 및 XML 인증 오류를 표시', () => {
  assert.throws(() => parseResponse('{"response":{"header":{"resultCode":"30","resultMsg":"INVALID KEY"}}}'), /30/);
  assert.throws(() => parseResponse('<returnReasonCode>30</returnReasonCode>'), /30/);
  assert.throws(() => parseResponse('unexpected'), /JSON/);
});
test('잘못된 조회 입력은 외부 요청 전에 거부', async () => {
  await assert.rejects(getData(new URL('http://localhost/api/bus?cityCode=no&nodeId=x')), /정확하게/);
});
test('페이지를 합치고 API 파라미터 및 초 단위 시간을 유지', async () => {
  process.env.DATA_GO_KR_SERVICE_KEY = 'test%2Bkey';
  let calls = 0;
  const mock = async url => {
    calls++;
    assert.equal(url.searchParams.get('serviceKey'), 'test+key');
    assert.equal(url.searchParams.get('nodeId'), 'DJB8001793');
    assert.equal(url.searchParams.get('cityCode'), '25');
    assert.equal(url.searchParams.get('pageNo'), String(calls));
    return { ok: true, text: async () => response({ totalCount: 2, items: { item: { routeno: calls, arrtime: 816 } } }) };
  };
  const data = await getData(new URL('http://localhost/api/bus?cityCode=25&nodeId=DJB8001793'), mock);
  assert.equal(data.items.length, 2); assert.equal(data.items[0].arrtime, 816); assert.equal(data.truncated, false);
});
test('도시 목록 단건도 배열로 반환', async () => {
  const data = await getData(new URL('http://localhost/api/bus?action=cities'), async () => ({ ok: true, text: async () => response({ items: { item: { citycode: 25, cityname: '대전' } } }) }));
  assert.equal(data.items[0].citycode, 25);
});
