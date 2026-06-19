<template>
  <footer class="footer">
    <div class="container footer-inner">
      <div class="footer-brand">
        <div class="footer-logo">📖 ZineSpace</div>
        <p class="footer-desc">
          小众刊物共享平台，让独立创作被看见。<br>
          致力于连接私印 zine 创作者与读者。
        </p>
      </div>
      <div class="footer-links">
        <div class="footer-col">
          <h4>探索</h4>
          <router-link to="/zines">刊物目录</router-link>
          <router-link to="/zines?category=文学">文学创作</router-link>
          <router-link to="/zines?category=艺术">艺术插画</router-link>
          <router-link to="/zines?category=摄影">摄影作品</router-link>
        </div>
        <div class="footer-col">
          <h4>创作</h4>
          <router-link to="/register">加入我们</router-link>
          <router-link to="/submissions/new">投稿指南</router-link>
          <span>创作者激励</span>
        </div>
        <div class="footer-col">
          <h4>关于</h4>
          <span>关于 ZineSpace</span>
          <span>社区公约</span>
          <span>联系我们</span>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <div class="container">
        <span>© 2024 ZineSpace. 独立出版，生生不息。</span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  background: var(--text-primary);
  color: #c8c0b5;
  margin-top: auto;
}
.footer-inner {
  display: flex;
  padding: 48px 24px;
  gap: 48px;
  flex-wrap: wrap;
}
.footer-brand { max-width: 300px; }
.footer-logo {
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 12px;
}
.footer-desc {
  font-size: 13px;
  line-height: 1.8;
  opacity: 0.8;
}
.footer-links {
  display: flex;
  gap: 64px;
  flex: 1;
  flex-wrap: wrap;
}
.footer-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.footer-col h4 {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.footer-col a,
.footer-col span {
  font-size: 13px;
  color: #c8c0b5;
  transition: color 0.2s;
  cursor: pointer;
}
.footer-col a:hover,
.footer-col span:hover { color: #fff; }
.footer-bottom {
  border-top: 1px solid rgba(255,255,255,0.1);
  padding: 16px 0;
  font-size: 12px;
  opacity: 0.6;
}
@media (max-width: 768px) {
  .footer-inner { padding: 32px 16px; gap: 32px; }
  .footer-links { gap: 32px; }
}
</style>
