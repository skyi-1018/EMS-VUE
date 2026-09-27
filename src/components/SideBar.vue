<!-- @/components/CommonCard.vue -->
<script setup>
import { DArrowLeft, DArrowRight } from '@element-plus/icons-vue';
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ROLE } from '@/utils/role'
import { useUserStore } from '@/store/user'

// 接受父组件传入参数
// 父组件传visible布尔值，true侧边栏打开，false收起，默认打开
const props = defineProps({
    visible: {
        type: Boolean,
        default: true
    }
})

// 向父组件派发事件
//向外抛出toggle事件，点击切换按钮时 ￥emit('toggle')，通知父组件更新visable的值
const emit = defineEmits(['toggle'])

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const sidebarRef = ref(null)

const menuList = ref([
    { path: '/', name: '首页'},
    { path: '/quick-order', name: '快速开单'},
    { path: '/prepare-order-manage', name: '预备订单管理'},
    { path: '/order-manage', name: '订单管理'},
    { path: '/print-order', name: '订单打印'},
    { path: '/customer-manage', name: '客户管理', roles: [ROLE.ADMIN]},
    { path: '/statistical-chart', name: '统计图表', roles: [ROLE.ADMIN]},
    { path: '/operation-log', name: '日志记录', roles: [ROLE.ADMIN]},
])

const visibleMenuList = computed(() => 
    menuList.value.filter(
        item => !item.roles || item.roles.includes(userStore.userInfo?.role)
    )
)

const toPage = (path) => {
    router.push(path)
}

const handleClickOutside = (event) => {
    if (props.visible && sidebarRef.value && !sidebarRef.value.contains(event.target)) {
        emit('toggle')
    }
}

onMounted(() => {
    document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
})

</script>

<template>
    <div class="sidebar-wrapper" :class="{ hidden: !visible }" ref="sidebarRef">
        <button class="toggle-btn" @click.stop="$emit('toggle')">
            <el-icon size="18">
                <d-arrow-left v-if="visible" />
                <d-arrow-right v-else />
            </el-icon>
        </button>

        <div class="sidebar">
            <div class="menu-list">
                <div 
                    class="menu-item" 
                    :class="{ active: route?.path === item.path }"
                    v-for="item in visibleMenuList"
                    :key="item.path"
                    @click="toPage(item.path)"
                >
                    <span class="icon">●</span>
                    <span class="text">{{ item.name }}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* 侧边栏最外层容器 */
.sidebar-wrapper {
    position: fixed;    
    left: 16px;
    top: 76px;
    z-index: 1999;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-wrapper.hidden {
    transform: translateX(-280px);
}

/* 悬浮切换按钮 */
.toggle-btn {
    position: absolute;
    right: -44px;
    top: 12px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(10px);
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    cursor: pointer;
    color: #595959;
    transition: all 0.2s ease;
    box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.08);
}

.toggle-btn:hover {
    background: #1890ff;
    border-color: #1890ff;
    color: white;
    box-shadow: 2px 2px 12px rgba(24, 144, 255, 0.3);
}

.sidebar {
    height: calc(100vh - 92px);
    width: 240px;
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(10px);
    border-radius: 16px;
    box-shadow: 
        -4px -4px 12px rgba(255, 255, 255, 0.8),
        4px 4px 16px rgba(0, 0, 0, 0.08),
        0 0 0 1px rgba(0, 0, 0, 0.02);
    overflow: hidden;
}

.menu-list {
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 12px 8px;
}

/* 单个菜单项 */
.menu-item {
    display: flex;
    align-items: center;
    padding: 14px 20px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: #595959;
    font-size: 14px;
    margin: 2px 4px;
    border-radius: 10px;
}

/* 鼠标悬浮菜单项 */
.menu-item:hover {
    background: #e6f7ffc6;
    color: #1890ff;
}

/* 当前激活菜单高亮 */
.menu-item.active {
    background: #1890ffc6;
    color: white;
    font-weight: 500;
}

/* 前面小圆点图标 */
.icon {
    font-size: 8px;
    margin-right: 12px;
    flex-shrink: 0; /* 禁止压缩 */
}

/* 菜单文字，文字太长省略号 */
.text {
    white-space: nowrap; /* 文字不换行 */
    overflow: hidden;
    text-overflow: ellipsis; /* 文字溢出显示... */
}

/* 自定义滚动条样式，webkit内核浏览器（Chrome/Edge） */
.menu-list::-webkit-scrollbar {
    width: 6px;
}
.menu-list::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 3px;
}
.menu-list::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.2);
}
.menu-list::-webkit-scrollbar-track {
    background: transparent;
}
</style>