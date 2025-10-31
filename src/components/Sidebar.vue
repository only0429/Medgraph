<template>
  <aside class="sidebar" :class="{ collapsed: isCollapsed }">
    <!-- 展开/收起按钮 -->
    <div class="toggle-section">
      <button
        class="toggle-btn"
        @click="toggleSidebar"
        :aria-label="isCollapsed ? '展开侧边栏' : '收起侧边栏'"
        :title="isCollapsed ? '展开侧边栏' : '收起侧边栏'"
      >
        <span class="toggle-icon" :class="{ rotated: isCollapsed }">◀</span>
      </button>
    </div>

    <!-- 菜单 -->
    <nav class="menu">
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
        <img src="@/assets/workflow.svg" alt="流程管理系统" class="icon" />
        <span v-if="!isCollapsed">流程管理系统</span>
      </button>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isCollapsed = ref(true) // 默认收起
const go = (path: string) => router.push(path)
const toggleSidebar = () => (isCollapsed.value = !isCollapsed.value)
</script>

<style scoped>
/* ======= 外层容器 ======= */
.sidebar {
  width: 220px;
  height: 100vh;
  background: #f9f9fb;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  overflow: hidden;
  position: relative;
}

/* 收起后窄栏 */
.sidebar.collapsed {
  width: 72px;
  align-items: center;
}

/* ======= 顶部按钮 ======= */
.toggle-section {
  display: flex;
  justify-content: flex-end;
  padding: 10px 14px;
  width: 100%;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

/* 收起后按钮居中 */
.sidebar.collapsed .toggle-section {
  justify-content: center;
  padding: 10px;
}

/* 圆角按钮样式 */
.toggle-btn {
  width: 38px;
  height: 38px;
  background: #f3f4f6;
  border: none;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #333;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: background 0.2s, transform 0.1s;
}
.toggle-btn:hover {
  background: #e5e7eb;
}
.toggle-btn:active {
  transform: scale(0.97);
}
.toggle-icon {
  font-size: 14px;
  transition: transform 0.3s;
}
.toggle-icon.rotated {
  transform: rotate(180deg);
}

/* ======= 菜单 ======= */
.menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px 14px;
}

/* 按钮（展开态） */
.menu-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  background: #fff;
  border: none;
  border-radius: 12px;
  color: #111;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}
.menu-btn:hover {
  background: #f3f4f6;
}
.menu-btn.active {
  background: #e9f1ff;
  box-shadow: 0 0 0 2px #7aa3ff inset;
}

/* 图标尺寸 */
.icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

/* ======= 收起后：仅显示图标列 ======= */
.sidebar.collapsed .menu {
  align-items: center;
  padding: 20px 0;
  gap: 14px;
}

.sidebar.collapsed .menu-btn {
  width: 44px;
  height: 44px;
  padding: 0;
  border-radius: 12px;
  justify-content: center;
  background: #f9fafb;
}
.sidebar.collapsed .menu-btn:hover {
  background: #e5e7eb;
}
.sidebar.collapsed .menu-btn.active {
  background: #e9f1ff;
  box-shadow: 0 0 0 2px #7aa3ff inset;
}

/* 隐藏文字 */
.sidebar.collapsed .menu-btn span {
  display: none;
}
</style>