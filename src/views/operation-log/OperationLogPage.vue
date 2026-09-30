<script setup>
import { ref, reactive,onMounted, watch } from 'vue'
import { getLogList, excelExport } from '@/api/operation-log'
import { getUserList } from '@/api/auths'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import ZoomDialog from '@/components/ZoomDialog.vue'
import { getElementRect, defaultRect, rectFromEvent } from '@/utils/zoom'

const logParam = ref({
    userId: null,
    operation: '',
    ip: '',
    status: null,
    startTime: null,
    endTime: null,
    pageNum: 1,
    pageSize: 10
})

const exportForm = ref({
    startDate: null,
    endDate: null,
    dateRange: '',
})

const loading = ref(false)
const dateRange = ref('')
const total = ref(null)
const userList = ref([])
const logList = ref([])

const exportBtnRef = ref(null)
const exportDialogVisible = ref(false)
const exportFormRef = ref(null)
const exportLoading = ref(false)
const exportSourceRect = reactive({ x: 0, y: 0, width: 200, height: 100 })

// 日期快捷选择
const shortcuts = [
  {
    text: '最近一小时',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000)
      return [start, end]
    },
  },
  {
    text: '最近十二小时',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 12)
      return [start, end]
    },
  },
  {
    text: '最近一天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24)
      return [start, end]
    },
  },
  {
    text: '最近三天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 3)
      return [start, end]
    },
  },
  {
    text: '最近三十天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 30)
      return [start, end]
    },
  },
]

const exportShortcuts = [
  {
    text: '最近一天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24)
      return [start, end]
    },
  },
  {
    text: '最近三天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 3)
      return [start, end]
    },
  },
  {
    text: '最近三十天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 30)
      return [start, end]
    },
  },
  {
    text: '最近九十天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 90)
      return [start, end]
    },
  },
  {
    text: '最近一百八十',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 180)
      return [start, end]
    },
  },
  {
    text: '最近三百六十五天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 365)
      return [start, end]
    },
  },
]

// 打开Excel导出对话框
const openExportDialog = () => {
  clearExportDialog()
  const rect = getElementRect(exportBtnRef.value)
  Object.assign(exportSourceRect, rect || defaultRect(200, 100))
  exportDialogVisible.value = true
}

// 清空Excel导出对话框
const clearExportDialog = () => {
    exportForm.value = {
        dateRange: '',
        startDate: null,
        endDate: null
    }
    if (exportFormRef.value) {
        exportFormRef.value.clearValidate()
    }
}

// 监听日期范围变化
watch(dateRange,(val)=>{
  if(!val){
    logParam.value.startTime = null
    logParam.value.endTime = null
  }else{
    const [start,end] = val
    logParam.value.startTime = dayjs(start).format('YYYY-MM-DDTHH:mm:ss')
    logParam.value.endTime = dayjs(end).format('YYYY-MM-DDTHH:mm:ss')
  }
})

// 监听导出中日期范围变化
watch(() => exportForm.value.dateRange, (val)=>{
    if(!val){
        exportForm.value.startDate = null
        exportForm.value.endDate = null
    } else {
        const [start, end] = val
        exportForm.value.startDate = start
        exportForm.value.endDate = end
    }
})

// 清空搜索框
const handleClearBtn = () => {
    logParam.value.userId = null,
    logParam.value.operation = '',
    logParam.value.ip = '',
    logParam.value.status = null,
    logParam.value.startTime = null,
    logParam.value.endTime = null,
    dateRange.value = ''
    loadLogList()
}

// 导出对话框确认按钮点击
const handleExportBtn = async (formEl) => {
    if (!formEl) return
    try {
        await formEl.validate()
        if (!exportForm.value.startDate || !exportForm.value.endDate) {
            ElMessage.warning('请选择日期范围')
            return
        }
        doExcelExport()
    } catch (err) {
        return
    }
}

// 网络请求：获取用户列表
const loadUserList = async () => {
    const res = await getUserList()
    userList.value = res.data
}

// 网络请求：获取日志列表
const loadLogList = async () => {
    try {
        loading.value = true
        console.log(logParam.value)
        const res = await getLogList(logParam.value)
        logList.value = res.data.rows
        total.value = res.data.total
        loading.value = false
    } finally {
        loading.value = false
    }
}

// 网络请求：Excel导出
const doExcelExport = async() => {
    try {
        exportLoading.value = true
        const res = await excelExport(exportForm.value.startDate, exportForm.value.endDate)
        const blob = res.data

        let fileName = '日志导出.xlsx'

        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(a.href)

        ElMessage.success('导出成功')
    } catch (err) {
        ElMessage.error('导出失败：' + err)
    } finally {
        exportLoading.value = false
    }
}

onMounted(() => { 
    loadUserList()
    loadLogList()
})

</script>

<template>
    <div class="main-page">
        <div class="page-header">
            <h1>日志记录</h1>
            <div class="header-toolbar">
                <el-button ref="exportBtnRef" type="warning" @click="openExportDialog">Excel 导出</el-button>
            </div>
        </div>
        <div class="search-bar">
            <el-select v-model="logParam.userId" placeholder="请选择用户" clearable style="width: 120px;" @change="loadLogList">
                <el-option
                    v-for="item in userList"
                    :key="item.id"
                    :label="item.username"
                    :value="item.id"
                />
            </el-select>
            <el-input v-model="logParam.operation" placeholder="请输入操作描述" clearable style="width: 160px;" @change="loadLogList"/>
            <el-input v-model="logParam.ip" placeholder="请输入IP" clearable style="width: 160px;" @change="loadLogList"/>
            <el-select v-model="logParam.status" placeholder="请选择状态" clearable style="width: 120px;" @change="loadLogList">
                <el-option label="成功" value="1" />
                <el-option label="失败" value="0" />
            </el-select>
            <el-date-picker 
                v-model="dateRange" 
                type="datetimerange" 
                unlink-panels
                range-separator="-"
                start-placeholder="开始时间"
                end-placeholder="结束时间"
                :shortcuts="shortcuts"
                size="default"
                clearable
                style="max-width: 400px;"
                @change="loadLogList"
            />
            <el-button @click="handleClearBtn">清空</el-button>
        </div>
        <div class="table-box">
            <el-table 
                :data="logList"
                stripe
                v-loading="loading"
            >
                <el-table-column prop="id" label="ID" width="60" />
                <el-table-column prop="userId" label="用户ID" width="70" />
                <el-table-column prop="username" label="用户名" width="100"/>
                <el-table-column prop="operation" label="操作描述" show-overflow-tooltip/>
                <el-table-column prop="method" label="方法定位" show-overflow-tooltip/>
                <el-table-column prop="params" label="传入参数" show-overflow-tooltip/>
                <el-table-column prop="ip" label="IP地址" width="160"/>
                <el-table-column prop="status" label="成功状态" width="100"/>
                <el-table-column prop="errorMsg" label="失败信息" show-overflow-tooltip/>
                <el-table-column prop="costTime" label="耗时(ms)" width="90"/>
                <el-table-column prop="createTime" label="操作时间" width="170"/>
            </el-table>
            <div class="pagination-box">
                <el-pagination
                    v-model:current-page="logParam.pageNum"
                    v-model:page-size="logParam.pageSize"
                    :page-sizes="[10, 20, 50, 100]"
                    background
                    @size-change="loadLogList"
                    @current-change="loadLogList"
                    layout="total, prev, pager, next, jumper, sizes"
                    :total="total" 
                />
            </div>
        </div>
        <ZoomDialog
            v-model:visible="exportDialogVisible"
            title="Excel 导出"
            width="500px"
            :close-on-mask="false"
            :source-rect="exportSourceRect"
        >
            <el-form 
                label-width="100px" 
                :model="exportForm" 
                ref="exportFormRef" 
            >
                <el-form-item label="日期范围" prop="dateRange">
                    <el-date-picker 
                        v-model="exportForm.dateRange" 
                        type="daterange" 
                        unlink-panels
                        range-separator="-"
                        start-placeholder="开始日期"
                        end-placeholder="结束日期"
                        value-format="YYYY-MM-DD"
                        :shortcuts="exportShortcuts"
                        size="default"
                        style="max-width: 300px;"
                        rules="[
                            { required: true, message: '请选择日期范围', trigger: 'change' }
                        ]"
                    />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="exportDialogVisible = false">取消</el-button>
                <el-button type="primary" :loading="exportLoading" @click="handleExportBtn(exportFormRef)">确认</el-button>
            </template>
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
.search-bar {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 24px;
    align-items: center;
}
.pagination-box {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>