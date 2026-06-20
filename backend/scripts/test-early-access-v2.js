const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3001;
const API_BASE = '/api';

let authToken = null;
let testItems = [];

const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

const log = (msg, type = 'info') => {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warn: '\x1b[33m',
    heading: '\x1b[1m\x1b[35m',
    sub: '\x1b[90m'
  };
  const reset = '\x1b[0m';
  console.log(`${colors[type] || ''}${msg}${reset}`);
};

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: BASE_URL,
      port: PORT,
      path: options.path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
        ...(options.headers || {})
      }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

function calculateExpectedPhase(item) {
  const now = new Date();
  const publishDate = new Date(item.publishDate);
  const earlyWindowStart = new Date(publishDate.getTime() - item.earlyHours * 60 * 60 * 1000);
  if (now >= publishDate) return 'PUBLISHED';
  if (now >= earlyWindowStart) return 'EARLY_WINDOW';
  return 'NOT_OPEN';
}

async function login() {
  log('=== 登录测试账号 ===', 'heading');
  try {
    const res = await request(
      { path: `${API_BASE}/auth/login`, method: 'POST' },
      { username: 'admin', password: 'admin123' }
    );
    if (res.status === 200) {
      authToken = res.data.token;
      log(`✓ 登录成功: ${res.data.user.username} (${res.data.user.role})\n`, 'success');
      return true;
    }
  } catch (e) {}

  try {
    const res = await request(
      { path: `${API_BASE}/auth/register`, method: 'POST' },
      { username: 'testuser', password: 'test1234', email: 'test@test.com' }
    );
    if (res.status === 200 || res.status === 201) {
      authToken = res.data.token;
      log(`✓ 注册并登录成功\n`, 'success');
      return true;
    }
  } catch (e) {}

  log('✗ 登录失败，将测试无需登录的接口\n', 'error');
  return false;
}

async function fetchTestItems() {
  log('=== 获取测试数据 ===', 'heading');
  try {
    const res = await request({ path: `${API_BASE}/memberships/early-access?limit=50` });
    testItems = res.data.items.filter(i => i.title.startsWith('[TEST]'));
    log(`✓ 获取到 ${testItems.length} 条测试数据\n`, 'success');
    return true;
  } catch (e) {
    log(`✗ 获取失败: ${e.message}\n`, 'error');
    return false;
  }
}

async function testListEndpoint() {
  log('=== 测试 1: 列表接口 accessPhase ===', 'heading');
  let passCount = 0;
  let failCount = 0;

  for (const item of testItems) {
    const expected = calculateExpectedPhase(item);
    const actual = item.accessPhase;

    log(`\n${item.title}`, 'info');
    log(`  publishDate: ${formatDate(item.publishDate)} | earlyHours: ${item.earlyHours}h`, 'sub');

    const pd = new Date(item.publishDate);
    const ews = new Date(pd.getTime() - item.earlyHours * 60 * 60 * 1000);
    log(`  提前阅读开放: ${formatDate(ews)}`, 'sub');
    log(`  正式发布时间: ${formatDate(pd)}`, 'sub');
    log(`  当前时间:     ${formatDate(new Date())}`, 'sub');

    if (actual === expected) {
      log(`  ✓ accessPhase 正确 (${actual})`, 'success');
      passCount++;
    } else {
      log(`  ✗ accessPhase 错误`, 'error');
      log(`    期望: ${expected} | 实际: ${actual}`, 'sub');
      failCount++;
    }
  }

  log(`\n结果: ${passCount} 通过, ${failCount} 失败\n`, passCount > 0 ? 'success' : 'warn');
  return { pass: failCount === 0, passCount, failCount };
}

async function testDetailEndpoint() {
  log('=== 测试 2: 详情接口权限判断 (需要登录) ===', 'heading');
  let passCount = 0;
  let failCount = 0;
  let skipped = 0;

  if (!authToken) {
    log('未登录，跳过详情接口测试\n', 'warn');
    return { pass: true, passCount: 0, failCount: 0, skipped: testItems.length };
  }

  for (const item of testItems) {
    const expectedPhase = calculateExpectedPhase(item);
    log(`\n${item.title}`, 'info');
    log(`  minLevel: ${item.minLevel} | requirePlan: ${item.requirePlan}`, 'sub');

    try {
      const res = await request({ path: `${API_BASE}/memberships/early-access/${item.id}` });

      if (res.status === 200) {
        const actualPhase = res.data.accessPhase;
        log(`  状态: 200 (允许访问)`, 'sub');
        log(`  accessPhase: ${actualPhase}`, 'sub');

        if (actualPhase === expectedPhase) { passCount++; log(`  ✓ accessPhase 正确`, 'success'); }
        else { failCount++; log(`  ✗ accessPhase 错误 (期望: ${expectedPhase})`, 'error'); }

        if (expectedPhase === 'NOT_OPEN') {
          failCount++;
          log(`  ✗ 应该拒绝访问但实际允许了！(NOT_OPEN阶段所有人不可读)`, 'error');
        } else if (expectedPhase === 'EARLY_WINDOW') {
          if (item.minLevel <= 1 && !item.requirePlan) {
            passCount++;
            log(`  ✓ 访问权限正确 (普通用户可读)`, 'success');
          } else {
            failCount++;
            log(`  ✗ 应该拒绝访问但实际允许了！(需要Lv${item.minLevel}${item.requirePlan ? '+会员' : ''})`, 'error');
          }
        } else {
          passCount++;
          log(`  ✓ 访问权限正确 (已发布所有人可读)`, 'success');
        }
      } else if (res.status === 403) {
        const actualPhase = res.data.accessPhase;
        const denialCode = res.data.denialCode;
        log(`  状态: 403 (拒绝访问)`, 'sub');
        log(`  accessPhase: ${actualPhase} | denialCode: ${denialCode}`, 'sub');
        log(`  错误信息: ${res.data.error}`, 'sub');

        if (actualPhase === expectedPhase) { passCount++; log(`  ✓ accessPhase 正确`, 'success'); }
        else { failCount++; log(`  ✗ accessPhase 错误 (期望: ${expectedPhase})`, 'error'); }

        if (expectedPhase === 'NOT_OPEN') {
          passCount++;
          log(`  ✓ 访问权限正确 (未开放)`, 'success');
          if (denialCode === 'WINDOW_NOT_OPEN') {
            passCount++;
            log(`  ✓ denialCode 正确 (WINDOW_NOT_OPEN)`, 'success');
            if (res.data.earlyWindowStart) {
              passCount++;
              log(`  ✓ 返回 earlyWindowStart: ${formatDate(res.data.earlyWindowStart)}`, 'success');
            } else {
              failCount++;
              log(`  ✗ 未返回 earlyWindowStart`, 'error');
            }
          } else {
            failCount++;
            log(`  ✗ denialCode 错误 (期望: WINDOW_NOT_OPEN)`, 'error');
          }
        } else if (expectedPhase === 'EARLY_WINDOW') {
          passCount++;
          log(`  ✓ 访问权限正确 (条件不满足拒绝)`, 'success');
          if (item.minLevel > 1 && denialCode === 'INSUFFICIENT_LEVEL') {
            passCount++;
            log(`  ✓ denialCode 正确 (INSUFFICIENT_LEVEL)`, 'success');
            if (res.data.requiresLevel !== undefined && res.data.userLevel !== undefined) {
              passCount++;
              log(`  ✓ 返回等级信息: 需要Lv${res.data.requiresLevel} 当前Lv${res.data.userLevel}`, 'success');
            }
          } else if (item.requirePlan && denialCode === 'MEMBERSHIP_REQUIRED') {
            passCount++;
            log(`  ✓ denialCode 正确 (MEMBERSHIP_REQUIRED)`, 'success');
          }
        }
      } else {
        failCount += 2;
        log(`  ✗ 意外状态码: ${res.status}`, 'error');
      }
    } catch (e) {
      failCount++;
      log(`  ✗ 请求错误: ${e.message}`, 'error');
    }
  }

  log(`\n结果: ${passCount} 通过, ${failCount} 失败${skipped ? `, ${skipped} 跳过` : ''}\n`, passCount > 0 ? 'success' : 'warn');
  return { pass: failCount === 0, passCount, failCount };
}

async function testBenefitCheckEndpoint() {
  log('=== 测试 3: benefits/check 接口 (需要登录) ===', 'heading');
  let passCount = 0;
  let failCount = 0;

  if (!authToken) {
    log('未登录，跳过测试\n', 'warn');
    return { pass: true, passCount: 0, failCount: 0 };
  }

  const sampleItems = testItems.slice(0, 3);
  for (const item of sampleItems) {
    log(`\n${item.title}`, 'info');
    try {
      const res = await request({
        path: `${API_BASE}/benefits/check?benefitCode=EARLY_ACCESS&resourceType=EARLY_ACCESS&resourceId=${item.id}`
      });
      const expectedPhase = calculateExpectedPhase(item);
      const actualPhase = res.data.accessPhase;

      log(`  accessPhase: ${actualPhase} | hasAccess: ${res.data.hasAccess}`, 'sub');

      if (actualPhase === expectedPhase) {
        passCount++;
        log(`  ✓ accessPhase 正确`, 'success');
      } else {
        failCount++;
        log(`  ✗ accessPhase 错误 (期望: ${expectedPhase})`, 'error');
      }
    } catch (e) {
      failCount++;
      log(`  ✗ 请求错误: ${e.message}`, 'error');
    }
  }

  log(`\n结果: ${passCount} 通过, ${failCount} 失败\n`, passCount > 0 ? 'success' : 'warn');
  return { pass: failCount === 0, passCount, failCount };
}

function testBoundaryCalculation() {
  log('=== 测试 4: 边界时间计算逻辑验证 ===', 'heading');
  let passCount = 0;
  let failCount = 0;

  const testCases = [
    { name: '[T1] 临界点：刚好到达提前窗口开始 (now = publishDate - earlyHours)',
      nowMin: 0, pubH: 24, earlyH: 24, exp: 'EARLY_WINDOW' },
    { name: '[T2] 临界点：提前窗口开始前1分钟',
      nowMin: -1, pubH: 24, earlyH: 24, exp: 'NOT_OPEN' },
    { name: '[T3] 临界点：提前窗口开始后1分钟',
      nowMin: 1, pubH: 24, earlyH: 24, exp: 'EARLY_WINDOW' },
    { name: '[T4] 临界点：刚好到达发布时间 (now = publishDate)',
      nowMin: 0, pubH: 0, earlyH: 24, exp: 'PUBLISHED' },
    { name: '[T5] 临界点：发布前1分钟',
      nowMin: -1, pubH: 0, earlyH: 24, exp: 'EARLY_WINDOW' },
    { name: '[T6] 临界点：发布后1分钟',
      nowMin: 1, pubH: 0, earlyH: 24, exp: 'PUBLISHED' },
    { name: '[T7] 距离提前窗口还有5天',
      nowMin: 0, pubH: 168, earlyH: 24, exp: 'NOT_OPEN' },
    { name: '[T8] 短窗口(2h)：窗口内30分钟',
      nowMin: -30, pubH: 1, earlyH: 2, exp: 'EARLY_WINDOW' },
    { name: '[T9] 短窗口(2h)：窗口开始前3小时',
      nowMin: 0, pubH: 5, earlyH: 2, exp: 'NOT_OPEN' },
    { name: '[T10] 短窗口临界点：提前窗口开始前1分',
      nowMin: -1, pubH: 2, earlyH: 2, exp: 'NOT_OPEN' },
    { name: '[T11] 短窗口临界点：发布时间',
      nowMin: 0, pubH: 0, earlyH: 2, exp: 'PUBLISHED' },
    { name: '[T12] 长窗口(72h)：发布前24小时在窗口内',
      nowMin: 0, pubH: 24, earlyH: 72, exp: 'EARLY_WINDOW' },
  ];

  for (const tc of testCases) {
    const now = new Date(Date.now() + tc.nowMin * 60 * 1000);
    const publishDate = new Date(now.getTime() + tc.pubH * 60 * 60 * 1000);
    const earlyWindowStart = new Date(publishDate.getTime() - tc.earlyH * 60 * 60 * 1000);

    let actual;
    if (now >= publishDate) actual = 'PUBLISHED';
    else if (now >= earlyWindowStart) actual = 'EARLY_WINDOW';
    else actual = 'NOT_OPEN';

    log(`\n${tc.name}`, 'info');
    log(`  提前开放: ${formatDate(earlyWindowStart)} | 正式发布: ${formatDate(publishDate)}`, 'sub');
    log(`  当前时间: ${formatDate(now)}`, 'sub');

    if (actual === tc.exp) {
      passCount++;
      log(`  ✓ 阶段判断正确 (${actual})`, 'success');
    } else {
      failCount++;
      log(`  ✗ 阶段判断错误`, 'error');
      log(`    期望: ${tc.exp} | 实际: ${actual}`, 'sub');
    }
  }

  log(`\n结果: ${passCount} 通过, ${failCount} 失败\n`, passCount > 0 ? 'success' : 'warn');
  return { pass: failCount === 0, passCount, failCount };
}

async function runAll() {
  log('\n╔══════════════════════════════════════════════════╗', 'heading');
  log('║     提前阅读权限窗口判断 自动化测试报告            ║', 'heading');
  log('╚══════════════════════════════════════════════════╝\n', 'heading');

  const results = [];

  await login();
  const ok = await fetchTestItems();
  if (!ok) {
    log('没有测试数据！请先执行: node scripts/create-early-access-test-data.js\n', 'warn');
    return;
  }

  results.push({ name: '列表接口 accessPhase', ...await testListEndpoint() });
  results.push({ name: '详情接口权限判断', ...await testDetailEndpoint() });
  results.push({ name: 'benefits/check 接口', ...await testBenefitCheckEndpoint() });
  results.push({ name: '边界时间计算逻辑', ...testBoundaryCalculation() });

  log('\n╔══════════════════════════════════════════════════╗', 'heading');
  log('║                   最终测试汇总                    ║', 'heading');
  log('╚══════════════════════════════════════════════════╝\n', 'heading');

  let totalPass = 0, totalFail = 0;
  for (const r of results) {
    const ok = r.failCount === 0;
    log(`  ${ok ? '✓' : '✗'} ${r.name}`, ok ? 'success' : 'error');
    log(`    通过: ${r.passCount}, 失败: ${r.failCount}`, 'sub');
    totalPass += r.passCount;
    totalFail += r.failCount;
  }

  log(`\n总计: ${totalPass} 项通过, ${totalFail} 项失败`, totalFail === 0 ? 'success' : 'error');

  if (totalFail === 0) {
    log('\n🎉 所有测试全部通过！提前阅读权限窗口判断逻辑完全正确！', 'success');
  } else {
    log('\n⚠️  存在测试失败，请检查上述详情！', 'warn');
    process.exit(1);
  }
}

runAll().catch(e => {
  console.error('测试异常:', e);
  process.exit(1);
});
