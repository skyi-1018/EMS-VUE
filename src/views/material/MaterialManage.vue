<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import ZoomDialog from '@/components/ZoomDialog.vue'
import CommonCard from '@/components/CommonCard.vue'
import { getElementRect, defaultRect, rectFromEvent } from '@/utils/zoom'
import { getMaterialList, addMaterial, updateMaterial, deleteMaterialById } from '@/api/materials.js'
import { getMaterialInList, batchAddMaterialIn, updateMaterialIn, deleteMaterialInById } from '@/api/material-ins.js'
import { getMaterialStockList, batchAddMaterialStock, updateMaterialStock, deleteMaterialStockById } from '@/api/material-stocks.js'
import { getMaterialUseList, addMaterialUse, updateMaterialUse, deleteMaterialUseById, calcMaterialUseByMonth } from '@/api/material-uses.js'
import { dayjs, ElMessage } from 'element-plus'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const cardRefs = {}
const addMaterialBtnRef = ref(null)
const tabPage = ref('first')
const materialName = ref('')
const materialList = ref([])
const materialForm = ref({
    id: null,
    name: '',
    unitPrice: null,
    unit: '',
    remark: ''
})
const materialIsAdd = ref(false)
const materialFormRef = ref(null)
const materialFormRules = reactive({
    name: [
        { required: true, message: '请输入材料名', trigger: 'blur' }
    ],
    unitPrice: [
        { required: true, message: '请输入单价', trigger: 'change'}
    ],
    unit: [
        { required: true, message: '请输入单位', trigger: 'change'}
    ],
})

const materialDialogVisible = ref(false)
const materialDialogTitle = ref('新增材料')
const materialDialogSourceRect = reactive({ x: 0, y: 0, width: 240, height: 120 })


const materialInParam = ref({
    materialId: null,
    startDate: '',
    endDate: '',
    pageNum: 1,
    pageSize: 10,
    dateRange: ''
})

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

const materialInList = ref([])
const materialInTableLoading = ref(false)
const materialInTotal = ref(null)
const materialInFormRef = ref(null)
const materialInForm = ref({
    id: null,
    materialId: null,
    quantity: null,
    remark: ''
})

const materialInDialogVisible = ref(false)
const materialInDialogSourceRect = reactive({ x: 0, y: 0, width: 240, height: 120 })
const materialInFormRules = reactive({
    materialId: [
        { required: true, message: '请选择材料', trigger: 'change' }
    ],
    quantity: [
        { required: true, message: '请输入数量', trigger: 'change'}
    ]
})

const materialStockFormRules = reactive({
    month: [
        { required: true, message: '请选择月份', trigger: 'change' }
    ],
    materialId: [
        { required: true, message: '请选择材料', trigger: 'change' }
    ],
    quantity: [
        { required: true, message: '请输入数量', trigger: 'change'}
    ]
})

const materialInAddDialogVisible = ref(false)
const materialInAddDialogSourceRect = reactive({ x: 0, y: 0, width: 240, height: 120 })
const addMaterialInBtnRef = ref(null)
const materialInBatchAddForm = ref([
    {
        key: 1,
        materialId: null,
        quantity: null,
        remark: ''
    },
])
const materialInAddFormRules = reactive({
    materialId: [
        { required: true, message: '请选择材料', trigger: 'change' }
    ],
    quantity: [
        { required: true, message: '请输入数量', trigger: 'change'}
    ],
})

const materialUseDelBtnRef = ref(null)
const materialStockTableLoading = ref(false)
const materialStockTotal = ref(null)
const materialStockList = ref([])
const materialStockFormRef = ref(null)
const materialStockParam = ref({
    materialId: null,
    month: '',
    pageNum: 1,
    pageSize: 10
})

const materialStockDialogVisible = ref(false)
const materialStockDialogSourceRect = reactive({ x: 0, y: 0, width: 240, height: 120 })
const materialStockForm = ref({
    id: null,
    month: '',
    materialId: null,
    quantity: null,
    remark: ''
})
const materialStockBatchAddForm = ref([
    {
        month: dayjs().format('YYYY-MM-01'),
        materialId: null,
        quantity: null,
        remark: ''
    },
])
const materialStockAddDialogVisible = ref(false)
const materialStockAddDialogSourceRect = reactive({ x: 0, y: 0, width: 240, height: 120 })
const materialStockAddFormRules = reactive({
    month: [
        { required: true, message: '请选择月份', trigger: 'change' }
    ],
    materialId: [
        { required: true, message: '请选择材料', trigger: 'change' }
    ],
    quantity: [
        { required: true, message: '请输入数量', trigger: 'change'}
    ],
})
const addMaterialStockBtnRef = ref(null)
const materialDelBtnRef = ref(null)
const materialInDelBtnRef = ref(null)
const materialStockDelBtnRef = ref(null)
const confirmDialogRef = ref(null)

const materialUseParam = ref({
    materialId: null,
    month: '',
    pageNum: 1,
    pageSize: 10,
})
const materialUseList = ref([])
const materialUseTableLoading = ref(false)
const materialUseTotal = ref(null)

const calcMaterialUseBtnRef = ref(null)
const materialUseIsAdd = ref(true)
const addMaterialUseBtnRef = ref(null)
const materialUseFormRef = ref(null)
const materialUseDialogVisible = ref(false)
const materialUseDialogTitle = ref('新增用料')
const materialUseDialogSourceRect = reactive({ x: 0, y: 0, width: 240, height: 120 })
const materialUseFormRules = reactive({
    month: [
        { required: true, message: '请选择月份', trigger: 'change' }
    ],
    materialId: [
        { required: true, message: '请选择材料', trigger: 'change' }
    ],
    quantity: [
        { required: true, message: '请输入数量', trigger: 'change'}
    ],
    cost: [
        { required: true, message: '请输入成本', trigger: 'change'}
    ]
})
const materialUseForm = ref({
    id: null,
    month: '',
    materialId: null,
    quantity: null,
    cost: null,
    remark: ''
})

const materialUseCalcDialogVisible = ref(null)
const materialUseCalcDialogSourceRect = reactive({ x: 0, y: 0, width: 240, height: 120 })
const materialUseCalcForm = ref({
    month: '',
})
const calcBtnRef = ref(null)


// 设置卡片引用
const setCardRef = (id, el) => {
    if (el) cardRefs[id] = el
}

// 清空materialForm
const clearMaterialForm = () => {
    materialForm.value = {
        id: null,
        name: '',
        unitPrice: null,
        unit: '',
        remark: ''
    }
    if(materialFormRef.value){
        materialFormRef.value.clearValidate()
    }
}

// 点击新增材料按钮
const handleAddMaterial = () => {
    materialIsAdd.value = true
    clearMaterialForm()
    const rect = getElementRect(addMaterialBtnRef.value)
    Object.assign(materialDialogSourceRect, rect || defaultRect(240, 120))
    materialDialogVisible.value = true
}

// 点击确认保存材料按钮
const handleSubmitMaterial = async (formEl) => {
    if (!formEl) return
    try {
        await formEl.validate()
        if(materialIsAdd.value) {
            doAddMaterial()
        } else {
            doUpdateMaterial()
        }
    } catch (err) {
        return
    }
}


// 打开卡片
const handleRowClick = async (item, event) => {
    materialIsAdd.value = false
    materialForm.value = {
        id: item.id,
        name: item.name,
        unitPrice: item.unitPrice,
        unit: item.unit,
        remark: item.remark
    }

    const cardEl = cardRefs[item.id]
    const rect = cardEl && cardEl.getBoundingClientRect()
        ? cardEl.getBoundingClientRect()
        : event.currentTarget.getBoundingClientRect()

    materialDialogSourceRect.x = rect.left
    materialDialogSourceRect.y = rect.top
    materialDialogSourceRect.width = rect.width
    materialDialogSourceRect.height = rect.height
    materialDialogTitle.value = '材料信息'
    materialDialogVisible.value = true
}

// 进料表格行点击
const handleMaterialInRowClick = (row, column, event) => {
    let el = event && event.target
    while (el && el.tagName !== 'TR' && el.parentElement) {
        el = el.parentElement
    }
    if (el && el.getBoundingClientRect) {
        const rect = el.getBoundingClientRect()
        materialInDialogSourceRect.x = rect.left
        materialInDialogSourceRect.y = rect.top
        materialInDialogSourceRect.width = rect.width
        materialInDialogSourceRect.height = rect.height
    }
    clearMaterialInForm()
    materialInForm.value = { ...row }
    console.log(materialInForm.value)
    materialInDialogVisible.value = true
}

// 进料确认保存按钮点击
const handleSaveMaterialIn = async (formEl) => {
    if (!formEl) return
    try {
        await formEl.validate()
        doUpdateMaterialIn()
    } catch (err) {
        return
    }
}

// 库存确认保存按钮点击
const handleSaveMaterialStock = async (formEl) => {
    if (!formEl) return
    try {
        await formEl.validate()
        doUpdateMaterialStock()
    } catch (err) {
        return
    }
}

// 清空materialInForm
const clearMaterialInForm = () => {
    materialInForm.value = {
        id: null,
        materialId: null,
        quantity: null,
        remark: ''
    }
    if (materialInFormRef.value) {
        materialInFormRef.value.clearValidate()
    }
}

// 清空materialStockForm
const clearMaterialStockForm = () => {
    materialStockForm.value = {
        id: null,
        month: '',
        materialId: null,
        quantity: null,
        remark: ''
    }
    if (materialStockFormRef.value) {
        materialStockFormRef.value.clearValidate()
    }
}

// 清空materialUseForm
const clearMaterialUseForm = () => {
    materialUseForm.value = {
        id: null,
        month: '',
        materialId: null,
        quantity: null,
        remark: ''
    }
    if (materialUseFormRef.value) {
        materialUseFormRef.value.clearValidate()
    }
}

// 点击新增进料按钮
const handleAddMaterialIn = () => { 
    clearMaterialInBatchAddForm()
    const rect = getElementRect(addMaterialInBtnRef.value)
    Object.assign(materialInAddDialogSourceRect, rect || defaultRect(240, 120))
    materialInAddDialogVisible.value = true
}

// 点击新增月初库存按钮
const handleAddMaterialStock = () => { 
    clearMaterialStockBatchAddForm()
    const rect = getElementRect(addMaterialStockBtnRef.value)
    Object.assign(materialStockAddDialogSourceRect, rect || defaultRect(240, 120))
    materialStockAddDialogVisible.value = true
}

// 点击新增用料按钮
const handleAddMaterialUse = () => { 
    clearMaterialUseForm()
    materialUseDialogTitle.value = '新增用料'
    materialUseIsAdd.value = true
    const rect = getElementRect(addMaterialUseBtnRef.value)
    Object.assign(materialUseDialogSourceRect, rect || defaultRect(240, 120))
    materialUseDialogVisible.value = true
}


// 批量进料弹窗新增一行
const materialInAddDialogAddRow = () => {
    materialInBatchAddForm.value.push({
        key: Date.now(),
        materialId: null,
        quantity: null,
        remark: '',
    })
}

// 批量库存添加弹窗新增一行
const materialStockAddDialogAddRow = () => {
    materialStockBatchAddForm.value.push({
        month: dayjs().format('YYYY-MM-01'),
        materialId: null,
        quantity: null,
        remark: '',
    })
}

// 清空materialInBatchAddForm
const clearMaterialInBatchAddForm = () => {
    materialInBatchAddForm.value = [
        {
            key: 1,
            materialId: null,
            quantity: null,
            remark: ''
        },
    ]
}

// 清空materialStockBatchAddForm
const clearMaterialStockBatchAddForm = () => {
    materialStockBatchAddForm.value = [
        {
            month: dayjs().format('YYYY-MM-01'),
            materialId: null,
            quantity: null,
            remark: ''
        },
    ]
}

// 批量添加进料弹窗确认提交按钮点击
const handleSubmitMaterialIn = () => {
    doBatchAddMaterialIn()
}

// 根据材料ID，得到材料单位
const getMaterialUnit = (materialId) => {
    if(!materialId) return ''
    const item = materialList.value.find(m => m.id === materialId)
    return item ? item.unit : ''
}

// 根据材料ID，获取单价
const getMaterialUnitPrice = (materialId) => {
    if(!materialId) return ''
    const item = materialList.value.find(m => m.id === materialId)
    return item ? item.unitPrice : null
}

// 库存表格行点击
const handleMaterialStockRowClick = (row, column, event) => {
    let el = event && event.target
    while (el && el.tagName !== 'TR' && el.parentElement) {
        el = el.parentElement
    }
    if (el && el.getBoundingClientRect) {
        const rect = el.getBoundingClientRect()
        materialStockDialogSourceRect.x = rect.left
        materialStockDialogSourceRect.y = rect.top
        materialStockDialogSourceRect.width = rect.width
        materialStockDialogSourceRect.height = rect.height
    }
    clearMaterialStockForm()
    materialStockForm.value = { ...row }
    console.log(materialStockForm.value)
    materialStockDialogVisible.value = true
}

// 用料表格行点击
const handleMaterialUseRowClick = (row, column, event) => {
    let el = event && event.target
    while (el && el.tagName !== 'TR' && el.parentElement) {
        el = el.parentElement
    }
    if (el && el.getBoundingClientRect) {
        const rect = el.getBoundingClientRect()
        materialUseDialogSourceRect.x = rect.left
        materialUseDialogSourceRect.y = rect.top
        materialUseDialogSourceRect.width = rect.width
        materialUseDialogSourceRect.height = rect.height
    }
    clearMaterialUseForm()
    materialUseIsAdd.value = false
    materialUseDialogTitle.value = '用料信息'
    materialUseForm.value = { ...row }
    materialUseDialogVisible.value = true
}

//库存新增弹窗确认按钮点击
const handleSubmitMaterialStock = () => {
    doBatchAddMaterialStock()
}

// 用料弹窗确认按钮点击
const handleSubmitMaterialUse = () => {
    if (materialUseIsAdd.value) {
        doAddMaterialUse()
    } else {
        doUpdateMaterialUse()
    }
}

// 计算成本
const calcCost = () => {
    if(!materialUseForm.value.quantity || !materialUseForm.value.materialId) {
        materialUseForm.value.cost = null
        return
    }
    materialUseForm.value.cost = materialUseForm.value.quantity * getMaterialUnitPrice(materialUseForm.value.materialId)
}

// 用料计算按钮点击
const handleCalcMaterialUse = () => {
    materialUseCalcForm.value = { month: '' }
    const rect = getElementRect(calcMaterialUseBtnRef.value)
    Object.assign(materialUseCalcDialogSourceRect, rect || defaultRect(240, 120))
    materialUseCalcDialogVisible.value = true
}

// 材料弹窗删除按钮点击
const handleDeleteMaterial = (name) => {
    const rect = getElementRect(materialDelBtnRef.value)
    confirmDialogRef.value.open({
        message: `确定删除该材料"${name}"吗？`,
        sourceRect: rect || defaultRect(200, 100),
        onConfirm: doDeleteMaterial
    })
}

const handleDeleteMaterialIn = () => {
    const rect = getElementRect(materialInDelBtnRef.value)
    confirmDialogRef.value.open({
        message: `确定删除该进料吗？`,
        sourceRect: rect || defaultRect(200, 100),
        onConfirm: doDeleteMaterialIn
    })
}

const handleDeleteMaterialStock = () => {
    const rect = getElementRect(materialStockDelBtnRef.value)
    confirmDialogRef.value.open({
        message: `确定删除该库存吗？`,
        sourceRect: rect || defaultRect(200, 100),
        onConfirm: doDeleteMaterialStock
    })
}

const handleSubmitMaterialUseCalc = (month) => {
    if (!month) {
        ElMessage.warning('请选择月份')
        return
    }
    const rect = getElementRect(calcBtnRef.value)
    confirmDialogRef.value.open({
        message: `确定计算 ${month} 的用料吗？这将会删除该月的所有用料信息并重新计算`,
        sourceRect: rect || defaultRect(200, 100),
        onConfirm: doCalcMaterialUseByMonth,
        confirmText: '确认计算'
    })
}


// 用料删除按钮点击
const handleDeleteMaterialUse = () => {
    const rect = getElementRect(materialUseDelBtnRef.value)
    confirmDialogRef.value.open({
        message: `确定删除该用料吗？`,
        sourceRect: rect || defaultRect(200, 100),
        onConfirm: doDeleteMaterialUse
    })
}

// 动态加载页面
const loadPage = (name) => {
    if (name == 'first') loadMaterialList()
    else if (name == 'second') loadMaterialInList()
    else if (name == 'third') loadMaterialStockList()
    else if (name == 'fourth') loadMaterialUseList()
}


// 网络请求：获取材料列表
const loadMaterialList = async () => {
    const res = await getMaterialList(materialName.value)
    materialList.value = res.data
}

// 网络请求：新增材料
const doAddMaterial = async () => {
    await addMaterial(materialForm.value)
    ElMessage.success('添加成功')
    materialDialogVisible.value = false
    loadMaterialList()
}

// 网络请求：修改材料
const doUpdateMaterial = async () => {
    await updateMaterial(materialForm.value)
    ElMessage.success('修改成功')
    materialDialogVisible.value = false
    loadMaterialList()
}

// 网络请求：加载进料列表
const loadMaterialInList = async() => {
    try {
        materialInTableLoading.value = true
        if(!materialInParam.value.dateRange){
            materialInParam.value.startDate = null
            materialInParam.value.endDate = null
        } else{
            const [start, end] = materialInParam.value.dateRange
            materialInParam.value.startDate = start
            materialInParam.value.endDate = end
        }
        const res = await getMaterialInList(materialInParam.value)
        materialInTotal.value = res.data.total
        materialInList.value = res.data.rows
    } finally {
        materialInTableLoading.value = false
    }
}

// 网络请求：批量新增进料
const doBatchAddMaterialIn = async () => {
    await batchAddMaterialIn(materialInBatchAddForm.value)
    ElMessage.success('添加成功')
    materialInAddDialogVisible.value = false
    loadMaterialInList()
}

// 网络请求：修改进料
const doUpdateMaterialIn = async () => {
    await updateMaterialIn(materialInForm.value)
    ElMessage.success('修改成功')
    materialInDialogVisible.value = false
    loadMaterialInList()
}

// 网络请求：加载库存列表
const loadMaterialStockList = async () => {
    try {
        materialStockTableLoading.value = true
        const res = await getMaterialStockList(materialStockParam.value)
        materialStockTotal.value = res.data.total
        materialStockList.value = res.data.rows 
    } finally {
        materialStockTableLoading.value = false
    }
}

// 网络请求：修改库存
const doUpdateMaterialStock = async () => {
    await updateMaterialStock(materialStockForm.value)
    ElMessage.success('修改成功')
    materialStockDialogVisible.value = false
    loadMaterialStockList()
}

// 网络请求：批量新增库存
const doBatchAddMaterialStock = async () => {
    await batchAddMaterialStock(materialStockBatchAddForm.value)
    ElMessage.success('添加成功')
    materialStockAddDialogVisible.value = false
    loadMaterialStockList()
}

// 网络请求：删除材料
const doDeleteMaterial = async () => {
    await deleteMaterialById(materialForm.value.id)
    ElMessage.success('删除成功')
    materialDialogVisible.value = false
    loadMaterialList()
}

// 网络请求：删除进料
const doDeleteMaterialIn = async () => {
    await deleteMaterialInById(materialInForm.value.id)
    ElMessage.success('删除成功')
    materialInDialogVisible.value = false
    loadMaterialInList()
}

// 网络请求：删除库存
const doDeleteMaterialStock = async () => {
    await deleteMaterialStockById(materialStockForm.value.id)
    ElMessage.success('删除成功')
    materialStockDialogVisible.value = false
    loadMaterialStockList()
}

// 网络请求：获取用料列表
const loadMaterialUseList = async () => {
    try {
        materialUseTableLoading.value = true
        const res = await getMaterialUseList(materialUseParam.value)
        materialUseTotal.value = res.data.total
        materialUseList.value = res.data.rows
    } finally {
        materialUseTableLoading.value = false
    }
}

// 网络请求：计算用料
const doCalcMaterialUseByMonth = async () => {
    await calcMaterialUseByMonth(materialUseCalcForm.value.month)
    ElMessage.success('计算成功')
    materialUseCalcDialogVisible.value = false
    loadMaterialUseList()
}

// 网络请求：添加用料
const doAddMaterialUse = async () => { 
    await addMaterialUse(materialUseForm.value)
    ElMessage.success('添加成功')
    materialUseDialogVisible.value = false
    loadMaterialUseList()
}

// 网络请求：修改用料
const doUpdateMaterialUse = async () => { 
    await updateMaterialUse(materialUseForm.value)
    ElMessage.success('修改成功')
    materialUseDialogVisible.value = false
    loadMaterialUseList()
}

// 网络请求：删除用料
const doDeleteMaterialUse = async () => { 
    await deleteMaterialUseById(materialUseForm.value.id)
    ElMessage.success('删除成功')
    materialUseDialogVisible.value = false
    loadMaterialUseList()
}


onMounted(() => {
    loadMaterialList()
})

</script>

<template>
    <div class="main-page">
        <div class="page-header">
            <h1>材料管理</h1>
            <div>
                <el-button ref="addMaterialBtnRef" type="primary" @click="handleAddMaterial" v-if="tabPage === 'first'">新增材料</el-button>
                <el-button ref="addMaterialInBtnRef" type="primary" @click="handleAddMaterialIn" v-if="tabPage === 'second'">新增进料</el-button>
                <el-button ref="addMaterialStockBtnRef" type="primary" @click="handleAddMaterialStock" v-if="tabPage === 'third'">新增月初库存</el-button>
                <el-button ref="calcMaterialUseBtnRef" type="success" @click="handleCalcMaterialUse" v-if="tabPage === 'fourth'">用料计算</el-button>
                <el-button ref="addMaterialUseBtnRef" type="primary" @click="handleAddMaterialUse" v-if="tabPage === 'fourth'">新增用料</el-button>
            </div>
        </div>
        <el-tabs v-model="tabPage" @tab-change="loadPage" >
            <!-- 材料列表 -->
            <el-tab-pane label="材料列表" name="first">
                <div class="search-bar">
                    <el-input v-model="materialName" placeholder="请输入材料名" style="width: 200px" clearable @change="loadMaterialList"/>
                </div>
                <div class="card-list">
                    <CommonCard
                        v-for="item in materialList"
                        :key="item.id"
                        :title="item.name"
                        :info-list="[
                            { label: '单位', value: item.unit },
                            { label: '单价', value: item.unitPrice },
                            { label: '备注', value: item.remark }
                        ]"
                        :card-ref="el => setCardRef(item.id, el)"
                        @click="handleRowClick(item, $event)"
                    >

                    </CommonCard>
                </div>
            </el-tab-pane>
            <!-- 进料管理 -->
            <el-tab-pane label="进料管理" name="second">
                <div class="search-bar">
                    <el-select v-model="materialInParam.materialId" placeholder="请选择材料" @change="loadMaterialInList" clearable>
                        <el-option
                            v-for="item in materialList"
                            :key="item.id"
                            :label="item.name"
                            :value="item.id"
                        />
                    </el-select>
                    <el-date-picker 
                        v-model="materialInParam.dateRange"
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
                        @change="loadMaterialInList"
                    />
                </div>
                <div class="table-box">
                    <el-table
                        :data="materialInList"
                        stripe
                        v-loading="materialInTableLoading"
                        @row-click="handleMaterialInRowClick"
                    >
                        <el-table-column prop="id" label="ID" width="60" />
                        <el-table-column prop="materialName" label="材料名" />
                        <el-table-column prop="quantity" label="数量" width="100" />
                        <el-table-column prop="unit" label="单位" width="60" />
                        <el-table-column prop="remark" label="备注" width="150" show-overflow-tooltip />
                        <el-table-column prop="createTime" label="进料时间" width="170" />
                        <el-table-column prop="updateTime" label="修改时间" width="170" />
                    </el-table>
                    <div class="pagination-box">
                        <el-pagination 
                            v-model:current-page="materialInParam.pageNum"
                            v-model:page-size="materialInParam.pageSize"
                            :page-sizes="[10, 20, 50, 100]"
                            :page-size="10"
                            background
                            @size-change="loadMaterialInList"
                            @current-change="loadMaterialInList"
                            layout="total, prev, pager, next, jumper, sizes"
                            :total="materialInTotal" 
                        />
                    </div>
                </div>
            </el-tab-pane>
            <!-- 月初库存统计 -->
            <el-tab-pane label="月初库存统计" name="third">
                <div class="search-bar">
                    <el-select v-model="materialStockParam.materialId" placeholder="请选择材料" @change="loadMaterialStockList" clearable>
                        <el-option
                            v-for="item in materialList"
                            :key="item.id"
                            :label="item.name"
                            :value="item.id"
                        />
                    </el-select>
                    <el-date-picker 
                        v-model="materialStockParam.month"
                        type="month" 
                        placeholder="请选择月份"
                        value-format="YYYY-MM"
                        clearable
                        @change="loadMaterialStockList"
                    />
                </div>
                <div class="table-box">
                    <el-table
                        :data="materialStockList"
                        stripe
                        v-loading="materialStockTableLoading"
                        @row-click="handleMaterialStockRowClick"
                    >
                        <el-table-column prop="id" label="ID" width="60" />
                        <el-table-column prop="month" label="月份" width="100" />
                        <el-table-column prop="materialName" label="材料名" />
                        <el-table-column prop="quantity" label="数量" width="100" />
                        <el-table-column prop="unit" label="单位" width="60" />
                        <el-table-column prop="remark" label="备注" width="150" show-overflow-tooltip />
                        <el-table-column prop="createTime" label="创建时间" width="170" />
                        <el-table-column prop="updateTime" label="修改时间" width="170" />
                    </el-table>
                    <div class="pagination-box">
                        <el-pagination 
                            v-model:current-page="materialStockParam.pageNum"
                            v-model:page-size="materialStockParam.pageSize"
                            :page-sizes="[10, 20, 50, 100]"
                            :page-size="10"
                            background
                            @size-change="loadMaterialStockList"
                            @current-change="loadMaterialStockList"
                            layout="total, prev, pager, next, jumper, sizes"
                            :total="materialStockTotal" 
                        />
                    </div>
                </div>
            </el-tab-pane>
            <el-tab-pane label="月度用料管理" name="fourth">
                <div class="search-bar">
                    <el-select v-model="materialUseParam.materialId" placeholder="请选择材料" @change="loadMaterialUseList" clearable>
                        <el-option
                            v-for="item in materialList"
                            :key="item.id"
                            :label="item.name"
                            :value="item.id"
                        />
                    </el-select>
                    <el-date-picker 
                        v-model="materialUseParam.month"
                        type="month" 
                        placeholder="请选择月份"
                        value-format="YYYY-MM"
                        clearable
                        @change="loadMaterialUseList"
                    />
                </div>
                <div class="table-box">
                    <el-table
                        :data="materialUseList"
                        stripe
                        v-loading="materialUseTableLoading"
                        @row-click="handleMaterialUseRowClick"
                    >
                        <el-table-column prop="id" label="ID" width="60" />
                        <el-table-column prop="month" label="月份" width="100" />
                        <el-table-column prop="materialName" label="材料名" />
                        <el-table-column prop="quantity" label="数量" width="100" />
                        <el-table-column prop="unit" label="单位" width="60" />
                        <el-table-column prop="cost" label="成本(元)" width="100" />
                        <el-table-column prop="remark" label="备注" width="150" show-overflow-tooltip />
                        <el-table-column prop="createTime" label="创建时间" width="170" />
                        <el-table-column prop="updateTime" label="修改时间" width="170" />
                    </el-table>
                    <div class="pagination-box">
                        <el-pagination 
                            v-model:current-page="materialUseParam.pageNum"
                            v-model:page-size="materialUseParam.pageSize"
                            :page-sizes="[10, 20, 50, 100]"
                            :page-size="10"
                            background
                            @size-change="loadMaterialUseList"
                            @current-change="loadMaterialUseList"
                            layout="total, prev, pager, next, jumper, sizes"
                            :total="materialUseTotal" 
                        />
                    </div>
                </div>
            </el-tab-pane>
        </el-tabs>
        <!-- 材料新增/修改弹窗 -->
        <ZoomDialog
            v-model:visible="materialDialogVisible"
            :title="materialDialogTitle"
            :source-rect="materialDialogSourceRect"
            :close-on-mask="false"
            :width="350"
        >
            <el-form label-width="70px" :rules="materialFormRules" :model="materialForm" ref="materialFormRef">
                <el-form-item label="材料名" prop="name">
                    <el-input v-model="materialForm.name" placeholder="请输入材料名" />
                </el-form-item>
                <el-form-item label="单价" prop="unitPrice">
                    <el-input-number
                        v-model="materialForm.unitPrice" 
                        placeholder="请输入单价" 
                        :min="0"
                        :step="0.001"
                        controls-position="right"
                        style="width: 100%"
                    />
                </el-form-item>
                <el-form-item label="单位" prop="unit">
                    <el-input v-model="materialForm.unit" placeholder="请输入单位" />
                </el-form-item>
                <el-form-item label="备注" prop="remark">
                    <el-input v-model="materialForm.remark" placeholder="请输入备注" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="materialDialogVisible = false">取消</el-button>
                <el-button ref="materialDelBtnRef" type="danger" @click="handleDeleteMaterial(materialForm.name)" v-if="materialForm.id">删除</el-button>
                <el-button type="primary" @click="handleSubmitMaterial(materialFormRef)">确认保存</el-button>
            </template>
        </ZoomDialog>
        <!-- 进料修改弹窗 -->
        <ZoomDialog
            v-model:visible="materialInDialogVisible"
            title="进料信息"
            :source-rect="materialInDialogSourceRect"
            :close-on-mask="false"
            :width="350"
        >
            <el-form label-width="70px" :rules="materialInFormRules" :model="materialInForm" ref="materialInFormRef">
                <el-form-item label="材料" prop="materialId">
                    <el-select v-model="materialInForm.materialId" placeholder="请选择材料" style="width: 100%">
                        <el-option
                            v-for="item in materialList"
                            :key="item.id"
                            :label="item.name"
                            :value="item.id"
                            clearable
                        />
                    </el-select>
                </el-form-item>
                <el-form-item label="数量" prop="quantity">
                    <el-input
                        v-model="materialInForm.quantity" 
                        placeholder="请输入数量" 
                        type="number"
                        clearable
                    >
                        <template #append>{{ getMaterialUnit(materialInForm.materialId) }}</template>
                    </el-input>
                </el-form-item>
                <el-form-item label="备注" prop="remark">
                    <el-input v-model="materialInForm.remark" placeholder="请输入备注" type="textarea"/>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="materialInDialogVisible = false">取消</el-button>
                <el-button ref="materialInDelBtnRef" type="danger" @click="handleDeleteMaterialIn">删除</el-button>
                <el-button type="primary" @click="handleSaveMaterialIn(materialInFormRef)">确认保存</el-button>
            </template>
        </ZoomDialog>
        <!-- 批量添加进料弹窗 -->
        <ZoomDialog
            v-model:visible="materialInAddDialogVisible"
            title="添加进料"
            :source-rect="materialInAddDialogSourceRect"
            :close-on-mask="false"
            :width="900"
        >
            <el-form 
                v-for="(item, index) in materialInBatchAddForm"
                :key="index"
                :inline="true" 
                :model="item" 
                class="demo-form-inline"
                :rules="materialInAddFormRules"
            >
                <el-form-item label="材料" prop="materialId">
                    <el-select v-model="item.materialId" placeholder="请选择材料" clearable>
                        <el-option
                            v-for="item in materialList"
                            :key="item.id"
                            :label="item.name"
                            :value="item.id"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item label="进料数量" prop="quantity">
                    <el-input 
                        v-model="item.quantity" 
                        placeholder="请输入进料数量" 
                        type="number"
                        clearable
                    >
                        <template #append>{{ getMaterialUnit(item.materialId) }}</template>
                    </el-input>
                </el-form-item>
                <el-form-item label="备注" prop="remark">
                    <el-input v-model="item.remark" placeholder="请输入备注" />
                </el-form-item>
                <el-form-item>
                    <el-button 
                        @click="materialInBatchAddForm.splice(index, 1)" 
                        type="danger"
                        icon="Delete"
                        size="small"
                        :disabled="materialInBatchAddForm.length <= 1"
                    />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="materialInAddDialogVisible = false">取消</el-button>
                <el-button type="success" @click="materialInAddDialogAddRow">新增一行</el-button>
                <el-button type="primary" @click="handleSubmitMaterialIn">确认提交</el-button>
            </template>
        </ZoomDialog>
        <!-- 库存修改弹窗 -->
        <ZoomDialog
            v-model:visible="materialStockDialogVisible"
            title="库存信息"
            :source-rect="materialStockDialogSourceRect"
            :close-on-mask="false"
            :width="350"
        >
            <el-form label-width="70px" :rules="materialStockFormRules" :model="materialStockForm" ref="materialStockFormRef">
                <el-form-item label="材料" prop="materialId">
                    <el-select v-model="materialStockForm.materialId" placeholder="请选择材料" style="width: 100%">
                        <el-option
                            v-for="item in materialList"
                            :key="item.id"
                            :label="item.name"
                            :value="item.id"
                            clearable
                        />
                    </el-select>
                </el-form-item>
                <el-form-item label="月份" prop="month"  style="width: 100%">
                    <el-date-picker 
                        v-model="materialStockForm.month" 
                        type="month" 
                        placeholder="请选择日期"
                        value-format="YYYY-MM-01"
                    />
                </el-form-item>
                <el-form-item label="数量" prop="quantity">
                    <el-input
                        v-model="materialStockForm.quantity" 
                        placeholder="请输入数量" 
                        type="number"
                        clearable
                    >
                        <template #append>{{ getMaterialUnit(materialStockForm.materialId) }}</template>
                    </el-input>
                </el-form-item>
                <el-form-item label="备注" prop="remark">
                    <el-input v-model="materialStockForm.remark" placeholder="请输入备注" type="textarea" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="materialStockDialogVisible = false">取消</el-button>
                <el-button ref="materialStockDelBtnRef" type="danger" @click="handleDeleteMaterialStock">删除</el-button>
                <el-button type="primary" @click="handleSaveMaterialStock(materialStockFormRef)">确认保存</el-button>
            </template>
        </ZoomDialog>
        <!-- 批量添加库存弹窗 -->
        <ZoomDialog
            v-model:visible="materialStockAddDialogVisible"
            title="添加月初库存"
            :source-rect="materialStockAddDialogSourceRect"
            :close-on-mask="false"
            :width="900"
        >
            <el-form 
                v-for="(item, index) in materialStockBatchAddForm"
                :key="index"
                :inline="true" 
                :model="item" 
                class="demo-form-inline"
                :rules="materialStockAddFormRules"
            >
                <el-form-item label="月份" prop="month">
                    <el-date-picker 
                        v-model="item.month" 
                        type="month" 
                        placeholder="请选择月份"
                        value-format="YYYY-MM-01"
                        format="YYYY-MM"
                        style="width: 120px"
                    />
                </el-form-item>
                <el-form-item label="材料" prop="materialId">
                    <el-select v-model="item.materialId" placeholder="请选择材料" clearable style="width: 120px">
                        <el-option
                            v-for="item in materialList"
                            :key="item.id"
                            :label="item.name"
                            :value="item.id"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item label="库存数量" prop="quantity">
                    <el-input 
                        v-model="item.quantity" 
                        placeholder="请输入库存数量" 
                        type="number"
                        clearable
                        style="width: 180px"
                    >
                        <template #append>{{ getMaterialUnit(item.materialId) }}</template>
                    </el-input>
                </el-form-item>
                <el-form-item label="备注" prop="remark">
                    <el-input v-model="item.remark" placeholder="请输入备注" type="textarea"/>
                </el-form-item>
                <el-form-item>
                    <el-button 
                        @click="materialStockBatchAddForm.splice(index, 1)" 
                        type="danger"
                        icon="Delete"
                        size="small"
                        :disabled="materialStockBatchAddForm.length <= 1"
                    />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="materialStockAddDialogVisible = false">取消</el-button>
                <el-button type="success" @click="materialStockAddDialogAddRow">新增一行</el-button>
                <el-button type="primary" @click="handleSubmitMaterialStock">确认提交</el-button>
            </template>
        </ZoomDialog>
        <!-- 用料添加/修改弹窗 -->
        <ZoomDialog
            v-model:visible="materialUseDialogVisible"
            :title="materialUseDialogTitle"
            :source-rect="materialUseDialogSourceRect"
            :close-on-mask="false"
            :width="350"
        >
            <el-form label-width="70px" :rules="materialUseFormRules" :model="materialUseForm" ref="materialUseFormRef">
                <el-form-item label="材料" prop="materialId">
                    <el-select v-model="materialUseForm.materialId" placeholder="请选择材料" style="width: 100%" @change="calcCost">
                        <el-option
                            v-for="item in materialList"
                            :key="item.id"
                            :label="item.name"
                            :value="item.id"
                            clearable
                        />
                    </el-select>
                </el-form-item>
                <el-form-item label="月份" prop="month"  style="width: 100%">
                    <el-date-picker 
                        v-model="materialUseForm.month" 
                        type="month" 
                        placeholder="请选择日期"
                        value-format="YYYY-MM-01"
                    />
                </el-form-item>
                <el-form-item label="数量" prop="quantity">
                    <el-input
                        v-model="materialUseForm.quantity" 
                        placeholder="请输入数量" 
                        type="number"
                        clearable
                        @input="calcCost"
                    >
                        <template #append>{{ getMaterialUnit(materialUseForm.materialId) }}</template>
                    </el-input>
                </el-form-item>
                <el-form-item label="成本" prop="quantity">
                    <el-input
                        v-model="materialUseForm.cost" 
                        placeholder="请输入成本" 
                        type="number"
                        clearable
                        disabled
                    >
                        <template #append>元</template>
                    </el-input>
                </el-form-item>
                <el-form-item label="备注" prop="remark">
                    <el-input v-model="materialUseForm.remark" placeholder="请输入备注" type="textarea" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="materialUseDialogVisible = false">取消</el-button>
                <el-button ref="materialUseDelBtnRef" type="danger" @click="handleDeleteMaterialUse" v-if="materialUseForm.id">删除</el-button>
                <el-button type="primary" @click="handleSubmitMaterialUse(materialUseFormRef)">确认提交</el-button>
            </template>
        </ZoomDialog>
        <!-- 用料计算弹窗 -->
        <ZoomDialog
            v-model:visible="materialUseCalcDialogVisible"
            title="用料计算"
            :source-rect="materialUseCalcDialogSourceRect"
            :close-on-mask="false"
            width="350"
        >
            <el-form ref="materialUseCalcFormRef" :model="materialUseCalcForm" label-width="auto"> 
                <el-form-item label="月份" prop="month">
                    <el-date-picker 
                        v-model="materialUseCalcForm.month" 
                        type="month" 
                        placeholder="请选择月份"
                        value-format="YYYY-MM"
                    />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="materialUseCalcDialogVisible = false">取消</el-button>
                <el-button ref="calcBtnRef" type="success" @click="handleSubmitMaterialUseCalc(materialUseCalcForm.month)">计算</el-button>
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
.pagination-box {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>