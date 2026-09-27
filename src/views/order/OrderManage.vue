<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getCustomerSimpleList, getCustomerFakeUnitPriceMap } from '@/api/customers.js'
import { getProcessList } from '@/api/processes.js'
import ZoomDialog from '@/components/ZoomDialog.vue'
import { getElementRect, defaultRect, rectFromEvent } from '@/utils/zoom'
import { getOrderList, addOrder, updateOrder, deleteOrderById, exportExcel, orderSuggest, getDeletedOrderList, restoreByIds } from '@/api/orders.js'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { ROLE } from '@/utils/role'
import dayjs from 'dayjs'

const orderListParam = ref({
  id: null,
  customerId: null,
  processId: null,
  productName: '',
  beginDate: null,
  endDate: null,
  isSpecialUnitPrice: false,
  beginAmount: null,
  endAmount: null,
  pageNum: 1,
  pageSize: 10
})

const orderForm = ref({
    id: null,
    customerId: null,
    processId: null,
    orderDate: '',
    productName: '',
    spec1: null,
    spec2: null,
    quantity: null,
    unitPrice: null,
    specialUnitPrice: null,
    isSpecialUnitPrice: false,
    amount: null,
    remark: ''
})

const exportForm = ref({
    mode: 1,
    month: '',
    customerId: null
})

const customerList = ref([])
const processList = ref([])
const orderList = ref([])
const deletedOrderList = ref([])

const timer = ref(null)

const customerUnitPriceMap = ref({})

const confirmLoading = ref(false)
const confirmCallback = ref(null)
const total = ref(null)
const dateRange = ref('')

const orderDialogType = ref('add')
const orderDialogTitle = ref('')

const loading = ref(false)
const exportLoading = ref(false)
const orderDialogVisible = ref(false)
const confirmDialogVisible = ref(false)
const exportDialogVisible = ref(false)
const trashDialogVisible = ref(false)

const addBtnRef = ref(null)
const deleteBtnRef = ref(null)
const orderFormRef = ref(null)
const confirmDialogRef = ref(null)
const exportBtnRef = ref(null)
const exportFormRef = ref(null)
const trashBtnRef = ref(null)
const trashTableRef = ref(null)


const sourceRect = reactive({ x: 0, y: 0, width: 240, height: 120 })
const exportSourceRect = reactive({ x: 0, y: 0, width: 200, height: 100 })
const trashSourceRect = reactive({ x: 0, y: 0, width: 200, height: 100 })

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

// 订单对话框校验规则
const rules = reactive({
  customerId: [
    { required: true, message: '请选择客户', trigger: 'blur' }
  ],
  processId: [
    { required: true, message: '请选择工艺', trigger: 'change'}
  ],
  orderDate: [
    { required: true, message: '请选择日期', trigger: 'change'}
  ],
  productName: [
    {required: true, message: '请输入产品名称', trigger: 'change'},
    {max: 100, message: '长度不能超过100个字符', trigger: 'change'}
  ],
  spec1: [
    {required: true, message: '请输入规格1', trigger: 'change'}
  ],
  spec2: [
    {required: true, message: '请输入规格2', trigger: 'change'}
  ],
  quantity: [
    {required: true, message: '请输入数量', trigger: 'change'}
  ],
  unitPrice: [
    {required: true, message: '请输入单价', trigger: 'change'}
  ],
  amount: [
    {required: true, message: '请输入总价', trigger: 'change'}
  ],
})

// 导出对话框校验规则
const exportRules = reactive({
  mode: [
    { required: true, message: '请选择模式', trigger: 'change' }
  ],
  month: [
    { required: true, message: '请选择月份', trigger: 'change'}
  ]
})

// 清空搜索框
const handleClearBtn = () => {
    orderListParam.value.id = null
    orderListParam.value.customerId = null
    orderListParam.value.processId = null
    orderListParam.value.productName = ''
    orderListParam.value.beginDate = null
    orderListParam.value.endDate = null
    orderListParam.value.isSpecialUnitPrice = false
    orderListParam.value.beginAmount = null
    orderListParam.value.endAmount = null
    dateRange.value = ''
    loadOrderList()
}

// 订单对话框计算金额
const calcAmount = () => {
  const { spec1, spec2, quantity, unitPrice } = orderForm.value
  // 任意一个为空，amount置null
  if(spec1 == null || spec2 == null || quantity == null || unitPrice == null){
    orderForm.value.amount = null
    return
  }
  const num = spec1 * spec2 * quantity * unitPrice * 0.0001
  if(isNaN(num)){
    orderForm.value.amount = null
  }else{
    orderForm.value.amount = Number(num.toFixed(2))
  }
}

// 打开订单对话框(type: 'add', 'edit')
const openOrderDialog = (type) => {
    orderDialogType.value = type
    orderDialogTitle.value = type === 'add' ? '添加订单' : '编辑订单'
    clearOrderDialog()
    const rect = getElementRect(addBtnRef.value)
    Object.assign(sourceRect, rect || defaultRect(240, 120))
    orderDialogVisible.value = true
}

// 表格行点击
const handleRowClick = (row, column, event) => {
    let el = event && event.target
    while (el && el.tagName !== 'TR' && el.parentElement) {
        el = el.parentElement
    }
    if (el && el.getBoundingClientRect) {
        const rect = el.getBoundingClientRect()
        sourceRect.x = rect.left
        sourceRect.y = rect.top
        sourceRect.width = rect.width
        sourceRect.height = rect.height
    }
    clearOrderDialog()
    orderForm.value = { ...row }
    if(row.specialUnitPrice){
      orderForm.value.unitPrice = row.specialUnitPrice
      orderForm.value.isSpecialUnitPrice = true
    }
    orderDialogType.value = 'edit'
    orderDialogTitle.value = '编辑订单'
    orderDialogVisible.value = true
}

// 编辑对话框删除按钮点击
const handleDeleteOrderBtn = () => {
    const rect = getElementRect(deleteBtnRef.value)
    confirmDialogRef.value.open({
        message: '确定删除该订单吗？',
        sourceRect: rect || defaultRect(200, 100),
        onConfirm: doDeleteOrderById
    })
}

// 清空订单对话框内容
const clearOrderDialog = () => {
  orderForm.value = {
    id: null,
    customerId: null,
    processId: null,
    productName: '',
    spec1: null,
    spec2: null,
    quantity: null,
    unitPrice: null,
    specialUnitPrice: null,
    isSpecialUnitPrice: false,
    amount: null,
    remark: '',
    orderDate: dayjs().format('YYYY-MM-DD')
  }
  if(orderFormRef.value){
    orderFormRef.value.clearValidate()
  }
}

// 清空导出对话框内容
const clearExportDialog = () => {
  exportForm.value = {
    mode: 1,
    month: dayjs().format('YYYY-MM'),
    customerId: null
  }
  if(exportFormRef.value){
    exportFormRef.value.clearValidate()
  }
}


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

// 订单对话框保存按钮点击事件
const handleSubmitBtn = async (formEl) => {
  if (!formEl) return
  try {
    await formEl.validate()
    if (orderForm.value.isSpecialUnitPrice) {
      orderForm.value.specialUnitPrice = orderForm.value.unitPrice
    } else {
      orderForm.value.specialUnitPrice = null
    }
    if (orderDialogType.value === 'add') {
      doAddOrder()
    } else {
      doUpdateOrder()
    }
  } catch (err) {
    return
  }
}

// 订单对话框更新单价
const updateUnitPrice = () => {
    try {
        if (orderForm.value.isSpecialUnitPrice) return
        if (orderForm.value.customerId && orderForm.value.processId){
            orderForm.value.unitPrice = customerUnitPriceMap.value[orderForm.value.customerId][orderForm.value.processId].fakeUnitPrice
        } else {
            orderForm.value.unitPrice = null
        }
    } catch (err) {
        orderForm.value.unitPrice = null
    } finally {
        calcAmount()
    }   
}


// 打开Excel导出对话框
const openExportDialog = () => {
  clearExportDialog()
  const rect = getElementRect(exportBtnRef.value)
  Object.assign(exportSourceRect, rect || defaultRect(200, 100))
  exportDialogVisible.value = true
}

// 打开回收站对话框
const openTrashDialog = () => {
  loadDeletedOrderList()
  const rect = getElementRect(trashBtnRef.value)
  Object.assign(trashSourceRect, rect || defaultRect(200, 100))
  trashDialogVisible.value = true
}

// 导出对话框确认按钮点击
const handleExportBtn = async (formEl) => {
    if (!formEl) return
  try {
    await formEl.validate()
    if (exportForm.value.mode === 3 && !exportForm.value.customerId) {
        ElMessage.warning('请选择客户')
        return
    }
    doExcelExport()
  } catch (err) {
    return
  }
}


// 联想后规格填充
const handleSuggestSelect = (item) => {
    orderForm.value.productName = item.productName
    orderForm.value.spec1 = item.spec1
    orderForm.value.spec2 = item.spec2
    calcAmount()
}
// 品名联想触发
const productNameSuggestSearch = (queryString, cb) => {
  clearTimeout(timer.value)
  // 使用组件传进来的 queryString，不要读orderForm.productName
  if (!queryString) {
    return cb([])
  }
  timer.value = window.setTimeout(async () => {
    try {
      // 把用户输入的关键词传给后端，而不是orderForm.productName
      const params = { ...orderForm.value, productName: queryString }
      const res = await orderSuggest(params)
      if(res.code === 1) {
        cb(res.data ?? [])
      } else {
        cb([])
      }
    } catch(e) {
      cb([])
    }
  }, 300)
}

// 恢复按钮点击
const handleRestoreBtn =  () => { 
  const selectedRows = trashTableRef.value.getSelectionRows()
  if(selectedRows.length === 0){
    ElMessage.warning('请先勾选要恢复的订单！')
    return
  }
  const ids = selectedRows.map(item => item.id)
  doRestoreByIds(ids)
}

// 网络请求：获取客户单价Map
const loadCustomerUnitPriceMap = async () => { 
    const res = await getCustomerFakeUnitPriceMap()
    customerUnitPriceMap.value = res.data
}

// 网络请求：添加订单
const doAddOrder = async () => {
    try {
        await addOrder(orderForm.value)
        ElMessage.success('添加成功')
        orderDialogVisible.value = false
        loadOrderList()
    } catch (err) {
        ElMessage.error('添加失败')
    }
}

// 网络请求：修改订单
const doUpdateOrder = async () => { 
    await updateOrder(orderForm.value)
    orderDialogVisible.value = false
    ElMessage.success('修改成功')
    loadOrderList()
    
}

// 网络请求：根据id删除订单
const doDeleteOrderById = async () => { 
    try {
        await deleteOrderById(orderForm.value.id)
        orderDialogVisible.value = false
        ElMessage.success('删除成功')
        loadOrderList()
    } catch (err) {
        ElMessage.error('删除失败')
    } finally {
        confirmLoading.value = false
    }
}

// 网络请求：加载订单列表
const loadOrderList = async () => { 
    try {
        loading.value = true
        const res = await getOrderList(orderListParam.value)
        orderList.value = res.data.rows
        total.value = res.data.total
    } finally {
        loading.value = false
    }
}

// 网络请求：加载客户列表
const loadCustomerList = async () => { 
    const res = await getCustomerSimpleList()
    customerList.value = res.data
}

// 网络请求：加载工艺列表
const loadProcessList = async () => { 
    const res = await getProcessList()
    processList.value = res.data
}

// 网络请求：Excel 导出
const doExcelExport = async () => {
  try {
    exportLoading.value = true
    const res = await exportExcel(exportForm.value)
    const blob = res.data

    let fileName = ''
    const disposition = res.headers['content-disposition']

    if (disposition) {
      // 专门匹配 filename*=UTF-8''xxxx.zip / xxxx.xlsx
      const reg = /filename\*=UTF-8''(.+)/
      const matchResult = disposition.match(reg)
      if (matchResult && matchResult[1]) {
        fileName = decodeURIComponent(matchResult[1])
      }
    }

    // 兜底逻辑，解析失败时，根据blob type自动后缀
    if (!fileName) {
      if (blob.type === 'application/zip') {
        fileName = '订单导出.zip'
      } else {
        fileName = '订单导出.xlsx'
      }
    }

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

// 网络请求：获取已删除的订单列表
const loadDeletedOrderList = async () => { 
    const res = await getDeletedOrderList()
    deletedOrderList.value = res.data
}

// 网络请求：恢复订单
const doRestoreByIds = async (ids) => { 
      await restoreByIds(ids)
      ElMessage.success('恢复成功')
      trashDialogVisible.value = false
      loadOrderList()
}



onMounted(() => { 
    loadCustomerList()
    loadProcessList()
    loadOrderList()
    loadCustomerUnitPriceMap()
    orderForm.value.orderDate = dayjs().format('YYYY-MM-DD')
})
</script>

<template>
    <div class="main-page">
        <div class="page-header">
            <h1>订单管理</h1>
            <div class="header-toolbar">
                <el-button ref="trashBtnRef" type="danger" @click="openTrashDialog" v-permission="ROLE.ADMIN">回收站</el-button>
                <el-button ref="importBtnRef" type="success" @click="openImportDialog" v-permission="ROLE.ADMIN">Excel 导入</el-button>
                <el-button ref="exportBtnRef" type="warning" @click="openExportDialog" v-permission="ROLE.ADMIN">Excel 导出</el-button>
                <el-button ref="addBtnRef" type="primary" @click="openOrderDialog('add')">添加订单</el-button>
            </div>
        </div>
        <div class="search-bar">
            <el-input type="number" v-model="orderListParam.id" placeholder="订单Id" style="width: 100px;" clearable @change="loadOrderList" />
            <el-select v-model="orderListParam.customerId" placeholder="请选择客户" clearable style="width: 120px;" @change="loadOrderList">
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
            <el-input v-model="orderListParam.productName" placeholder="请输入品名" clearable style="width: 120px;" @change="loadOrderList"/>
            <el-date-picker 
                v-model="dateRange"
                type="daterange" 
                unlink-panels
                range-separator="-"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
                :shortcuts="shortcuts"
                size="default"
                clearable
                style="max-width: 300px;"
                @change="loadOrderList"
            />
            <el-checkbox v-model="orderListParam.isSpecialUnitPrice" label="特殊单价"  @change="loadOrderList"/>
            <el-button @click="handleClearBtn">清空</el-button>
        </div>
        <div class="table-box">
            <el-table 
                :data="orderList"
                stripe
                v-loading="loading"
                @row-click="handleRowClick"
            >
                <el-table-column prop="id" label="ID" width="60" />
                <el-table-column prop="customerName" label="客户名" width="100" />
                <el-table-column prop="processName" label="工艺" width="100" />
                <el-table-column prop="orderDate" label="日期" width="110"/>
                <el-table-column prop="productName" label="产品名称" width="200" show-overflow-tooltip/>
                <el-table-column prop="spec1" label="规格1" width="70"/>
                <el-table-column prop="spec2" label="规格2" width="70"/>
                <el-table-column label="单价" width="100">
                    <template #default="{row}"> 
                        <span :style="{color: row.specialUnitPrice ? '#f56c6c' : '#67c23a'}">
                            {{ row.specialUnitPrice ? row.specialUnitPrice : row.unitPrice }}
                            <span v-if="row.specialUnitPrice" style="font-size: 12px;">(特殊)</span>
                        </span>
                    </template>
                </el-table-column>
                <el-table-column prop="quantity" label="数量" width="70"/>
                <el-table-column prop="amount" label="总价" width="100"/>
                <el-table-column prop="remark" label="备注" show-overflow-tooltip/>
                <el-table-column prop="createTime" label="创建时间" width="170"/>
                <el-table-column prop="updateTime" label="更新时间" width="170"/>
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
        <ZoomDialog
            v-model:visible="orderDialogVisible"
            :title="orderDialogTitle"
            width="600px"
            :close-on-mask="false"
            :source-rect="sourceRect"
        >
            <el-form label-width="110px" :rules="rules" :model="orderForm" ref="orderFormRef"> 
                <el-form-item label="客户名" prop="customerId">
                    <el-select v-model="orderForm.customerId" placeholder="请选择客户" @change="updateUnitPrice" clearable style="width: 100%;">
                        <el-option
                            v-for="item in customerList"
                            :key="item.id"
                            :label="item.name"
                            :value="item.id"
                            clearable
                        />
                    </el-select>
                </el-form-item>
                <el-form-item label="工艺" prop="processId">
                    <el-select v-model="orderForm.processId" placeholder="请选择工艺" @change="updateUnitPrice" clearable style="width: 100%;">
                        <el-option
                            v-for="item in processList"
                            :key="item.id"
                            :label="item.name"
                            :value="item.id"
                            clearable
                        />
                    </el-select>
                </el-form-item>
                <el-form-item label="日期" prop="orderDate">
                    <el-date-picker 
                        v-model="orderForm.orderDate" 
                        type="date" 
                        placeholder="请选择日期" 
                        value-format="YYYY-MM-DD"
                        clearable
                        style="width: 100%;"
                    />
                </el-form-item>
                <el-form-item label="产品名称" prop="productName">
                    <el-autocomplete 
                        v-model="orderForm.productName" 
                        :fetch-suggestions="productNameSuggestSearch" 
                        clearable 
                        placeholder="请输入品名" 
                        @select="handleSuggestSelect"
                        trigger-on-focus="false"
                        style="width: 100%;"
                    >
                        <template #default="{ item }">
                            <div class="autocomplete-item">
                                <div class="name">{{ item.productName }}</div>
                                <div class="spec">{{ item.spec1 }} x {{ item.spec2 }}</div>
                            </div>
                        </template>
                    </el-autocomplete>
                </el-form-item>
                <el-form-item label="规格1" prop="spec1">
                    <el-input v-model="orderForm.spec1" type="number" step="0.1" placeholder="请输入规格1" clearable @input="calcAmount"/>
                </el-form-item>
                <el-form-item label="规格2" prop="spec2">
                    <el-input v-model="orderForm.spec2" type="number" step="0.1" placeholder="请输入规格2" clearable @input="calcAmount"/>
                </el-form-item>
                <el-form-item label="数量" prop="quantity">
                    <el-input v-model="orderForm.quantity" placeholder="请输入数量" type="number" step="1" clearable @input="calcAmount"/>
                </el-form-item>
                <el-form-item label="单价" prop="unitPrice">
                    <el-input 
                        v-model="orderForm.unitPrice" 
                        placeholder="请输入单价" 
                        type="number" 
                        step="0.001" 
                        :disabled="!orderForm.isSpecialUnitPrice"
                        clearable
                        @input="calcAmount"
                    />
                    <el-checkbox v-model="orderForm.isSpecialUnitPrice" label="特殊单价" @change="updateUnitPrice"/>
                </el-form-item>
                <el-form-item label="总价" prop="amount">
                    <el-input 
                        v-model="orderForm.amount" 
                        placeholder="请输入总价" 
                        type="number" 
                        step="0.01" 
                        disabled
                    />
                </el-form-item>
                <el-form-item label="备注" prop="remark">
                    <el-input v-model="orderForm.remark" placeholder="请输入备注" clearable/>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="orderDialogVisible = false">取消</el-button>
                <el-button ref="deleteBtnRef" v-if="orderDialogType === 'edit'" type="danger" @click="handleDeleteOrderBtn">删除</el-button>
                <el-button type="primary" @click="handleSubmitBtn(orderFormRef)">保存</el-button>
            </template>
        </ZoomDialog>
        <ZoomDialog
            v-model:visible="exportDialogVisible"
            title="Excel 导出"
            width="500px"
            :close-on-mask="false"
            :source-rect="exportSourceRect"
        >
            <el-form label-width="100px" :model="exportForm" ref="exportFormRef" :rules="exportRules">
                <el-form-item label="导出模式" prop="mode">
                    <el-radio-group v-model="exportForm.mode">
                        <el-radio :label="1">全部打包</el-radio>
                        <el-radio :label="2">月度数据</el-radio>
                        <el-radio :label="3">指定客户</el-radio>
                    </el-radio-group>
                </el-form-item>
                <el-form-item label="月份" prop="month">
                    <el-date-picker 
                        v-model="exportForm.month" 
                        type="month" 
                        placeholder="请选择月份" 
                        style="width: 100%;" 
                        value-format="YYYY-MM"
                        clearable
                    />
                </el-form-item>
                <el-form-item label="客户" prop="customerId" v-if="exportForm.mode === 3">
                    <el-select v-model="exportForm.customerId" placeholder="请选择客户" clearable style="width: 100%;">
                        <el-option
                            v-for="item in customerList"
                            :key="item.id"
                            :label="item.name"
                            :value="item.id"
                        />
                    </el-select>
                </el-form-item>   
            </el-form>
            <template #footer>
                <el-button @click="exportDialogVisible = false">取消</el-button>
                <el-button type="primary" :loading="exportLoading" @click="handleExportBtn(exportFormRef)" >确认</el-button>
            </template>
        </ZoomDialog>
        <ZoomDialog
            v-model:visible="trashDialogVisible"
            title="回收站：近三十天被删除订单"
            width="600px"
            :source-rect="trashSourceRect"
            :close-on-mask="false"
        >
          <div class="table-box">
              <el-table 
                  :data="deletedOrderList"
                  ref="trashTableRef"
                  stripe
              >
                  <el-table-column fixed type="selection" width="50" />
                  <el-table-column prop="id" label="ID" width="60" />
                  <el-table-column prop="customerName" label="客户名" width="100" />
                  <el-table-column prop="processName" label="工艺" width="100" />
                  <el-table-column prop="orderDate" label="日期" width="110"/>
                  <el-table-column prop="productName" label="产品名称" width="200" show-overflow-tooltip/>
                  <el-table-column prop="spec1" label="规格1" width="70"/>
                  <el-table-column prop="spec2" label="规格2" width="70"/>
                  <el-table-column label="单价" width="100">
                      <template #default="{row}"> 
                          <span :style="{color: row.specialUnitPrice ? '#f56c6c' : '#67c23a'}">
                              {{ row.specialUnitPrice ? row.specialUnitPrice : row.unitPrice }}
                              <span v-if="row.specialUnitPrice" style="font-size: 12px;">(特殊)</span>
                          </span>
                      </template>
                  </el-table-column>
                  <el-table-column prop="quantity" label="数量" width="70"/>
                  <el-table-column prop="amount" label="总价" width="100"/>
                  <el-table-column prop="remark" label="备注" show-overflow-tooltip/>
                  <el-table-column prop="createTime" label="创建时间" width="170"/>
                  <el-table-column prop="updateTime" label="更新时间" width="170"/>
              </el-table>
          </div>
          <template #footer>
                <el-button @click="trashDialogVisible = false">取消</el-button>
                <el-button type="success" @click="handleRestoreBtn" >恢复</el-button>
            </template>
        </ZoomDialog>
        <ConfirmDialog ref="confirmDialogRef" />
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
.autocomplete-item {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
}
</style>