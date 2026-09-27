<script setup>
import { ref, watch, onMounted, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { getCustomerSimpleList } from '@/api/customers.js'
import { getProcessList } from '@/api/processes.js'
import { getOrderList } from '@/api/orders.js'
import PrintDialog from '@/components/PrintDialog.vue'
import { getElementRect, defaultRect, rectFromEvent } from '@/utils/zoom'
import { printOrder} from '@/api/prints.js'


const orderListParam = ref({
    id: null,
    customerId: null,
    processId: null,
    beginDate: null,
    endDate: null,
    isPrinted: false,
    pageNum: 1,
    pageSize: 10
})

const total = ref(0)
const dateRange = ref('')

const orderTableRef = ref(null)
const printBtnRef = ref(null)

const loading = ref(false)

const orderList = ref([])
const customerList = ref([])
const processList = ref([])
const ids = ref([])

const printDialogVisible = ref(false)
const printLoading = ref(false)
const printSourceRect = reactive({ x: 0, y: 0, width: 200, height: 100 })


// 清空搜索条件
const handleClearBtn = () => {
    orderListParam.value.id = null
    orderListParam.value.customerId = null
    orderListParam.value.processId = null
    orderListParam.value.beginDate = null
    orderListParam.value.endDate = null
    orderListParam.value.isPrinted = false
    dateRange.value = ''
    orderList.value = []
    ids.value = []
    total.value = 0
    loadOrderList()
}

// 日期快捷选择
const shortcuts = [
  {
    text: '最近一周',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 7)
      return [start, end]
    },
  },
  {
    text: '最近一个月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 30)
      return [start, end]
    },
  },
  {
    text: '最近三个月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 90)
      return [start, end]
    },
  },
]

// 监听日期范围变化
watch(dateRange,(val)=>{
  if(!val){
    orderListParam.value.beginDate = null
    orderListParam.value.endDate = null
  }else{
    const [start,end] = val
    orderListParam.value.beginDate = start
    orderListParam.value.endDate = end
  }
})

const openPrintDialog = () => {
  if (!orderTableRef.value) return
  const selectedRows = orderTableRef.value.getSelectionRows()
  if(selectedRows.length === 0){
    ElMessage.warning('请先勾选要打印的订单！')
    return
  } else if(selectedRows.length > 2) {
    ElMessage.warning('最多只能选择2条订单！')
    return
  }
  ids.value = selectedRows.map(item => item.id)
  const rect = getElementRect(printBtnRef.value)
  Object.assign(printSourceRect, rect || defaultRect(200, 100))
  printDialogVisible.value = true
}

// 打印弹窗回调函数
const handlePrintConfirm = async ({ mode }) => {
    printLoading.value = true
    doPrintOrder(ids.value, mode)
}
// 网络请求：加载客户列表数据
const loadCustomerList = async() => {
    try {
        loading.value = true
        const res = await getCustomerSimpleList()
        if(res.code === 1) {
            customerList.value = res.data
        } else {
            ElMessage.error('加载客户列表失败：' + res.msg)
        }
    } catch (err) {
        ElMessage.error('加载客户列表失败')
    } finally {
        loading.value = false
    }
}

// 网络请求：加载工艺列表数据
const loadProcessList = async() => {
    try {
        loading.value = true
        const res = await getProcessList()
        if(res.code === 1) {
            processList.value = res.data
        } else {
            ElMessage.error('加载工艺列表失败：' + res.msg)
        }
    } catch (err) {
        ElMessage.error('加载工艺列表失败')
    } finally {
        loading.value = false
    }
}

// 网络请求：加载订单列表
const loadOrderList = async () => { 
    if (!orderListParam.value.customerId){
        ElMessage.warning('请先选择客户！')
        return
    }
    try {
        loading.value = true
        const res = await getOrderList(orderListParam.value)
        if (res.code === 1) {
            orderList.value = res.data.rows
            total.value = res.data.total
        } else {
            ElMessage.error('加载订单列表失败：' + res.msg)
        } 
    } catch (err) {
        ElMessage.error('加载订单列表失败')
    } finally {
        loading.value = false
    }
}

// 网络请求：打印订单
const doPrintOrder = async (ids, mode) => { 
    try {
        printLoading.value = true
        await printOrder(ids, mode)
        printDialogVisible.value = false
        ElMessage.success('打印成功！')
        
    } finally {
        printLoading.value = false
        loadOrderList()
    }
}

onMounted(() => { 
    loadCustomerList()
    loadProcessList()
    loadOrderList()
})
</script>

<template>
    <div class="main-page">
        <div class="page-header">
            <h1>订单打印</h1>
            <div>
                <el-button ref="printBtnRef" type="success" @click="openPrintDialog">打印选中订单</el-button>
            </div>
        </div>
        <div class="search-bar">
            <el-input type="number" v-model="orderListParam.id" placeholder="订单Id" style="width: 100px;" clearable @change="loadOrderList"/>
            <el-select v-model="orderListParam.customerId" placeholder="请选择客户" style="width: 120px;" @change="loadOrderList">
                <el-option
                    v-for="item in customerList"
                    :key="item.id"
                    :label="item.name"
                    :value="item.id"
                />
            </el-select>
            <el-select v-model="orderListParam.processId" placeholder="请选择工艺" clearable style="width: 120px;" @change="loadOrderList">
                <el-option
                    v-for="item in processList"
                    :key="item.id"
                    :label="item.name"
                    :value="item.id"
                />
            </el-select>
            <el-select v-model="orderListParam.isPrinted" placeholder="是否已打印" @change="loadOrderList">
                <el-option label="未打印" :value="false" />
                <el-option label="已打印" :value="true" />
            </el-select>
            <el-date-picker 
                v-model="dateRange"
                type="daterange" 
                unlink-panels
                range-separator="-"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                :shortcuts="shortcuts"
                size="default"
                clearable
                style="max-width: 300px;"
                @change="loadOrderList"
            />
            <el-button @click="handleClearBtn">清空</el-button>
        </div>
        <div class="table-box">
            <el-table 
                :data="orderList"
                stripe
                v-loading="loading"
                ref="orderTableRef"
            >
                <el-table-column type="selection" width="50" />
                <el-table-column prop="id" label="ID" width="60" />
                <el-table-column prop="processName" label="工艺" width="100" />
                <el-table-column prop="orderDate" label="日期" width="110"/>
                <el-table-column prop="productName" label="产品名称" width="200" show-overflow-tooltip/>
                <el-table-column prop="spec1" label="规格1" width="70"/>
                <el-table-column prop="spec2" label="规格2" width="70"/>
                <el-table-column prop="quantity" label="数量" width="70"/>
                <el-table-column prop="printCount" label="打印次数" />
            </el-table>
            <div class="pagination-box">
                <el-pagination 
                    v-model:current-page="orderListParam.pageNum"
                    v-model:page-size="orderListParam.pageSize"
                    :page-sizes="[10, 20, 50, 100]"
                    :page-size="10"
                    background
                    @size-change="loadOrderList"
                    @current-change="loadOrderList"
                    layout="total, prev, pager, next, jumper, sizes"
                    :total="total" 
                />
            </div>
        </div>
        <PrintDialog
            v-model:visible="printDialogVisible"
            :z-index="2100"
            :source-rect="printSourceRect"
            :employee-list="employeeList"
            :loading="printLoading"
            @confirm="handlePrintConfirm"
        />
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