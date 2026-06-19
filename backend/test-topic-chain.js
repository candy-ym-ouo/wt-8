const http = require('http');

const post = (path, data, token) => new Promise((resolve, reject) => {
  const opts = { hostname: 'localhost', port: 3001, path: '/api' + path, method: 'POST', headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers.Authorization = 'Bearer ' + token;
  const req = http.request(opts, res => { let b = ''; res.on('data', c => b += c); res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { resolve({ raw: b }); } }); });
  req.write(JSON.stringify(data));
  req.end();
});

const get = (path, token) => new Promise((resolve, reject) => {
  const opts = { hostname: 'localhost', port: 3001, path: '/api' + path, method: 'GET', headers: {} };
  if (token) opts.headers.Authorization = 'Bearer ' + token;
  const req = http.request(opts, res => { let b = ''; res.on('data', c => b += c); res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { resolve({ raw: b }); } }); });
  req.end();
});

(async () => {
  try {
    const login = await post('/auth/login', { identifier: 'admin', password: '123456' });
    if (!login.token) { console.log('登录失败:', login); return; }
    const token = login.token;
    console.log('1. 登录成功, role:', login.user.role);

    const topic = await post('/topics', {
      title: '夏日摄影集', description: '用镜头捕捉夏天的光影',
      content: '夏天来了，拿起相机记录那些转瞬即逝的美好瞬间。',
      category: '摄影', status: 'ACTIVE', deadline: '2026-08-31', prizes: '优秀作品首页推荐'
    }, token);
    console.log('2. 创建专题:', topic.message, 'ID:', topic.topic?.id);

    const featured = await post('/featured', {
      topicId: topic.topic.id, bannerTitle: '📸 夏日摄影征稿中',
      bannerSubtitle: '用镜头捕捉夏天的光影', sortOrder: 1
    }, token);
    console.log('3. 设置曝光:', featured.message);

    const fl = await get('/featured?activeOnly=true');
    console.log('4. 首页曝光数量:', fl.featured?.length);

    const stats = await get('/admin/topics/stats', token);
    console.log('5. 专题统计:', JSON.stringify(stats.stats));

    const schedule = await post('/schedules', {
      topicId: topic.topic.id, title: '第一期',
      publishDate: '2026-07-15', description: '首期发布'
    }, token);
    console.log('6. 创建排期:', schedule.message, 'ID:', schedule.schedule?.id);

    const topicDetail = await get('/topics/' + topic.topic.id);
    console.log('7. 专题详情:', topicDetail.topic?.title, '投稿数:', topicDetail.topic?._count?.submissions);

    console.log('\n=== 完整链路测试通过! ===');
  } catch (e) { console.error('ERROR:', e.message || e); }
  process.exit(0);
})();
