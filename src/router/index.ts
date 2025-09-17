import { createRouter, createWebHistory } from 'vue-router'
import GraphBuilder from '../pages/GraphBuilder.vue'
import WorkflowSystem from '../pages/WorkflowSystem.vue'

const routes = [
  { path: '/', redirect: '/graph' },
  { path: '/graph', component: GraphBuilder },
  { path: '/workflow', component: WorkflowSystem }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})
