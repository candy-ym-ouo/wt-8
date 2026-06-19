const http = require('http');

function req(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;
    if (data) options.headers['Content-Length'] = Buffer.byteLength(data);
    const req = http.request(options, (res) => {
      let chunks = '';
      res.on('data', (c) => chunks += c);
      res.on('end', () => { try { resolve(JSON.parse(chunks)); } catch (e) { resolve({ raw: chunks }); } });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function test() {
  const loginRes = await req('POST', '/api/auth/login', null, { identifier: 'admin', password: '123456' });
  const adminToken = loginRes.token;
  console.log('管理员登录成功');

  const events = await req('GET', '/api/events', adminToken);
  console.log('\n活动总数:', events.total);
  const eventId = events.events[events.events.length - 1].id;
  console.log('最新活动ID:', eventId);

  console.log('\n--- 调用报告接口 ---');
  const path = `/api/admin/events/${eventId}/report`;
  console.log('请求路径:', path);
  const report = await req('GET', path, adminToken);
  console.log('完整返回:', JSON.stringify(report, null, 2));
}

test().catch(e => console.error(e));
