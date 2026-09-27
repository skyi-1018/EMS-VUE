<script setup>
import { reactive, ref } from 'vue'
import { User, Lock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { register } from '@/api/auths'
import { useRouter } from 'vue-router'

const registerFormRef = ref(null)
const router = useRouter()

const registerForm = reactive({
  username: '',
  account: '',
  password: '',
  confirmPassword: '',
  adminPassword: ''
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 10, message: '长度为 2 ~ 10 个字符', trigger: 'blur' }
  ],
  account: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    { min: 6, max: 30, message: '长度为 6 ~ 30 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 30, message: '密码至少 6 位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      // 自定义校验器：确认密码必须和密码一致
      validator: (rule, value, callback) => {
        if (value !== registerForm.password) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  adminPassword: [
    { required: true, message: '请输入管理员密码', trigger: 'blur' }
  ]
}

const loading = ref(false)

// 请求按钮点击
const handleRegister = async (formEl) => {
  if (!formEl) return
  try {
    await formEl.validate()
    doRegister()
  } catch (err) {
    return
  }
}

const onLogin = () => {
  router.push('/login')
}

// 网络请求：注册
const doRegister = async () => {
  loading.value = true
  try {
    const res = await register({
      username: registerForm.username,
      account: registerForm.account,
      password: registerForm.password,
      adminPassword: registerForm.adminPassword
    })
    if (res.code === 1) {
      ElMessage.success('注册成功，请登录')
      router.push('/login')
    }
  } catch (err) {

  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-wrap">
    <!-- 左侧品牌区 -->
    <div class="brand">
      <h1>创建账号</h1>
      <p>注册后即可开始使用</p>
    </div>
    <!-- 右侧表单 -->
    <div class="form-panel">
      <el-form
        ref="registerFormRef"
        :model="registerForm"
        :rules="rules"
        size="large"
        class="login-form"
        @submit.prevent
      >
        <h2>注册</h2>
        <el-form-item prop="username">
          <el-input
            v-model.trim="registerForm.username"
            placeholder="请输入用户名（2~10位）"
            clearable
          />
        </el-form-item>
        <el-form-item prop="account">
          <el-input
            v-model.trim="registerForm.account"
            placeholder="请输入账号，用于登录（6~30位）"
            :prefix-icon="User"
            clearable
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="registerForm.password"
            type="password"
            placeholder="请输入密码（至少6位）"
            :prefix-icon="Lock"
            show-password
            @keyup.enter="handleRegister(registerFormRef)"
            clearable
          />
        </el-form-item>
        <el-form-item prop="confirmPassword">
          <el-input
            v-model="registerForm.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            :prefix-icon="Lock"
            show-password
            @keyup.enter="handleRegister(registerFormRef)"
            clearable
          />
        </el-form-item>
        <el-form-item prop="adminPassword">
          <el-input
            v-model="registerForm.adminPassword"
            type="password"
            placeholder="请输入管理员密码"
            :prefix-icon="Lock"
            show-password
            @keyup.enter="handleRegister(registerFormRef)"
            clearable
          />
        </el-form-item>
        <el-button
          type="primary"
          class="submit"
          :loading="loading"
          @click="handleRegister(registerFormRef)"
        >
          注 册
        </el-button>
        <p class="register">
          已有账号？
          <el-link type="primary" :underline="false" @click="onLogin">
            去登录
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
