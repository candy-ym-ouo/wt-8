const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
const BASE_WEB = 'http://localhost:3001';

const testUser = {
  username: 'demo',
  password: 'demo123'
};

let authToken = null;
let authHeaders = {};
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

const assert = (condition, desc, actual, expected) => {
  if (condition) {
    log(`  ✓ ${desc}`, 'success');
    return true;
  } else {
    log(`  ✗ ${desc}`, 'error');
    if (actual !== undefined && expected !== undefined) {
      log(`    期望: ${expected}`, 'sub');
      log(`    实际: ${actual}`, 'sub');
    }
    return false;
  }
};

async function login() {
  log('=== 登录测试账号 ===', 'heading');
  try {
    const res = await axios.post(`${BASE_URL}/auth/login`, testUser);
    authToken = res.data.token;
    authHeaders = { Authorization: `Bearer ${authToken}` };
    log(`✓ 登录成功: ${res.data.user.username}`, 'success');
    log(`  ID: ${res.data.user.id}`, 'sub');
    log(`  角色: ${res.data.user.role}\n`, 'sub');
    return true;
  } catch (e) {
    log(`✗ 登录失败: ${e.message}`, 'error');
    log('尝试注册测试账号...', 'warn');
    try {
      const res = await axios.post(`${BASE_URL}/auth/register`, {
        ...testUser,
        email: 'demo@example.com'
      });
      authToken = res.data.token;
      authHeaders = { Authorization: `Bearer ${authToken}` };
      log(`✓ 注册并登录成功\n`, 'success');
      return true;
    } catch (e2) {
      log(`✗ 注册也失败: ${e2.message}`, 'error');
      return false;
    }
  }
}

async function fetchTestItems() {
  log('=== 获取测试数据 ===', 'heading');
  try {
    const res = await axios.get(`${BASE_URL}/memberships/early-access?limit=50`);
    testItems = res.data.items.filter(i => i.title.startsWith('[TEST]'));
    log(`✓ 获取到 ${testItems.length} 条测试数据\n`, 'success');
    return true;
  } catch (e) {
    log(`✗ 获取失败: ${e.message}`, 'error');
    return false;
  }
}

function calculateExpectedPhase(item) {
  const now = new Date();
  const publishDate = new Date(item.publishDate);
  const earlyWindowStart = new Date(publishDate.getTime() - item.earlyHours * 60 * 60 * 1000);

  if (now >= publishDate) return 'PUBLISHED';
  if (now >= earlyWindowStart) return 'EARLY_WINDOW';
  return 'NOT_OPEN';
}

async function testListEndpoint() {
  log('=== 测试 1: 列表接口 accessPhase ===', 'heading');
  let passCount = 0;
  let failCount = 0;

  for (const item of testItems) {
    log(`\n测试条目: ${item.title}`, 'info');
    log(`  publishDate: ${formatDate(item.publishDate)} | earlyHours: ${item.earlyHours}h`, 'sub');

    const expected = calculateExpectedPhase(item);
    const actual = item.accessPhase;

    if (assert(actual === expected, '列表接口返回的 accessPhase 正确', actual, expected)) {
      passCount++;
    } else {
      failCount++;
    }

    const pd = new Date(item.publishDate);
    const ews = new Date(pd.getTime() - item.earlyHours * 60 * 60 * 1000);
    log(`  提前阅读开放: ${formatDate(ews)}`, 'sub');
    log(`  正式发布时间: ${formatDate(pd)}`, 'sub');
    log(`  当前时间:     ${formatDate(new Date())}`, 'sub');
  }

  log(`\n结果: ${passCount} 通过, ${failCount} 失败\n`, passCount > 0 ? 'success' : 'warn');
  return failCount === 0;
}

async function testDetailEndpoint() {
  log('=== 测试 2: 详情接口权限判断 ===', 'heading');
  let passCount = 0;
  let failCount = 0;

  for (const item of testItems) {
    log(`\n测试条目: ${item.title}`, 'info');
    log(`  minLevel: ${item.minLevel} | requirePlan: ${item.requirePlan}`, 'sub');

    const expectedPhase = calculateExpectedPhase(item);
    let expectedAccess = false;

    if (expectedPhase === 'PUBLISHED') {
      expectedAccess = true;
    } else if (expectedPhase === 'EARLY_WINDOW') {
      expectedAccess = (1 >= item.minLevel) && (!item.requirePlan || false);
    } else {
      expectedAccess = false;
    }

    try {
      const res = await axios.get(`${BASE_URL}/memberships/early-access/${item.id}`, {
        headers: authHeaders
      });
      const actualAccess = true;
      const actualPhase = res.data.accessPhase;

      log(`  返回 accessPhase: ${actualPhase}`, 'sub');

      if (actualPhase === expectedPhase) {
        passCount++;
        log(`  ✓ accessPhase 正确 (${actualPhase})`, 'success');
      } else {
        failCount++;
        log(`  ✗ accessPhase 错误`, 'error');
        log(`    期望: ${expectedPhase} | 实际: ${actualPhase}`, 'sub');
      }

      if (expectedAccess === actualAccess) {
        passCount++;
        log(`  ✓ 访问权限正确 (${actualAccess ? '允许访问' : '拒绝访问'})`, 'success');
      } else {
        failCount++;
        log(`  ✗ 访问权限错误`, 'error');
        log(`    期望: ${expectedAccess ? '允许访问' : '拒绝访问'} | 实际: ${actualAccess ? '允许访问' : '拒绝访问'}`, 'sub');
      }
    } catch (e) {
      if (e.response && e.response.status === 403) {
        const actualAccess = false;
        const actualPhase = e.response.data.accessPhase;
        const denialCode = e.response.data.denialCode;

        log(`  返回 accessPhase: ${actualPhase}`, 'sub');
        log(`  返回 denialCode: ${denialCode}`, 'sub');
        log(`  错误信息: ${e.response.data.error}`, 'sub');

        if (actualPhase === expectedPhase) {
          passCount++;
          log(`  ✓ accessPhase 正确 (${actualPhase})`, 'success');
        } else {
          failCount++;
          log(`  ✗ accessPhase 错误`, 'error');
          log(`    期望: ${expectedPhase} | 实际: ${actualPhase}`, 'sub');
        }

        if (expectedAccess === actualAccess) {
          passCount++;
          log(`  ✓ 访问权限正确 (拒绝访问)`, 'success');
        } else {
          failCount++;
          log(`  ✗ 访问权限错误`, 'error');
          log(`    期望: ${expectedAccess ? '允许访问' : '拒绝访问'} | 实际: 拒绝访问`, 'sub');
        }

        let expectedDenialCode = null;
        if (expectedPhase === 'NOT_OPEN') {
          expectedDenialCode = 'WINDOW_NOT_OPEN';
        } else if (expectedPhase === 'EARLY_WINDOW') {
          if (1 < item.minLevel) expectedDenialCode = 'INSUFFICIENT_LEVEL';
          else if (item.requirePlan) expectedDenialCode = 'MEMBERSHIP_REQUIRED';
        }

        if (expectedDenialCode && denialCode === expectedDenialCode) {
          passCount++;
          log(`  ✓ denialCode 正确 (${denialCode})`, 'success');
        } else if (expectedDenialCode) {
          failCount++;
          log(`  ✗ denialCode 错误`, 'error');
          log(`    期望: ${expectedDenialCode} | 实际: ${denialCode}`, 'sub');
        }

        if (expectedPhase === 'NOT_OPEN' && e.response.data.earlyWindowStart) {
          passCount++;
          log(`  ✓ 返回了 earlyWindowStart: ${formatDate(e.response.data.earlyWindowStart)}`, 'success');
        }
      } else {
        failCount += 2;
        log(`  ✗ 其他错误: ${e.message}`, 'error');
      }
    }
  }

  log(`\n结果: ${passCount} 通过, ${failCount} 失败\n`, passCount > 0 ? 'success' : 'warn');
  return failCount === 0;
}

async function testBenefitCheckEndpoint() {
  log('=== 测试 3: benefits/check 接口 ===', 'heading');
  let passCount = 0;
  let failCount = 0;

  const windowItems = testItems.slice(0, 3);
  for (const item of windowItems) {
    log(`\n测试条目: ${item.title}`, 'info');

    try {
      const res = await axios.get(`${BASE_URL}/benefits/check`, {
        headers: authHeaders,
        params: {
          benefitCode: 'EARLY_ACCESS',
          resourceType: 'EARLY_ACCESS',
          resourceId: item.id
        }
      });

      const expectedPhase = calculateExpectedPhase(item);
      const actualPhase = res.data.accessPhase;

      log(`  accessPhase: ${actualPhase}`, 'sub');
      log(`  hasAccess: ${res.data.hasAccess}`, 'sub');

      if (actualPhase === expectedPhase) {
        passCount++;
        log(`  ✓ accessPhase 正确`, 'success');
      } else {
        failCount++;
        log(`  ✗ accessPhase 错误`, 'error');
        log(`    期望: ${expectedPhase} | 实际: ${actualPhase}`, 'sub');
      }
    } catch (e) {
      failCount++;
      log(`  ✗ 接口错误: ${e.message}`, 'error');
    }
  }

  log(`\n结果: ${passCount} 通过, ${failCount} 失败\n`, passCount > 0 ? 'success' : 'warn');
  return failCount === 0;
}

async function testBoundaryTimeCalculation() {
  log('=== 测试 4: 边界时间计算逻辑 ===', 'heading');
  let passCount = 0;
  let failCount = 0;

  const testCases = [
    {
      name: 'not_open_to_early_window_boundary',
      nowOffsetMinutes: 0,
      publishOffsetHours: 24,
      earlyHours: 24,
      expected: 'EARLY_WINDOW'
    },
    {
      name: 'just_before_window_boundary',
      nowOffsetMinutes: -1,
      publishOffsetHours: 24,
      earlyHours: 24,
      expected: 'NOT_OPEN'
    },
    {
      name: 'just_after_window_boundary',
      nowOffsetMinutes: 1,
      publishOffsetHours: 24,
      earlyHours: 24,
      expected: 'EARLY_WINDOW'
    },
    {
      name: 'early_window_to_published_boundary',
      nowOffsetMinutes: 0,
      publishOffsetHours: 0,
      earlyHours: 24,
      expected: 'PUBLISHED'
    },
    {
      name: 'just_before_publish',
      nowOffsetMinutes: -1,
      publishOffsetHours: 0,
      earlyHours: 24,
      expected: 'EARLY_WINDOW'
    },
    {
      name: 'just_after_publish',
      nowOffsetMinutes: 1,
      publishOffsetHours: 0,
      earlyHours: 24,
      expected: 'PUBLISHED'
    },
    {
      name: 'far_before_window',
      nowOffsetMinutes: 0,
      publishOffsetHours: 168,
      earlyHours: 24,
      expected: 'NOT_OPEN'
    },
    {
      name: 'short_window_in_window',
      nowOffsetMinutes: -30,
      publishOffsetHours: 1,
      earlyHours: 2,
      expected: 'EARLY_WINDOW'
    },
    {
      name: 'short_window_before_window',
      nowOffsetMinutes: 0,
      publishOffsetHours: 5,
      earlyHours: 2,
      expected: 'NOT_OPEN'
    }
  ];

  for (const tc of testCases) {
    const now = new Date(Date.now() + tc.nowOffsetMinutes * 60 * 1000);
    const publishDate = new Date(now.getTime() + tc.publishOffsetHours * 60 * 60 * 1000);
    const earlyWindowStart = new Date(publishDate.getTime() - tc.earlyHours * 60 * 60 * 1000);

    let actual;
    if (now >= publishDate) actual = 'PUBLISHED';
    else if (now >= earlyWindowStart) actual = 'EARLY_WINDOW';
    else actual = 'NOT_OPEN';

    log(`\n场景: ${tc.name}`, 'info');
    log(`  窗口开放: ${formatDate(earlyWindowStart)} | 正式发布: ${formatDate(publishDate)}`, 'sub');
    log(`  当前时间: ${formatDate(now)}`, 'sub');

    if (assert(actual === tc.expected, '阶段判断正确', actual, tc.expected)) {
      passCount++;
    } else {
      failCount++;
    }
  }

  log(`\n结果: ${passCount} 通过, ${failCount} 失败\n`, passCount > 0 ? 'success' : 'warn');
  return failCount === 0;
}

async function runAllTests() {
  log('\n╔══════════════════════════════════════════════════╗', 'heading');
  log('║       提前阅读权限窗口判断 自动化测试              ║', 'heading');
  log('╚══════════════════════════════════════════════════╝\n', 'heading');

  const results = [];

  results.push({ name: '登录&获取数据', pass: await login() && await fetchTestItems() });
  if (testItems.length === 0) {
    log('没有测试数据，先执行创建脚本：node scripts/create-early-access-test-data.js', 'warn');
    return;
  }
  results.push({ name: '列表接口 accessPhase', pass: await testListEndpoint() });
  results.push({ name: '详情接口权限判断', pass: await testDetailEndpoint() });
  results.push({ name: 'benefits/check 接口', pass: await testBenefitCheckEndpoint() });
  results.push({ name: '边界时间计算逻辑', pass: await testBoundaryTimeCalculation() });

  log('\n╔══════════════════════════════════════════════════╗', 'heading');
  log('║                   测试汇总报告                    ║', 'heading');
  log('╚══════════════════════════════════════════════════╝\n', 'heading');

  const totalPass = results.filter(r => r.pass).length;
  const totalTests = results.length;

  for (const r of results) {
    log(`  ${r.pass ? '✓' : '✗'} ${r.name}`, r.pass ? 'success' : 'error');
  }

  log(`\n总计: ${totalPass}/${totalTests} 测试通过\n`, totalPass === totalTests ? 'success' : 'error');

  if (totalPass === totalTests) {
    log('🎉 所有测试通过！提前阅读权限窗口判断逻辑正确！', 'success');
  } else {
    log('⚠️  部分测试未通过，请检查上述错误信息！', 'warn');
    process.exit(1);
  }
}

runAllTests().catch(e => {
  console.error('测试执行失败:', e);
  process.exit(1);
});
