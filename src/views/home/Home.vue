<script setup>
import { ref, onMounted, computed } from 'vue'
import { Money, Tickets, Printer, ShoppingCart, Document, Avatar, TrendCharts, Calendar, Plus } from '@element-plus/icons-vue'
import { ROLE } from '@/utils/role'
import { getStatMap } from '@/api/reports'

const stats = ref({})

const statCards = computed(() => [
    {
        key: 'monthOutput',
        title: '当月总产值',
        value: stats.value.monthOutput?.value,
        tip: stats.value.monthOutput?.tip,
        icon: Money,
        color: '#409eff'
    },
    {
        key: 'todayOutput',
        title: '今日产值',
        value: stats.value.todayOutput?.value,
        tip: stats.value.todayOutput?.tip,
        icon: Money,
        color: '#409eff'
    },
    {
        key: 'monthOrderCount',
        title: '当月单量',
        value: stats.value.monthOrderCount?.value,
        tip: stats.value.monthOrderCount?.tip,
        icon: Tickets,
        color: '#409eff'
    },
    {
        key: 'todayOrderCount',
        title: '今日单量',
        value: stats.value.todayOrderCount?.value,
        tip: stats.value.todayOrderCount?.tip,
        icon: Tickets,
        color: '#409eff'
    },
])

// 网络请求：加载stats
const loadStats = async () => { 
    const res = await getStatMap()
    stats.value = res.data
}

onMounted(() => { 
    loadStats()
})

</script>

<template>
    <div class="main-page">
        <div class="page-header">
            <h1>首页</h1>
        </div>
        <div class="page-content"> 
            <div class="stat-grid" v-permission="ROLE.ADMIN">
                <el-card
                    v-for="item in statCards"
                    :key="item.key"
                    class="stat-card"
                    shadow="hover"
                >
                    <div class="stat-item">
                        <div class="stat-icon" :style=" { color: item.color, backgroundColor: item.color + '1a' }">
                            <el-icon><component :is="item.icon" /></el-icon>
                        </div>
                        <div class="stat-info">
                            <div class="stat-title">{{ item.title }}</div>
                            <div class="stat-value" :style="{ color: item.color }">{{ item.value }}</div>
                            <div class="stat-tip">{{ item.tip }}</div>
                        </div>
                    </div>
                </el-card>
            </div>
            <el-card class="quick-actions-card">
                <template #header>
                    <h3>快捷操作</h3>
                </template>
                <div class="quick-grid">
                    <div class="quick-item" @click="$router.push('/quick-order')">
                        <el-icon class="quick-icon"><Plus /></el-icon>
                        <div class="quick-text">快速开单</div>
                    </div>
                    <div class="quick-item" @click="$router.push('/prepare-order-manage')">
                        <el-icon class="quick-icon"><ShoppingCart /></el-icon>
                        <div class="quick-text">预备订单管理</div>
                    </div>
                    <div class="quick-item" @click="$router.push('/order-manage')">
                        <el-icon class="quick-icon"><Document /></el-icon>
                        <div class="quick-text">正式订单管理</div>
                    </div>
                    <div class="quick-item" @click="$router.push('/print-order')">
                        <el-icon class="quick-icon"><Printer /></el-icon>
                        <div class="quick-text">订单打印</div>
                    </div>
                    <div class="quick-item" @click="$router.push('/customer-manage')" v-permission="ROLE.ADMIN">
                        <el-icon class="quick-icon"><Avatar /></el-icon>
                        <div class="quick-text">客户管理</div>
                    </div>
                    <div class="quick-item" @click="$router.push('/statistical-chart')" v-permission="ROLE.ADMIN">
                        <el-icon class="quick-icon"><TrendCharts /></el-icon>
                        <div class="quick-text">统计图表</div>
                    </div>
                    <div class="quick-item" @click="$router.push('/operation-log')" v-permission="ROLE.ADMIN">
                        <el-icon class="quick-icon"><Calendar /></el-icon>
                        <div class="quick-text">日志记录</div>
                    </div>
                </div>
            </el-card>
        </div>
    </div>
</template>

<style scoped>
.main-page {
    padding: 0 20px;
}
.page-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
}
.page-content { 
    margin-top: 16px;
    display: flex;
    flex-direction: column; /* 子元素垂直从上往下排 */
    align-items: center;    /* 所有子模块【水平居中】 */
    gap: 16px;
}
.stat-grid {
    width: 100%;
    max-width: 900px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
}
.stat-item {
    display: flex;
    align-items: center;
    gap: 12px;
}
.stat-icon { 
    width: 48px;
    height: 48px;
    border-radius: var(--el-border-radius-base);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    flex-shrink: 0;
}
.stat-info { 
    min-width: 0;
}
.stat-title { 
    font-size: 13px;
    color: var(--el-text-color-secondary);
}
.stat-value { 
    font-size: 20px;
    font-weight: 600;
    line-height: 1.5;
    white-space: nowrap;
}
.stat-tip { 
    font-size: 12px;
    color: var(--el-text-color-placeholder);
}
.quick-actions-card { 
    max-width: 900px;
    width: 100%;
}
.quick-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap:16px;
}
.quick-item {
  border:1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  padding:24px 12px;
  text-align:center;
  cursor:pointer;
  transition: all 0.2s;
}
.quick-item:hover {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}
.quick-icon {
  font-size: 36px;
  color:var(--el-color-primary);
}
.quick-text {
  margin-top:8px;
  font-size:14px;
}
</style>