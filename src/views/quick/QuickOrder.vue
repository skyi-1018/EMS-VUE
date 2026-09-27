<script setup>
import { ElFormItem } from 'element-plus';
import { ref, reactive, watch, onMounted, nextTick } from 'vue'
import { getCustomerSimpleList, getCustomerFakeUnitPriceMap } from '@/api/customers.js'
import { getProcessList } from '@/api/processes.js'
import { addPrepareOrder, addABModePrepareOrder } from '@/api/prepare-orders.js'
import { addOrder, orderSuggest, addABModeOrder, submitAndPrintABModeOrder, submitAndPrintOrder } from '@/api/orders.js'
import { ElMessage } from 'element-plus';
import PrintDialog from '@/components/PrintDialog.vue'
import { useUserStore } from '@/store/user'
import { getElementRect, defaultRect, rectFromEvent } from '@/utils/zoom'
import dayjs from 'dayjs'

const saveBtnLoading = ref(false)
const submitBtnLoading = ref(false)
const submitAndPrintBtnLoading = ref(false)
const customerList = ref([])
const processList = ref([])
const customerUnitPriceMap = ref({})
const formCardRef = ref(null)
const timer = ref(null)
const userStore = useUserStore();
const printBtnRef = ref(null)

const printDialogVisible = ref(false)
const printLoading = ref(false)
const printSourceRect = reactive({ x: 0, y: 0, width: 200, height: 100 })

const orderForm = ref({
    customerId: null,
    processId: null,
    orderDate: '',
    productName: '',
    spec1: null,
    spec2: null,
    quantity: null,
    unitPrice: null,
    isSpecialUnitPrice: false,
    amount: null,
    remark: '',
    ABMode: false,

    spec1A: null,
    spec2A: null,
    quantityA: null,
    amountA: null,
    spec1B: null,
    spec2B: null,
    quantityB: null,
    amountB: null,

    mode: null
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
        if (orderForm.value.ABMode) {
            calcAmountA()
            calcAmountB()
        } else {
            calcAmount()
        }
    }
}

// 计算金额
const unitPriceChange = () => {
    if (orderForm.value.ABMode) {
        calcAmountA()
        calcAmountB()
    } else {
        calcAmount()
    }
}

const calcAmount = () => {
    orderForm.value.amount = (orderForm.value.spec1 * orderForm.value.spec2 * orderForm.value.quantity * orderForm.value.unitPrice * 0.0001).toFixed(2)
}

const calcAmountA = () => {
    orderForm.value.amountA = (orderForm.value.spec1A * orderForm.value.spec2A * orderForm.value.quantityA * orderForm.value.unitPrice * 0.0001).toFixed(2)
}

const calcAmountB = () => {
    orderForm.value.amountB = (orderForm.value.spec1B * orderForm.value.spec2B * orderForm.value.quantityB * orderForm.value.unitPrice * 0.0001).toFixed(2)
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
    ABMode: false,
    orderDate: dayjs().format('YYYY-MM-DD'),

    spec1A: null,
    spec2A: null,
    quantityA: null,
    amountA: null,
    spec1B: null,
    spec2B: null,
    quantityB: null,
    amountB: null,

    mode: null
  }
  nextTick(() => {
    nextTick(() => {
      if(formCardRef.value){
        formCardRef.value.clearValidate()
      }
    })
  })
}

// 保存至预备订单按钮点击
const handleSaveBtn = async (formEl) => {
    if(!formEl) return
    try {
        await formEl.validate()
        if (orderForm.value.isSpecialUnitPrice) {
            orderForm.value.specialUnitPrice = orderForm.value.unitPrice
        } else {
            orderForm.value.specialUnitPrice = null
        }
        if (orderForm.value.ABMode) {
            doAddABModePrepareOrder()
        } else {
            doAddPrepareOrder()
        }
        
    } catch (err) {
        return
    }
}

// 打印弹窗回调函数
const handlePrintConfirm = async ({ mode}) => {
    printLoading.value = true
    orderForm.value.mode = mode
    if (orderForm.value.ABMode) {
        doSubmitAndPrintABModeOrder()
    } else {
        doSubmitAndPrintOrder()
    }
}

// 提交正式订单按钮点击
const handleSubmitBtn = async (formEl) => {
    if(!formEl) return
    try {
        await formEl.validate()
        if (orderForm.value.isSpecialUnitPrice) {
            orderForm.value.specialUnitPrice = orderForm.value.unitPrice
        } else {
            orderForm.value.specialUnitPrice = null
        }
        if (orderForm.value.ABMode) {
            if (!orderForm.value.spec1A || !orderForm.value.spec2A || !orderForm.value.quantityA || !orderForm.value.amountA
            || !orderForm.value.spec1B || !orderForm.value.spec2B || !orderForm.value.quantityB || !orderForm.value.amountB) {
                ElMessage.error('请填写所有A、B项数据')
                return
            }
        } else {
            if (!orderForm.value.spec1 || !orderForm.value.spec2 || !orderForm.value.quantity || !orderForm.value.amount) {
                ElMessage.error('请填写所有数据')
                return
            }
        }
        if (orderForm.value.ABMode) {
            doAddABModeOrder()
        } else {
            doAddOrder()
        }
    } catch (err) {
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

const handleSubmitAndPrintBtn = async(formEl) => {
    if(!formEl) return
    try {
        await formEl.validate()
        if (orderForm.value.isSpecialUnitPrice) {
            orderForm.value.specialUnitPrice = orderForm.value.unitPrice
        } else {
            orderForm.value.specialUnitPrice = null
        }
        if (orderForm.value.ABMode) {
            if (!orderForm.value.spec1A || !orderForm.value.spec2A || !orderForm.value.quantityA || !orderForm.value.amountA
            || !orderForm.value.spec1B || !orderForm.value.spec2B || !orderForm.value.quantityB || !orderForm.value.amountB) {
                ElMessage.error('请填写所有A、B项数据')
                return
            }
        } else {
            if (!orderForm.value.spec1 || !orderForm.value.spec2 || !orderForm.value.quantity || !orderForm.value.amount) {
                ElMessage.error('请填写所有数据')
                return
            }
        }
        const rect = getElementRect(printBtnRef.value)
        Object.assign(printSourceRect, rect || defaultRect(200, 100))
        printDialogVisible.value = true
    } catch (err) {
    }
}

//监听A面尺寸，赋值B面尺寸
watch(
    () => [orderForm.value.spec1A, orderForm.value.spec2A],
    ([s1, s2]) => {
        if (!orderForm.value.ABMode) return;
        if (s1) orderForm.value.spec1B = s1;
        if (s2) orderForm.value.spec2B = s2;
        calcAmountB()
    }
)



// 网络请求：获取客户列表
const loadCustomerList = async() => {
    try {
        const res = await getCustomerSimpleList()
        if(res.code === 1) {
            customerList.value = res.data
        } else {
            ElMessage.error('加载客户列表失败：' + res.msg)
        }
    } catch (err) {
        ElMessage.error('加载客户列表失败')
    } 
}

// 网络请求：加载工艺列表数据
const loadProcessList = async() => {
    try {
        const res = await getProcessList()
        if(res.code === 1) {
            processList.value = res.data
        } else {
            ElMessage.error('加载工艺列表失败：' + res.msg)
        }
    } catch (err) {
        ElMessage.error('加载工艺列表失败')
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

// 网络请求：添加预备订单
const doAddPrepareOrder = async () => { 
    try {
        saveBtnLoading.value = true
        const res = await addPrepareOrder(orderForm.value)
        if(res.code === 1) {
            clearOrderDialog()
            ElMessage.success('添加成功')
        } else {
            ElMessage.error('添加失败：' + res.msg)
        }
    } catch (err) {
        ElMessage.error('添加失败')
    } finally {
        saveBtnLoading.value = false
    }
}

// 网络请求：提交订单
const doAddOrder = async () => {
    try {
        submitBtnLoading.value = true
        const res = await addOrder(orderForm.value)
        clearOrderDialog()
        ElMessage.success('提交成功')
    } finally {
        submitBtnLoading.value = false
    }
}

// 网络请求：提交AB面订单
const doAddABModeOrder = async () => { 
    try {
        submitBtnLoading.value = true
        await addABModeOrder(orderForm.value)
        clearOrderDialog()
        ElMessage.success('提交成功')
    } finally {
        submitBtnLoading.value = false
    }
}

// 网络请求：保存AB面订单至预备订单
const doAddABModePrepareOrder = async () => { 
    try {
        saveBtnLoading.value = true
        await addABModePrepareOrder(orderForm.value)
        clearOrderDialog()
        ElMessage.success('保存成功')
    } finally {
        saveBtnLoading.value = false
    }
}

// 网络请求：提交并打印订单
const doSubmitAndPrintOrder = async () => { 
    try {
        await submitAndPrintOrder(orderForm.value)
        clearOrderDialog()
        printDialogVisible.value = false
        ElMessage.success('提交并打印成功')
    } finally {
        printLoading.value = false
    }
    
}

// 网络请求：提交并打印AB面订单
const doSubmitAndPrintABModeOrder = async () => { 
    try {
        await submitAndPrintABModeOrder(orderForm.value)
        clearOrderDialog()
        printDialogVisible.value = false
        ElMessage.success('提交并打印成功')
    } finally {
        printLoading.value = false
    }
    
}


onMounted(() => { 
    loadCustomerList()
    loadProcessList()
    loadCustomerUnitPriceMap()
    orderForm.value.orderDate = dayjs().format('YYYY-MM-DD')
})
</script>

<template>
    <div class="main-page">
        <div class="page-header">
            <h1>快速开单</h1>
        </div>
        <div class="form-card">
            <el-form 
                ref="formCardRef" 
                :model="orderForm" 
                label-width="120px" 
                :rules="rules"
            > 
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
                    <el-select v-model="orderForm.processId" placeholder="请选择工艺" @change="updateUnitPrice" clearable  style="width: 100%;">
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
                <el-form-item label="AB面模式" prop="ABMode">
                    <el-switch 
                        v-model="orderForm.ABMode" 
                        
                        active-text="AB面" 
                        inactive-text="单面"
                    />
                </el-form-item>
                <el-form-item label="规格1" prop="spec1" v-if="orderForm.ABMode === false">
                    <el-input v-model="orderForm.spec1" type="number" step="0.1" placeholder="请输入规格1" clearable @input="calcAmount"/>
                </el-form-item>
                <el-form-item label="规格2" prop="spec2"  v-if="orderForm.ABMode === false">
                    <el-input v-model="orderForm.spec2" type="number" step="0.1" placeholder="请输入规格2" clearable @input="calcAmount"/>
                </el-form-item>
                <el-form-item label="数量" prop="quantity"  v-if="orderForm.ABMode === false">
                    <el-input v-model="orderForm.quantity" placeholder="请输入数量" type="number" step="1" clearable @input="calcAmount"/>
                </el-form-item>
                <el-form-item label="单价" prop="unitPrice" >
                    <el-input 
                        v-model="orderForm.unitPrice" 
                        placeholder="请输入单价" 
                        type="number" 
                        step="0.001" 
                        :disabled="!orderForm.isSpecialUnitPrice"
                        clearable
                        @input="unitPriceChange"
                    />
                    <el-checkbox v-model="orderForm.isSpecialUnitPrice" label="特殊单价" @change="updateUnitPrice"/>
                </el-form-item>
                <div class="ABCard" v-if="orderForm.ABMode === true">
                    <div class="ACard">
                        <el-form :model="orderForm" label-width="80px">
                            <h3 class="card-title">A面</h3>
                            <el-form-item label="规格1" prop="spec1A">
                                <el-input v-model="orderForm.spec1A" type="number" step="0.1" placeholder="请输入规格1" clearable @input="calcAmountA"/>
                            </el-form-item>
                            <el-form-item label="规格2" prop="spec2A">
                                <el-input v-model="orderForm.spec2A" type="number" step="0.1" placeholder="请输入规格2" clearable @input="calcAmountA"/>
                            </el-form-item>
                            <el-form-item label="数量" prop="quantityA">
                                <el-input v-model="orderForm.quantityA" placeholder="请输入数量" type="number" step="1" clearable @input="calcAmountA"/>
                            </el-form-item>
                            <el-form-item label="总价" prop="amountA">
                                <el-input v-model="orderForm.amountA" placeholder="请输入总价" type="number" step="0.01" disabled/>
                            </el-form-item>
                        </el-form>
                    </div>
                    <div class="BCard">
                        <el-form :model="orderForm" label-width="80px">
                            <h3 class="card-title">B面</h3>
                            <el-form-item label="规格1" prop="spec1B">
                                <el-input v-model="orderForm.spec1B" type="number" step="0.1" placeholder="请输入规格1" clearable @input="calcAmountB"/>
                            </el-form-item>
                            <el-form-item label="规格2" prop="spec2B">
                                <el-input v-model="orderForm.spec2B" type="number" step="0.1" placeholder="请输入规格2" clearable @input="calcAmountB"/>
                            </el-form-item>
                            <el-form-item label="数量" prop="quantityB">
                                <el-input v-model="orderForm.quantityB" placeholder="请输入数量" type="number" step="1" clearable @input="calcAmountB"/>
                            </el-form-item>
                            <el-form-item label="总价" prop="amountB">
                                <el-input v-model="orderForm.amountB" placeholder="请输入总价" type="number" step="0.01" disabled/>
                            </el-form-item>
                        </el-form>
                    </div>
                </div>


                <el-form-item label="总价" prop="amount" v-if="orderForm.ABMode === false">
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
                <div class="button-group">
                    
                    <el-button @click="clearOrderDialog">清空</el-button>
                    <el-button type="primary" @click="handleSaveBtn(formCardRef)" :loading="saveBtnLoading">保存至预备订单</el-button>
                    <el-button ref="printBtnRef" type="warning" @click="handleSubmitAndPrintBtn(formCardRef)" :loading="submitAndPrintBtnLoading">提交并打印订单</el-button>
                    <el-button ref="submitBtnRef" type="success" @click="handleSubmitBtn(formCardRef)" :loading="submitBtnLoading">提交至正式订单</el-button>
                </div>
            </el-form>
        </div>
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
    align-items: center;
    justify-content: space-between;
}
.form-card {
    background: #fff;
    border-radius: 12px;
    padding: 28px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    max-width: 880px;
    width: 100%;
    margin: 0 auto;
    max-width: 600px;
}
.button-group {
    display: flex;
    justify-content: flex-end; /* 全部靠右 */
    margin-top: 20px;
    flex-wrap: wrap;
}
.autocomplete-item {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
}
.ABCard {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 20px;
    flex-wrap: wrap;
}
.ACard {
    background: #f0f6fd;
    border-radius: 12px;
    padding: 0 20px;
    border: 1px solid #a8c8f0;
    flex: 1 1 240px;
}
.BCard {
    background: #fdf2f2;
    border-radius: 12px;
    padding: 0 20px;
    border: 1px solid #f0a8a8;
    flex: 1 1 240px;
}
.card-title {
    font-size: 17px;        /* 按需调大 */
    font-weight: 600;
    color: #333;
    margin: 12px 0 8px;
    padding-bottom: 6px;
    border-bottom: 1px solid #e8e8e8;  /* 可选，分隔感更强 */
}
</style>