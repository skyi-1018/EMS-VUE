<template>
  <ZoomDialog
    v-model:visible="localVisible"
    title="打印设置"
    width="460px"
    :close-on-mask="false"
    :z-index="zIndex"
    :source-rect="sourceRect"
  >
    <el-form label-width="80px">
      <el-form-item label="打印模式">
        <el-radio-group v-model="printForm.mode">
          <el-radio :label="1">三联票</el-radio>
          <el-radio :label="2">四联票</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose" :disabled="loading">取消</el-button>
        <el-button type="primary" @click="handleConfirm" :loading="loading">确认打印</el-button>
      </div>
    </template>
  </ZoomDialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import ZoomDialog from './ZoomDialog.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  sourceRect: { type: Object, default: () => ({ x: 0, y: 0, width: 200, height: 100 }) },
  employeeList: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  zIndex: { type: [String, Number], default: 2000 }
})

const emit = defineEmits(['update:visible', 'confirm'])

const localVisible = ref(props.visible)

const printForm = ref({
  mode: 1
})

watch(() => props.visible, (val) => {
  localVisible.value = val
  if (val) {
    // 打开弹窗重置表单
    printForm.value = { mode: 1 }
  }
})

watch(localVisible, (val) => {
  emit('update:visible', val)
})

const handleClose = () => {
  localVisible.value = false
}

const handleConfirm = () => {
  const { mode } = printForm.value
  if (!mode) {
    ElMessage.warning('请选择联票模式')
    return
  }
  emit('confirm', { mode })
}
</script>

<style scoped>
.dialog-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
</style>

<style>
/* popper 层级兼容，动态类名由父组件 zIndex 决定 */
.print-select-popper-2100 {
  z-index: 2101 !important;
}
.print-select-popper-2000 {
  z-index: 2001 !important;
}
</style>
