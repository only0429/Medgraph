<template>
  <div class="layout">
    <Sidebar />
    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import Sidebar from '../components/Sidebar.vue'  
</script>

<style scoped>
.layout { display: flex; height: 100vh; }
.content { flex: 1; padding: 16px; overflow: auto; background: #E0E4EC; }
</style>
