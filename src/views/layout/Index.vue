<script setup>
import TopBar from '@/components/TopBar.vue'
import SideBar from '@/components/SideBar.vue'
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

const sidebarVisible = ref(true)
const toggleSidebar = () => {
    sidebarVisible.value = !sidebarVisible.value
}

const route = useRoute()
const currentRoute = computed(() => route)

</script>

<template>
  <div class="common-layout">
    <template v-if="!currentRoute.meta.hideLayout">
      <TopBar />
        <el-container>
          <SideBar :visible="sidebarVisible" @toggle="toggleSidebar" />
          <!-- 内容区域 -->
          <el-main>
              <router-view />
          </el-main>
          <el-footer style="text-align:center;padding:12px 0;color:#666;font-size:14px;">
            © 2026 企业管理系统Java版V1.3 |
            <el-link type="primary" :underline="false" style="margin-left:8px;font-size:14px;" href="/about">
              关于企业管理系统
            </el-link>
          </el-footer>
        </el-container>
    </template>
    <template v-else>
      <router-view />
    </template>
    
  </div>
</template>

<style scoped>
.el-container {
  padding-top: 30px;
}
</style>