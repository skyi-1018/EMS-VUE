<script setup>
import { ref, reactive, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { getTotalSales, getCustomersTotalSales, getProcessesTotalProduction, getCustomersTotalProductValue } from '@/api/reports'
import CommonCard from '@/components/CommonCard.vue'
import ZoomDialog from '@/components/ZoomDialog.vue'
import * as echarts from 'echarts';
import dayjs from 'dayjs'
import { getElementRect, defaultRect, rectFromEvent, rectFromRef } from '@/utils/zoom'

const params = ref({
    mode: 1,
    date: ''
})
const datePickerType = ref('month')

const chartDialogVisible = ref(false)
const chartDialogTitle = ref('')
const chartDialogSourceRect = reactive({ x: 0, y: 0, width: 240, height: 120 })

const zoomChartContainerRef = ref(null)
let zoomChartInstance = null

// 所有图表配置
const chartConfigs = ref([
    {
        key: 'totalSales',
        title: '总产值图',
        apiFn: getTotalSales,
        chartInstance: null,
        option: null,
        seriesItem: { type: 'line', smooth: true, symbol: 'circle' }
    },
    {
        key: 'customersTotalSales',
        title: '客户总产值图',
        apiFn: getCustomersTotalSales,
        chartInstance: null,
        option: null,
        seriesItem: { type: 'line', smooth: true, symbol: 'circle' }
    },
    {
        key: 'processesTotalProduction',
        title: '工艺产量图',
        apiFn: getProcessesTotalProduction,
        chartInstance: null,
        option: null,
        seriesItem: { type: 'pie', encode: { itemName: 'product', value: '工艺产量' }, radius: '50%' }
    },
    {
        key: 'customersTotalProductValue',
        title: '客户权重图',
        apiFn: getCustomersTotalProductValue,
        chartInstance: null,
        option: null,
        seriesItem: { type: 'bar' }

    }
])

// 当前激活的图表key，弹窗根据这个key渲染对应图表
const activeChartKey = ref('')
// 收集卡片DOM
const chartCardDomMap = ref({})
const setChartCardDom = (key, el) => {
    if(el) chartCardDomMap.value[key] = el
}

// 收集卡片内DOM，图实际绘制的DOM
const chartDomMap = ref({})
const setChartDom = (key, el) => {
    if(el) chartDomMap.value[key] = el
}

// 公共点击处理函数
const handleChartCardClick = (chartKey) => {
    const cardEl = chartCardDomMap.value[chartKey]
    const rect = cardEl ? getElementRect(cardEl) : null
    Object.assign(chartDialogSourceRect, rect || defaultRect(240, 120))

    // 设置弹窗标题
    const chartConfig = chartConfigs.value.find(item => item.key === chartKey)
    chartDialogTitle.value = chartConfig?.title || '图表'
    activeChartKey.value = chartKey
    chartDialogVisible.value = true
}

// 批量加载全部图表数据
const loadAllData = async () => {
    for (const chartConfig of chartConfigs.value) {
        const res = await chartConfig.apiFn(params.value)
        if (chartConfig.key === 'customersTotalProductValue') {
            chartConfig.option = {
                legend: {},
                tooltip: {},
                dataset: {
                    source: res.data
                },
                xAxis: {},
                yAxis: { type: 'category' },
                series: generateSeries(res.data, chartConfig.seriesItem),
            }
        } else {
            chartConfig.option = {
                legend: {},
                tooltip: {},
                dataset: {
                    source: res.data
                },
                xAxis: { type: 'category' },
                yAxis: {},
                series: generateSeries(res.data, chartConfig.seriesItem),
            }
        }
        
        const dom = chartDomMap.value[chartConfig.key]
        if (dom && !chartConfig.chartInstance){
            chartConfig.chartInstance = echarts.init(dom)
        }
        chartConfig.chartInstance?.setOption({ ...chartConfig.option })
    }
}

// 生成series数据
const generateSeries = (data, seriesItem) => { 
    if (data && data.length > 0) {
        const seriesCount = data[0].length - 1
        const series = Array.from({length: seriesCount}, () => ({ ...seriesItem }))
        return series
    }
    return []
}

/* 
option = {
  legend: {},
  tooltip: {},
  dataset: {
    // 提供一份数据。
    source: [
      ['product', '2015', '2016', '2017'],
      ['Matcha Latte', 43.3, 85.8, 93.7],
      ['Milk Tea', 83.1, 73.4, 55.1],
      ['Cheese Cocoa', 86.4, 65.2, 82.5],
      ['Walnut Brownie', 72.4, 53.9, 39.1]
    ]
  },
  // 声明一个 X 轴，类目轴（category）。默认情况下，类目轴对应到 dataset 第一列。
  xAxis: { type: 'category' },
  // 声明一个 Y 轴，数值轴。
  yAxis: {},
  // 声明多个 bar 系列，默认情况下，每个系列会自动对应到 dataset 的每一列。
  series: [{ type: 'bar' }, { type: 'bar' }, { type: 'bar' }]
};
*/


// 窗口自适应函数
const handleResize = () => {
    zoomChartInstance?.resize()
    chartConfigs.value.forEach(chartConfig => chartConfig.chartInstance?.resize())
}

// ZoomDialog 打开完成
const handleZoomOpened = () => {
    if (!zoomChartContainerRef.value) return
    zoomChartInstance = echarts.init(zoomChartContainerRef.value)
    const chartConfig = chartConfigs.value.find(item => item.key === activeChartKey.value)
    if (chartConfig?.option) {
        zoomChartInstance.setOption(chartConfig.option)
        zoomChartInstance.resize()
    }
}

// 监听月度/年度切换
watch(() => params.value.mode, (newMode) => {
    newMode === 1 ? datePickerType.value = 'month' : datePickerType.value = 'year'
})

// 监听弹窗打开，渲染对应图表
watch(() => chartDialogVisible, async (visible) => {
    if (!visible) {
        zoomChartInstance?.dispose()
        zoomChartInstance = null
    } 
})

onMounted(() => {
    params.value.date = dayjs().format('YYYY-MM-01')
    nextTick(() => {
        loadAllData()
    })
    window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    zoomChartInstance?.dispose()
    chartConfigs.value.forEach(chartConfig => {
        chartConfig.chartInstance?.dispose()
        chartConfig.chartInstance = null
    })
})

</script>

<template>
    <div class="main-page">
        <div class="page-header">
            <h1>统计图表</h1>
            <div class="header-toolbar">
                <el-date-picker 
                    v-model="params.date" 
                    :type="datePickerType"
                    placeholder="请选择日期" 
                    value-format="YYYY-MM-DD"
                    style="width: 150px;"
                    @change="loadAllData"
                    :clearable="false"
                />
                <el-radio-group v-model="params.mode" @change="loadAllData">
                    <el-radio-button :label="1">月度</el-radio-button>
                    <el-radio-button :label="2">年度</el-radio-button>
                </el-radio-group>
            </div>
        </div>
        <div class="card-list">
            <CommonCard
                v-for="chartConfig in chartConfigs"
                :key="chartConfig.key"
                :title="chartConfig.title"
                :card-ref="el => setChartCardDom(chartConfig.key, el)"
                @click="handleChartCardClick(chartConfig.key)"
            >
                <div :ref="el => setChartDom(chartConfig.key, el)" style="height: 400px;" />
            </CommonCard>
        </div>
        <ZoomDialog
            v-model:visible="chartDialogVisible"
            :title="chartDialogTitle"
            width="90%"
            :source-rect="chartDialogSourceRect"
            :close-on-mask="true"
            @opened="handleZoomOpened"
        >
            <div ref="zoomChartContainerRef" style="height: 600px;" />
        </ZoomDialog>
        
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
.header-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap:12px;
}
.card-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(600px, 100%), 1fr));
  gap: 18px;
  margin-top:16px;
}
</style>