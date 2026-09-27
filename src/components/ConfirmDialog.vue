<script setup>
import { ref, reactive } from 'vue'
import { Warning } from '@element-plus/icons-vue'
import ZoomDialog from './ZoomDialog.vue'

// 组件内部自管所有状态，外部无需关心
const visible = ref(false)
const message = ref('')
const loading = ref(false)
const sourceRect = reactive({ x: 0, y: 0, width: 200, height: 100 })
const confirmCallback = ref(null)
const confirmText = ref('确定删除')
const buttonType = ref('danger')

/**
 * 打开确认弹窗
 * @param {Object} options
 * @param {string} options.message      提示文案
 * @param {Object} options.sourceRect   缩放动画起始矩形 { x, y, width, height }
 * @param {Function} options.onConfirm  点击确认后的回调（支持 async）
 * @param {string} options.confirmText  确认按钮文字，默认"确定删除"
 * @param {Function} options.buttonType 自定义按钮类型，默认"danger"
 */
const open = (options) => {
  message.value = options.message || ''
  confirmText.value = options.confirmText || '确定删除'
  if (options.sourceRect) {
    Object.assign(sourceRect, options.sourceRect)
  }
  confirmCallback.value = options.onConfirm || null
  buttonType.value = options.buttonType || 'danger'
  visible.value = true
}

const close = () => {
  visible.value = false
}

// 确认：自动加 loading，回调成功后自动关闭，抛异常则保持打开
const handleConfirm = async () => {
  if (!confirmCallback.value) {
    visible.value = false
    return
  }
  loading.value = true
  try {
    await confirmCallback.value()
    visible.value = false   // 回调执行成功 → 自动关闭
  } catch (err) {
    // 回调抛异常（如删除失败）→ 保持弹窗打开，由调用方弹错误提示
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  visible.value = false
}

defineExpose({ open, close })
</script>

<template>
  <ZoomDialog
    v-model:visible="visible"
    title="提示"
    width="420px"
    :close-on-mask="false"
    :z-index="2100"
    :source-rect="sourceRect"
  >
    <div class="confirm-content">
      <el-icon size="20px" color="#e6a23c" style="margin-right: 10px;">
        <Warning />
      </el-icon>
      <span style="white-space: pre-line;">{{ message }}</span>
    </div>
    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button :type="buttonType" @click="handleConfirm" :loading="loading">
        {{ confirmText }}
      </el-button>
    </template>
  </ZoomDialog>
</template>

<style scoped>
.confirm-content {
  display: flex;
  align-items: center;
}
</style>
