<!-- @/components/CommonCard.vue -->
<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
    title: { type: String, required: true },
    subTitle: { type: String, default: '' },
    statusText: { type: String, default: '' },
    statusBgColor: { type: String, default: '#67c23a' },
    statusTextColor: { type: String, default: '#ffffff' },
    infoList: { type: Array, default: () => [] },
    cardRef: {type: Function, default: null}
})

const emit = defineEmits(['click'])

const handleRef = (el) => {
    if (props.cardRef && typeof props.cardRef === 'function') {
        props.cardRef(el)
    }
}
</script>

<template>
    <div class="common-card" :ref="el => handleRef(el)" @click="$emit('click', $event)">
        <!-- 头部 -->
        <div class="card-header">
            <div class="card-title">{{ title }}</div>
            <!-- 状态，可选 -->
            <div v-if="statusText" class="card-status" :style="{ backgroundColor: statusBgColor, color: statusTextColor }">{{ statusText }}</div>
        </div>
        <!-- 副标题，可选 -->
        <div v-if="subTitle" class="card-subtitle">{{ subTitle }}</div>
        <!-- 分割线 -->
        <div class="card-divider"></div>
        <!-- 信息行 -->
        <div class="card-info-list">
            <div
                v-for="(item, idx) in infoList"
                :key="idx"
                class="info-row"
            >
                <!-- 标签 -->
                <span class="info-label">{{ item.label }}</span>
                <!-- 值，传入为空时显示 '-' -->
                <span class="info-value">{{ item.value ?? '-' }}</span>
            </div>
        </div>
        <!-- 可定义更多内容 -->
        <div class="card-slot">
            <slot />
        </div>
    </div>
</template>

<style scoped>
.common-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.2s;
}

.common-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.09);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.card-title {
  font-size: 20px;
  font-weight: 700;
  color: #0077ff;
}
.card-status {
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 13px;
  white-space: nowrap;
}

.card-divider {
  height: 1px;
  background-color: #e5e7eb;
  margin: 12px 0;
}

.card-info-list {
  margin-bottom: 8px;
}
.info-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  font-size: 14px;
}
.info-label {
  color: #333;
}
.info-value {
  color: #444;
}

.card-slot {
  margin-top: 8px;
}
</style>