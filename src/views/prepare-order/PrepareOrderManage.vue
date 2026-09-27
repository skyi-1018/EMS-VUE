<script setup>
import { ref, reactive, onMounted } from 'vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import CommonCard from '@/components/CommonCard.vue'
import ZoomDialog from '@/components/ZoomDialog.vue'
import { getElementRect, defaultRect, rectFromEvent } from '@/utils/zoom'
import { getCustomerSimpleList, getCustomerFakeUnitPriceMap } from '@/api/customers.js'
import { getProcessList } from '@/api/processes.js'
import { ElMessage } from 'element-plus'
import { getPrepareOrderList, batchDeletePrepareOrder, addPrepareOrder, updatePrepareOrder, submitPrepareOrder, submitAndPrintPrepareOrder } from '@/api/prepare-orders.js'
import { orderSuggest } from '@/api/orders.js'
import PrintDialog from '@/components/PrintDialog.vue'
import dayjs from 'dayjs'


const prepareOrderForm = ref({
    id: null,
    customerId: null,
    processId: null,
    orderDate: '',
    productName: '',
    spec1: null,
    spec2: null,
    unitPrice: null,
    specialUnitPrice: null,
    isSpecialUnitPrice: false,
    remark: '',

    mode: 1,
})

// 订单对话框校验规则
const rules = reactive({
  customerId: [
    { required: true, message: '请选择客户', trigger: 'change' }
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
  unitPrice: [
    {required: true, message: '请输入单价', trigger: 'change'}
  ],
})

const printDialogVisible = ref(false)
const printLoading = ref(false)
const printSourceRect = reactive({ x: 0, y: 0, width: 200, height: 100 })

const customerList = ref([])
const processList = ref([])
const prepareOrderList = ref([])
const customerUnitPriceMap = ref({})
const timer = ref(null)

const loading = ref(false)

const addBtnRef = ref(null)
const batchDeleteBtnRef = ref(null)
const deleteBtnRef = ref(null)
const prepareOrderFormRef = ref(null)
const confirmDialogRef = ref(null)
const submitBtnRef = ref(null)
const submitAndPrintBtnRef = ref(null)
const cardRefs = {}

const prepareOrderDialogType = ref('add')
const prepareOrderDialogTitle = ref('添加预备订单')

const prepareOrderDialogVisible = ref(false)

const prepareOrderSourceRect = reactive({ x: 0, y: 0, width: 240, height: 120 })

// 设置卡片引用
const setCardRef = (id, el) => {
    if (el) cardRefs[id] = el
}

// 打开预备订单对话框
const openPrepareOrderDialog = () => { 
    prepareOrderDialogType.value = 'add'
    prepareOrderDialogTitle.value = '添加预备订单'
    clearPrepareOrderDialog()
    const rect = getElementRect(addBtnRef.value)
    Object.assign(prepareOrderSourceRect, rect || defaultRect(240, 120))
    prepareOrderDialogVisible.value = true
}

// 清空预备订单对话框
const clearPrepareOrderDialog = () => {
    prepareOrderForm.value = {
        id: null,
        customerId: null,
        processId: null,
        productName: '',
        spec1: null,
        spec2: null,
        unitPrice: null,
        specialUnitPrice: null,
        isSpecialUnitPrice: false,
        quantity: null,
        amount: null,
        remark: '',
        orderDate: dayjs().format('YYYY-MM-DD'),

        mode: 1
    }
    if(prepareOrderFormRef.value){
        prepareOrderFormRef.value.clearValidate()
    }
}

// 订单对话框更新单价
const updateUnitPrice = () => {
    try {
        if (prepareOrderForm.value.isSpecialUnitPrice) return
        if (prepareOrderForm.value.customerId && prepareOrderForm.value.processId){
            prepareOrderForm.value.unitPrice = customerUnitPriceMap.value[prepareOrderForm.value.customerId][prepareOrderForm.value.processId].fakeUnitPrice
        } else {
            prepareOrderForm.value.unitPrice = null
        }
    } catch (err) {
        prepareOrderForm.value.unitPrice = null
    } finally {
        calcAmount()
    }
}

// 卡片点击
const handleRowClick = (item, event) => {
    clearPrepareOrderDialog()
    prepareOrderDialogType.value = 'edit'
    prepareOrderDialogTitle.value = '编辑预备订单'
    prepareOrderForm.value = {
        ...item
    }
    if(item.specialUnitPrice) {
        prepareOrderForm.value.unitPrice = item.specialUnitPrice
        prepareOrderForm.value.isSpecialUnitPrice = true
    }

    const cardEl = cardRefs[item.id]
    const rect = cardEl && cardEl.getBoundingClientRect()
        ? cardEl.getBoundingClientRect()
        : event.currentTarget.getBoundingClientRect()

    prepareOrderSourceRect.x = rect.left
    prepareOrderSourceRect.y = rect.top
    prepareOrderSourceRect.width = rect.width
    prepareOrderSourceRect.height = rect.height

    prepareOrderDialogVisible.value = true
}

const handleSaveBtn = async (formEl) => {
    if(!formEl) return
    try {
        await formEl.validate()
        if (prepareOrderForm.value.isSpecialUnitPrice) {
        prepareOrderForm.value.specialUnitPrice = prepareOrderForm.value.unitPrice
        } else {
        prepareOrderForm.value.specialUnitPrice = null
        }
        if (prepareOrderDialogType.value === 'add') {
        doAddPrepareOrder()
        } else {
        doUpdatePrepareOrder()
        }
    } catch (err) {
        return
    }
}

// 订单对话框删除按钮点击
const handleDeletePrepareOrderBtn = () => {
    const rect = getElementRect(deleteBtnRef.value)
    confirmDialogRef.value.open({
        message: '确定删除该订单吗？',
        sourceRect: rect || defaultRect(200, 100),
        onConfirm: () => doBatchDeletePrepareOrder(prepareOrderForm.value.id)
    })
}

// 订单对话框提交至正式订单按钮点击
const handleSubmitBtn = () => {
    const rect = getElementRect(submitBtnRef.value)
    confirmDialogRef.value.open({
        message: '确定提交该订单吗？',
        sourceRect: rect || defaultRect(200, 100),
        onConfirm: () => doSubmitPrepareOrder(),
        confirmText: '确定提交',
        buttonType: 'success'
    })
}

const calcAmount = () => {
  const { spec1, spec2, quantity, unitPrice } = prepareOrderForm.value
  // 任意一个为空，amount置null
  if(spec1 == null || spec2 == null || quantity == null || unitPrice == null){
    prepareOrderForm.value.amount = null
    return
  }
  const num = spec1 * spec2 * quantity * unitPrice * 0.0001
  if(isNaN(num)){
    prepareOrderForm.value.amount = null
  }else{
    prepareOrderForm.value.amount = Number(num.toFixed(2))
  }
}

// 联想后规格填充
const handleSuggestSelect = (item) => {
    prepareOrderForm.value.productName = item.productName
    prepareOrderForm.value.spec1 = item.spec1
    prepareOrderForm.value.spec2 = item.spec2
    calcAmount()
}

// 品名联想触发
const productNameSuggestSearch = (queryString, cb) => {
  clearTimeout(timer.value)
  // 使用组件传进来的 queryString，不要读prepareOrderForm.productName
  if (!queryString) {
    return cb([])
  }
  timer.value = window.setTimeout(async () => {
    try {
      // 把用户输入的关键词传给后端，而不是prepareOrderForm.productName
      const params = { ...prepareOrderForm.value, productName: queryString }
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

// 打印弹窗回调函数
const handlePrintConfirm = async ({ mode}) => {
    printLoading.value = true
    prepareOrderForm.value.mode = mode
    doSubmitAndPrintPrepareOrder()
}

const handleSubmitAndPrintBtn = async (formEl) => {
    if (!formEl) return
    try {
        await formEl.validate()
        const rect = getElementRect(submitAndPrintBtnRef.value)
        Object.assign(printSourceRect, rect || defaultRect(200, 100))
        printDialogVisible.value = true
    } catch (err) {
    }
}

// 提交前处理特殊单价通用函数
const completeSpecialUnitPrice = () => {
    if (prepareOrderForm.value.isSpecialUnitPrice) {
        prepareOrderForm.value.specialUnitPrice = prepareOrderForm.value.unitPrice
    } else {
        prepareOrderForm.value.specialUnitPrice = null
    }
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

// 网络请求：加载客户单价数据
const loadCustomerUnitPriceMap = async () => { 
    try {
        const res = await getCustomerFakeUnitPriceMap()
        if(res.code === 1) {
            customerUnitPriceMap.value = res.data
        } else {
            ElMessage.error('加载客户单价Map失败：' + res.msg)
        }
    } catch (err) {
        ElMessage.error('加载客户单价Map失败')
    }
}

// 网络请求：加载预备订单数据
const loadPrepareOrderList = async () => { 
    try {
        loading.value = true
        const res = await getPrepareOrderList()
        if(res.code === 1) {
            prepareOrderList.value = res.data
        } else {
            ElMessage.error('加载预备订单列表失败：' + res.msg)
        }
    } catch (err) {
        ElMessage.error('加载预备订单列表失败')
    } finally {
        loading.value = false
    }
}

// 网络请求：添加预备订单
const doAddPrepareOrder = async () => { 
    try {
        const res = await addPrepareOrder(prepareOrderForm.value)
        if(res.code === 1) {
            prepareOrderDialogVisible.value = false
            loadPrepareOrderList()
            ElMessage.success('添加成功')
        } else {
            ElMessage.error('添加失败：' + res.msg)
        }
    } catch (err) {
        ElMessage.error('添加失败')
    }
}

// 网络请求：更新预备订单
const doUpdatePrepareOrder = async () => { 
    await updatePrepareOrder(prepareOrderForm.value)
    loadPrepareOrderList()
    prepareOrderDialogVisible.value = false
    ElMessage.success('更新成功')
}

// 网络请求：批量删除
const doBatchDeletePrepareOrder = async (ids) => { 
    try {
        const res = await batchDeletePrepareOrder(ids)
        if(res.code === 1) {
            loadPrepareOrderList()
            prepareOrderDialogVisible.value = false
            ElMessage.success('删除成功')
        } else {
            ElMessage.error('删除失败：' + res.msg)
        }
    } catch (err) {
        ElMessage.error('删除失败')
    }
}

// 网络请求：提交预备订单至正式订单
const doSubmitPrepareOrder = async () => { 
    completeSpecialUnitPrice()
    await submitPrepareOrder(prepareOrderForm.value)
    ElMessage.success('提交成功')
    prepareOrderDialogVisible.value = false
    loadPrepareOrderList()      
}

// 网络请求：提交并打印预备订单
const doSubmitAndPrintPrepareOrder = async () => { 
    try {
        completeSpecialUnitPrice()
        await submitAndPrintPrepareOrder(prepareOrderForm.value)
        prepareOrderDialogVisible.value = false
        printDialogVisible.value = false
        ElMessage.success('提交并打印成功')
        loadPrepareOrderList()
    } finally {
        printLoading.value = false
    }
    
    
}

onMounted(() => { 
    loadCustomerList()
    loadProcessList()
    loadCustomerUnitPriceMap()
    loadPrepareOrderList()
    prepareOrderForm.value.orderDate = dayjs().format('YYYY-MM-DD')
})



</script>

<template>
    <div class="main-page">
        <div class="page-header">
            <h1>预备订单管理</h1>
            <div>
                <el-button ref="addBtnRef" type="primary" @click="openPrepareOrderDialog">添加预备订单</el-button>
            </div>
        </div>
        <div class="search-bar">
            <el-checkbox v-model="checked1" label="全选"/>
            <el-button ref="batchDeleteBtnRef" type="danger" size="small">批量删除</el-button>
        </div>
        <div class="card-list">
            <CommonCard
                v-for="item in prepareOrderList"
                :key="item.id"
                :title="item.productName"
                :status-text="item.id"
                status-bg-color=#ffffff
                status-text-color=#1890FF
                :sub-title="item.customerName"
                :info-list="[
                    { label: '工艺', value: item.processName },
                    { label: '日期', value: item.orderDate },
                    { label: '尺寸', value: (item.spec1 != null && item.spec2 != null) ? `${item.spec1}x${item.spec2}` : '-'},
                    { label: '单价', value: item.specialUnitPrice ? item.specialUnitPrice + '(特殊)' : item.unitPrice },
                    { label: '创建时间', value: item.createTime },
                    { label: '更新时间', value: item.updateTime },
                    { label: '备注', value: (item.remark != null && item.remark.trim().length > 0) ? item.remark : '-' }
                ]"
                :card-ref="el => setCardRef(item.id, el)"
                @click="handleRowClick(item, $event)"
            >
                <div class="checkbox-section">
                    <el-checkbox v-model="item.checked"/>
                </div>
            </CommonCard>
        </div>
        <ZoomDialog
            v-model:visible="prepareOrderDialogVisible"
            :title="prepareOrderDialogTitle"
            width="600px"
            :source-rect="prepareOrderSourceRect"
            :close-on-mask="false"
        >
            <el-form label-width="110px" :rules="rules" :model="prepareOrderForm" ref="prepareOrderFormRef"> 
                <el-form-item label="客户名" prop="customerId">
                    <el-select v-model="prepareOrderForm.customerId" placeholder="请选择客户" @change="updateUnitPrice" clearable style="width: 100%;">
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
                    <el-select v-model="prepareOrderForm.processId" placeholder="请选择工艺" @change="updateUnitPrice" clearable style="width: 100%;">
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
                        v-model="prepareOrderForm.orderDate" 
                        type="date" 
                        placeholder="请选择日期" 
                        value-format="YYYY-MM-DD"
                        clearable
                        style="width: 100%;"
                    />
                </el-form-item>
                <el-form-item label="产品名称" prop="productName">
                    <el-autocomplete 
                        v-model="prepareOrderForm.productName" 
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
                    <el-input v-model="prepareOrderForm.spec1" type="number" step="0.1" placeholder="请输入规格1" clearable @input="calcAmount"/>
                </el-form-item>
                <el-form-item label="规格2" prop="spec2">
                    <el-input v-model="prepareOrderForm.spec2" type="number" step="0.1" placeholder="请输入规格2" clearable @input="calcAmount"/>
                </el-form-item>
                <el-form-item label="数量" prop="quantity" v-if="prepareOrderDialogType==='edit'">
                    <el-input v-model="prepareOrderForm.quantity" placeholder="请输入数量" type="number" step="1" clearable @input="calcAmount"/>
                </el-form-item>
                <el-form-item label="单价" prop="unitPrice" >
                    <el-input 
                        v-model="prepareOrderForm.unitPrice" 
                        placeholder="请输入单价" 
                        type="number" 
                        step="0.001" 
                        :disabled="!prepareOrderForm.isSpecialUnitPrice"
                        clearable
                        @input="calcAmount"
                    />
                    <el-checkbox v-model="prepareOrderForm.isSpecialUnitPrice" label="特殊单价" @change="updateUnitPrice"/>
                </el-form-item>
                <el-form-item label="总价" prop="amount" v-if="prepareOrderDialogType==='edit'">
                    <el-input 
                        v-model="prepareOrderForm.amount" 
                        placeholder="请输入总价" 
                        type="number" 
                        step="0.01" 
                        disabled
                    />
                </el-form-item>
                <el-form-item label="备注" prop="remark">
                    <el-input v-model="prepareOrderForm.remark" placeholder="请输入备注" clearable/>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="prepareOrderDialogVisible = false">取消</el-button>
                <el-button ref="deleteBtnRef" v-if="prepareOrderDialogType === 'edit'" type="danger" @click="handleDeletePrepareOrderBtn">删除</el-button>
                <el-button ref="submitAndPrintBtnRef" type="warning" v-if="prepareOrderDialogType === 'edit'" @click="handleSubmitAndPrintBtn(prepareOrderFormRef)">提交并打印订单</el-button>
                <el-button ref="submitBtnRef" type="success" v-if="prepareOrderDialogType === 'edit'" @click="handleSubmitBtn">提交至正式订单</el-button>
                <el-button type="primary" @click="handleSaveBtn(prepareOrderFormRef)">保存</el-button>
            </template>
        </ZoomDialog>
        <ConfirmDialog ref="confirmDialogRef" />
        <PrintDialog
            v-model:visible="printDialogVisible"
            :z-index="2100"
            :source-rect="printSourceRect"
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
.card-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 18px;
  margin-top:16px;
}
.checkbox-section {
    display: flex;
    justify-content: flex-end;
}
.autocomplete-item {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
}
</style>