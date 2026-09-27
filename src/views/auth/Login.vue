<script setup>
import { reactive, ref, onMounted } from 'vue'
import { User, Lock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { login, register, me } from '@/api/auths'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/store/user'

const loginFormRef = ref(null)
const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const loginForm = reactive({
  account: '',
  password: '',
  remember: false
})

const rules = {
  account: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    { min: 3, max: 20, message: '长度为 3 ~ 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' }
  ]
}

const loading = ref(false)

// 请求按钮点击
const handleLogin = async(formEl) => {
    if(!formEl) return
    try {
        await formEl.validate()
        doLogin()
    } catch (err) {
        return
    }
}

const onForgot = () => {
  // router.push('/forgot')
}
const onRegister = () => {
  router.push('/register')
}

// 网络请求：登录
const doLogin = async() => {
  loading.value = true
  try {
    const res = await login(loginForm)
    userStore.setToken(res.data.token)
    userStore.setUserInfo(res.data.userInfo)

    if (loginForm.remember) {
      localStorage.setItem('account', loginForm.account)
    } else {
      localStorage.removeItem('account')
    }

    const redirect = route.query.redirect
    router.push(redirect || '/') 
    ElMessage.success("登录成功")  
  } catch (err) {
    ElMessage.error("登录失败")
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  const saveAccount = localStorage.getItem('account')
  if (saveAccount) {
    loginForm.account = saveAccount
    loginForm.remember = true
  }
})
</script>

<template>
  <div class="login-wrap">
    <!-- 左侧品牌区 -->
    <div class="brand">
      <h1>欢迎回来</h1>
      <p>登录你的账号，继续你的旅程</p>
    </div>

    <!-- 右侧表单 -->
    <div class="form-panel">
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="rules"
        size="large"
        class="login-form"
        @submit.prevent
      >
        <h2>登录</h2>

        <el-form-item prop="account">
          <el-input
            v-model="loginForm.account"
            placeholder="请输入账号"
            :prefix-icon="User"
            clearable
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            :prefix-icon="Lock"
            show-password
            @keyup.enter="handleLogin(loginFormRef)"
            clearable
          />
        </el-form-item>

        <div class="row">
          <el-checkbox v-model="loginForm.remember">记住我</el-checkbox>
          <el-link type="primary" :underline="false" @click="onForgot" :disabled="true">
            忘记密码？
          </el-link>
        </div>

        <el-button
          type="primary"
          class="submit"
          :loading="loading"
          @click="handleLogin(loginFormRef)"
        >
          登 录
        </el-button>

        <p class="register">
          还没有账号？
          <el-link type="primary" :underline="false" @click="onRegister">
            立即注册
          </el-link>
        </p>
      </el-form>
    </div>
  </div>
</template>



<style scoped>
.login-wrap {
  display: flex;
  min-height: 100vh;
}

/* 左侧品牌区 */
.brand {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #fff;
  background: #1790FF;
}
.brand h1 { font-size: 2.4rem; margin-bottom: 0.5rem; }
.brand p  { opacity: 0.85; font-size: 1rem; }

/* 右侧表单 */
.form-panel {
  width: 440px;
  max-width: 100%;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.login-form { width: 100%; max-width: 340px; }

.login-form h2 {
  font-size: 1.6rem;
  color: #333;
  margin-bottom: 1.6rem;
  text-align: center;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.2rem;
}

.submit {
  width: 100%;
  margin-top: 0.2rem;
  font-size: 1rem;
  letter-spacing: 4px;
}

.register {
  margin-top: 1.4rem;
  text-align: center;
  font-size: 0.9rem;
  color: #888;
}

/* 响应式 */
@media (max-width: 720px) {
  .brand { display: none; }
  .form-panel { width: 100%; }
}
</style>
