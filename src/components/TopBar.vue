<!-- @/components/Topbar.vue -->
<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '@/store/user'
import { getElementRect, defaultRect, rectFromEvent } from '@/utils/zoom'
import { ElMessage } from 'element-plus'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const username = ref('');
const confirmDialogRef = ref(null);
const logoutBtnRef = ref(null)
username.value = userStore.userInfo?.username;
const goTo = (path) => {
  router.push(path);
};

// 退出登录按钮点击
const handleLogout = async () => {
    const rect = getElementRect(logoutBtnRef.value);
    confirmDialogRef.value.open({
        message: '确定退出登录吗？',
        sourceRect: rect || defaultRect(200, 100),
        onConfirm: () => doLogout(),
        confirmText: '确定退出'
    })
};

// 退出登录
const doLogout = async () => {
    await userStore.resetAuth();
    ElMessage.success("退出登录成功")
    router.push('/login')
}
</script>

<template>
    <div class="topbar">
        <span class="title" @click="goTo('/')">松福管理系统</span>
        <div class="right-section">
            <span class="welcome">欢迎，{{ username }}</span>
            <el-button class="logout-btn" @click="handleLogout" ref="logoutBtnRef">退出登录</el-button>
        </div>
    </div>
    <ConfirmDialog ref="confirmDialogRef" />
</template>

<style scoped>
.topbar {
    width: 100%;
    height: 60px;
    background-color: rgba(255, 255, 255, 0.5);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 999;
    backdrop-filter: blur(10px);
    box-sizing: border-box;
}

.title {
    font-size: 20px;
    font-weight: bold;
    color: #1890FF;
    cursor: pointer;
}

.right-section {
    display: flex;
    align-items: center;
    gap: 16px;
}

.welcome {
    font-size: 14px;
    color: #666;
}

.logout-btn {
    padding: 6px 16px;
    background: transparent;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    color: #666;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
}

.logout-btn:hover {
    color: #ff4d4f;
    border-color: #ff4d4f;
}
</style>