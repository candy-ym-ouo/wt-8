const http = require('http');

function req(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;
    if (data) options.headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(options, (res) => {
      let chunks = '';
      res.on('data', (c) => chunks += c);
      res.on('end', () => {
        try { resolve(JSON.parse(chunks)); }
        catch (e) { resolve({ raw: chunks }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function test() {
  console.log('1. 管理员登录...');
  const loginRes = await req('POST', '/api/auth/login', null, {
    identifier: 'admin', password: '123456'
  });
  if (!loginRes.token) {
    console.log('登录失败:', loginRes);
    return;
  }
  const adminToken = loginRes.token;
  console.log('   登录成功 ✅');

  console.log('\n2. 用户登录...');
  const userLogin = await req('POST', '/api/auth/login', null, {
    identifier: '墨香', password: '123456'
  });
  const userToken = userLogin.token;
  console.log('   用户登录成功 ✅');

  const now = new Date();
  const startTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const endTime = new Date(startTime.getTime() + 3 * 60 * 60 * 1000);
  const deadline = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  console.log('\n3. 创建活动...');
  const event = await req('POST', '/api/events', adminToken, {
    title: '2026 独立出版线下沙龙',
    description: '一场关于独立出版、zine文化与创作者交流的线下活动',
    location: '上海·静安区某某艺术空间',
    address: '静安区南京西路1788号3层',
    category: 'SALON',
    tags: ['独立出版', '沙龙', '创作'],
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    registrationDeadline: deadline.toISOString(),
    maxParticipants: 50,
    minParticipants: 10,
    fee: 0,
    organizer: 'ZineSpace团队',
    organizerContact: 'event@zinespace.com',
    requirements: '请携带您的作品或名片',
    notice: '现场提供免费饮品',
    isFeatured: true,
    status: 'PUBLISHED'
  });
  console.log('   创建活动:', event.message || event.error);
  if (!event.event) { console.log('错误详情:', event); return; }
  const eventId = event.event.id;

  console.log('\n4. 用户报名活动...');
  const reg = await req('POST', '/api/event-registrations', userToken, {
    eventId,
    name: '墨香',
    phone: '13800138000',
    email: 'moxiang@zine.com',
    company: '自由撰稿人',
    note: '期待活动！'
  });
  console.log('   报名结果:', reg.message || reg.error);
  if (!reg.registration) { console.log('错误:', reg); return; }
  const regId = reg.registration.id;

  console.log('\n5. 管理员审核报名...');
  const review = await req('POST', `/api/event-registrations/${regId}/review`, adminToken, {
    action: 'APPROVE'
  });
  console.log('   审核结果:', review.message || review.error);

  console.log('\n6. 查看活动详情...');
  const detail = await req('GET', `/api/events/${eventId}`, userToken);
  console.log('   活动名:', detail.event?.title);
  console.log('   报名数:', detail.event?.registrationCount);
  console.log('   用户报名状态:', detail.userRegistration?.status);

  console.log('\n7. 签到核销（管理员）...');
  const checkin = await req('POST', `/api/event-checkins/registration/${regId}`, adminToken, {
    checkInType: 'QRCODE',
    remark: '已到场'
  });
  console.log('   签到结果:', checkin.message || checkin.error);

  console.log('\n8. 后台活动统计...');
  const stats = await req('GET', '/api/admin/events/stats', adminToken);
  console.log('   总活动:', stats.stats?.totalEvents);
  console.log('   总报名:', stats.stats?.totalRegistrations);
  console.log('   总签到:', stats.stats?.totalCheckIns);

  console.log('\n9. 活动报告详情...');
  const report = await req('GET', `/api/admin/events/${eventId}/report`, adminToken);
  console.log('   活动:', report.event?.title);
  console.log('   报名状态:', report.statusCounts);
  console.log('   签到率:', report.summary?.checkInRate + '%');

  console.log('\n10. 活动列表（公开）...');
  const list = await req('GET', '/api/events');
  console.log('   活动数:', list.total);
  console.log('   第一个:', list.events?.[0]?.title);

  console.log('\n11. 获取活动未签到列表...');
  const notChecked = await req('GET', `/api/event-checkins/event/${eventId}`, adminToken);
  console.log('   已签到:', notChecked.checkedInCount);
  console.log('   未签到:', notChecked.notCheckedIn?.length);

  console.log('\n🎉 所有核心功能测试完成！');
}

test().catch(e => console.error('测试异常:', e));
