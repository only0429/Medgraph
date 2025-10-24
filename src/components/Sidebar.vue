<template>
  <aside class="sidebar" :class="{ collapsed: isCollapsed }">
    <!-- 收起/展开按钮 -->
    <div class="toggle-section">
      <button class="toggle-btn" @click="toggleSidebar">
        <span class="toggle-icon" :class="{ rotated: isCollapsed }">◀</span>
      </button>
    </div>

    <!-- 菜单按钮 -->
    <button
      class="menu-btn"
      :class="{ active: $route.path === '/graph' }"
      @click="go('/graph')"
    >
      <img src="@/assets/graph.svg" alt="知识图谱" class="icon" />
      <span v-if="!isCollapsed">构建知识图谱</span>
    </button>

    <button
      class="menu-btn"
      :class="{ active: $route.path === '/workflow' }"
      @click="go('/workflow')"
    >
      <img src="@/assets/workflow.svg" alt="流程管理" class="icon" />
      <span v-if="!isCollapsed">流程管理系统</span>
    </button>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isCollapsed = ref(false)

const go = (path: string) => router.push(path)
const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}
</script>

<style scoped>
.sidebar {
  width: 200px;
  height: 100vh;
  background: #4B4C67;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  transition: width 0.3s ease, padding 0.3s ease;
  position: relative;
  flex-shrink: 0;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 60px;
  padding: 20px 8px;
}

.toggle-section {
  margin-bottom: 10px;
}

.toggle-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s;
}

.toggle-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.toggle-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #fff;
  transition: transform 0.3s ease;
}

.toggle-icon.rotated {
  transform: rotate(180deg);
}

.menu-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 12px;
  background: #fff;
  color: #111;
  border: 2px solid transparent;
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,.08);
  cursor: pointer;
  text-align: left;
  transition: background .15s, border-color .15s, transform .05s;
  white-space: nowrap;
  overflow: hidden;
}

.menu-btn:hover {
  background: #f5f7fb;
}

.menu-btn:active {
  transform: translateY(1px);
}

.menu-btn.active {
  background: #e9f1ff;
  border-color: #7aa3ff;
}

.icon {
  width: 26px;
  height: 26px;
  object-fit: contain;
  flex-shrink: 0;
}
</style>