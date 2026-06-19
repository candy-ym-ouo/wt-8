<template>
  <router-link :to="`/zines/${zine.id}`" class="zine-card card">
    <div class="zine-cover">
      <img :src="zine.coverImage" :alt="zine.title" loading="lazy">
      <div class="zine-category">{{ zine.category }}</div>
    </div>
    <div class="zine-info">
      <h3 class="zine-title font-serif">{{ zine.title }}</h3>
      <p class="zine-desc">{{ zine.description }}</p>
      <div class="zine-tags">
        <span v-for="tag in zine.tags?.slice(0, 3)" :key="tag" class="tag">#{{ tag }}</span>
      </div>
      <div class="zine-meta">
        <div class="zine-author">
          <img :src="zine.author?.avatar" alt="">
          <span>{{ zine.author?.username }}</span>
        </div>
        <div class="zine-stats">
          <span>👁 {{ formatNum(zine.views) }}</span>
          <span>❤ {{ formatNum(zine.likes) }}</span>
        </div>
      </div>
    </div>
  </router-link>
</template>

<script setup>
defineProps({
  zine: { type: Object, required: true }
})

const formatNum = (n) => {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n
}
</script>

<style scoped>
.zine-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  cursor: pointer;
}
.zine-card:hover { transform: translateY(-4px); }
.zine-cover {
  position: relative;
  aspect-ratio: 5 / 7;
  overflow: hidden;
  background: var(--bg-tertiary);
}
.zine-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}
.zine-card:hover .zine-cover img { transform: scale(1.05); }
.zine-category {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 4px 10px;
  background: rgba(45, 42, 38, 0.8);
  color: #fff;
  font-size: 11px;
  border-radius: 100px;
  backdrop-filter: blur(4px);
}
.zine-info { padding: 16px 18px 18px; flex: 1; display: flex; flex-direction: column; }
.zine-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.zine-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.zine-tags { margin-bottom: 14px; }
.zine-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
}
.zine-author {
  display: flex;
  align-items: center;
  gap: 8px;
}
.zine-author img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--bg-tertiary);
}
.zine-author span {
  font-size: 12px;
  color: var(--text-secondary);
}
.zine-stats {
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: var(--text-tertiary);
}
</style>
