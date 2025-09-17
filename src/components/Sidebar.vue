<template>
  <aside class="sidebar">
    <button
      class="menu-btn"
      :class="{ active: $route.path === '/graph' }"
      @click="go('/graph')"
    >
      <img src="@/assets/graph.svg" alt="知识图谱" class="icon" />
      <span>构建知识图谱</span>
    </button>

    <button
      class="menu-btn"
      :class="{ active: $route.path === '/workflow' }"
      @click="go('/workflow')"
    >
      <img src="@/assets/workflow.svg" alt="流程管理" class="icon" />
      <span>流程管理系统</span>
    </button>
  </aside>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
const go = (path: string) => router.push(path)
</script>

<style scoped>
.sidebar{
  width: 200px; height: 100vh;
  background: #4B4C67;
  padding: 20px 16px;
  display: flex; flex-direction: column; gap: 18px;
}
.menu-btn{
  width: 100%;
  display: flex; align-items: center; gap: 12px;
  padding: 18px 16px;
  background: #fff; color: #111;
  border: 2px solid transparent;
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,.08);
  cursor: pointer; text-align: left;
  transition: background .15s, border-color .15s, transform .05s;
}
.menu-btn:hover{ background: #f5f7fb; }
.menu-btn:active{ transform: translateY(1px); }
.menu-btn.active{ background: #e9f1ff; border-color: #7aa3ff; }
.icon{ width: 26px; height: 26px; object-fit: contain; }
</style>
