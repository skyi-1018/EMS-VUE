<template>
  <teleport to="body">
    <div v-if="internalState !== 'hidden'" class="zoom-mask" :class="maskClass" :style="{ zIndex: zIndex }" @click.self="handleMaskClick">
      <div ref="dialogEl" class="zoom-dialog" :class="[dialogClass, sizeClass]" :style="dialogStyle" @transitionend="onTransitionEnd">
        <div v-if="title !== null" class="zoom-dialog-header">
          <span class="zoom-dialog-title">{{ title }}</span>
          <button v-if="showClose" class="zoom-close-btn" @click="handleClose">&times;</button>
        </div>
        <div class="zoom-dialog-body">
          <slot />
        </div>
        <div v-if="$slots.footer" class="zoom-dialog-footer">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, reactive } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: null },
  width: { type: String, default: '520px' },
  size: { type: String, default: '' },
  showClose: { type: Boolean, default: true },
  closeOnMask: { type: Boolean, default: true },
  zIndex: { type: [String, Number], default: 2000 },
  sourceRect: {
    type: Object,
    default: () => ({ x: 0, y: 0, width: 200, height: 100 })
  }
})

const emit = defineEmits(['update:visible', 'close'])

const dialogEl = ref(null)
const dialogStyle = ref({})
const dialogClass = ref('')
const maskClass = ref('')
const internalState = ref('hidden')
const targetRect = reactive({ x: 0, y: 0, width: 0, height: 0 })
const originalSourceRect = reactive({ x: 0, y: 0, width: 0, height: 0 })

const sizeClass = computed(() => {
  if (props.size === 'sm') return 'zoom-dialog-sm'
  if (props.size === 'xs') return 'zoom-dialog-xs'
  return ''
})

const dialogInlineWidth = computed(() => {
  if (props.size === 'sm') return '500px'
  if (props.size === 'xs') return '400px'
  return props.width
})

const calcSourceTransform = () => {
  const sx = originalSourceRect.x + originalSourceRect.width / 2
  const sy = originalSourceRect.y + originalSourceRect.height / 2
  const tx = targetRect.x + targetRect.width / 2
  const ty = targetRect.y + targetRect.height / 2
  const scaleX = originalSourceRect.width / targetRect.width
  const scaleY = originalSourceRect.height / targetRect.height
  return {
    transform: `translate(${sx - tx}px, ${sy - ty}px) scale(${scaleX}, ${scaleY})`,
    opacity: 0
  }
}

const calcTargetTransform = () => ({
  transform: 'translate(0, 0) scale(1, 1)',
  opacity: 1
})

const onTransitionEnd = (e) => {
  if (e.propertyName !== 'transform' || e.target !== dialogEl.value) return
  if (internalState.value === 'opening') {
    internalState.value = 'open'
    emit('opened')
  } else if (internalState.value === 'closing') {
    internalState.value = 'hidden'
    dialogStyle.value = {}
    dialogClass.value = ''
    emit('update:visible', false)
    emit('closed')

  }
}

const runOpenAnimation = () => {
  originalSourceRect.x = props.sourceRect.x
  originalSourceRect.y = props.sourceRect.y
  originalSourceRect.width = props.sourceRect.width
  originalSourceRect.height = props.sourceRect.height
  dialogStyle.value = { opacity: 0, width: dialogInlineWidth.value }
  dialogClass.value = ''
  maskClass.value = ''
  internalState.value = 'measuring'
  nextTick(() => {
    requestAnimationFrame(() => {
      const el = dialogEl.value
      if (!el) return
      const rect = el.getBoundingClientRect()
      targetRect.x = rect.left
      targetRect.y = rect.top
      targetRect.width = rect.width
      targetRect.height = rect.height

      dialogStyle.value = {
        ...calcSourceTransform(),
        width: dialogInlineWidth.value,
        transition: 'none'
      }
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          dialogStyle.value = {
            ...calcTargetTransform(),
            width: dialogInlineWidth.value
          }
          dialogClass.value = 'zoom-dialog-transition'
          maskClass.value = 'zoom-mask-active'
          internalState.value = 'opening'
          setTimeout(() => {
            internalState.value = 'open'
            emit('opened')
          }, 420)
        })
      })
    })
  })
}

const runCloseAnimation = () => {
  const el = dialogEl.value
  if (el) {
    const rect = el.getBoundingClientRect()
    targetRect.x = rect.left
    targetRect.y = rect.top
    targetRect.width = rect.width
    targetRect.height = rect.height
  }
  dialogClass.value = 'zoom-dialog-transition'
  maskClass.value = ''
  dialogStyle.value = {
    ...calcSourceTransform(),
    width: dialogInlineWidth.value
  }
  internalState.value = 'closing'
  setTimeout(() => {
    internalState.value = 'hidden'
    dialogStyle.value = {}
    dialogClass.value = ''
    emit('update:visible', false)
    emit('closed')
  }, 420)
}

const handleClose = () => {
  emit('close')
  runCloseAnimation()
}

const handleMaskClick = () => {
  if (props.closeOnMask) {
    emit('close')
    runCloseAnimation()
  }
}

watch(
  () => props.visible,
  (val) => {
    if (val && internalState.value === 'hidden') {
      runOpenAnimation()
    } else if (!val && internalState.value !== 'hidden' && internalState.value !== 'closing') {
      runCloseAnimation()
    }
  }
)
</script>

<style scoped>
.zoom-mask {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0);
  backdrop-filter: blur(0px) saturate(100%);
  -webkit-backdrop-filter: blur(0px) saturate(100%);
  display: flex;
  justify-content: center;
  align-items: center;
  transition: background-color 0.42s ease, backdrop-filter 0.42s ease, -webkit-backdrop-filter 0.42s ease;
}
.zoom-mask-active {
  background-color: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(8px) saturate(140%);
  -webkit-backdrop-filter: blur(8px) saturate(140%);
}
.zoom-dialog {
  position: relative;
  max-height: 80vh;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 12px 36px rgba(0,0,0,0.18);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transform-origin: center center;
}
.zoom-dialog-sm {
  width: 500px !important;
}
.zoom-dialog-xs {
  width: 400px !important;
}
.zoom-dialog-transition {
  transition: transform 0.42s cubic-bezier(0.22, 1.2, 0.36, 1), opacity 0.36s ease;
}
.zoom-dialog-header {
  padding: 18px 24px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}
.zoom-dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: #1d2129;
}
.zoom-close-btn {
  border: none;
  background: transparent;
  font-size: 28px;
  line-height: 1;
  color: #888;
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.zoom-close-btn:hover {
  background: #f2f3f5;
  color: #1d2129;
}
.zoom-dialog-body {
  padding: 20px 24px;
  flex: 1;
  overflow-y: auto;
}
.zoom-dialog-footer {
  padding: 12px 24px 20px;
  border-top: 1px solid #f0f0f0;
  text-align: right;
  flex-shrink: 0;
}
</style>
