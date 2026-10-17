<script setup>
// ============================================================
// 1. 依赖导入
// ============================================================
import { ref, reactive, watch, onMounted } from 'vue'
import ZoomDialog from '@/components/ZoomDialog.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { getElementRect, defaultRect, rectFromEvent } from '@/utils/zoom'
import { getProfitList, deleteProfitById, calcProfit } from '@/api/profits'
import { getExpenditureList, addExpenditure, updateExpenditure, deleteExpenditureById, calcExpenditure } from '@/api/expenditures'
import { getRevenueList, addRevenue, updateRevenue, deleteRevenueById, calcRevenue } from '@/api/revenues'
import { dayjs, ElMessage } from 'element-plus'

// ============================================================
// 2. 全局状态
// ============================================================
const confirmDialogRef = ref(null)
const tabPage = ref('first')

// ============================================================
// 3. 利润模块
// ============================================================
// ---------- 3.1 响应式状态 ----------
const profitListParam = ref({
    month: '',
    pageNum: 1,
    pageSize: 10
})
const profitList = ref([])
const profitTableLoading = ref(false)
const profitListTotal = ref(0)

// 利润信息弹窗
const profitForm = ref({
    id: null,
    month: '',
    revenue: null,
    expenditure: null,
    profit: null,
    remark: ''
})
const profitFormRef = ref(null)
const profitDialogVisible = ref(false)
const profitDialogSourceRect = reactive({ x: 0, y: 0, width: 240, height: 120 })
const profitDelBtnRef = ref(null)

// 利润计算弹窗
const profitCalcForm = ref({
    month: ''
})
const profitCalcFormRef = ref(null)
const profitCalcDialogVisible = ref(false)
const profitCalcDialogSourceRect = reactive({ x: 0, y: 0, width: 240, height: 120 })
const calcProfitBtnRef = ref(null)
const profitCalcBtnRef = ref(null)

// ---------- 3.2 表单操作 ----------
// 清空profitForm
const clearProfitForm = () => {
    profitForm.value = {
        id: null,
        month: '',
        revenue: null,
        expenditure: null,
        profit: null,
        remark: ''
    }
    if (profitFormRef.value) {
        profitFormRef.value.clearValidate()
    }
}

// ---------- 3.3 交互事件 ----------
// 利润表表格行点击
const handleProfitRowClick = (row, column, event) => {
    let el = event && event.target
    while (el && el.tagName !== 'TR' && el.parentElement) {
        el = el.parentElement
    }
    if (el && el.getBoundingClientRect) {
        const rect = el.getBoundingClientRect()
        profitDialogSourceRect.x = rect.left
        profitDialogSourceRect.y = rect.top
        profitDialogSourceRect.width = rect.width
        profitDialogSourceRect.height = rect.height
    }
    clearProfitForm()
    profitForm.value = { ...row }
    profitDialogVisible.value = true
}

// 利润计算按钮点击
const handleCalcProfit = () => {
    profitCalcForm.value = { month: dayjs().format('YYYY-MM') }
    const rect = getElementRect(calcProfitBtnRef.value)
    Object.assign(profitCalcDialogSourceRect, rect || defaultRect(240, 120))
    profitCalcDialogVisible.value = true
}

// 利润计算 - 确认提交
const handleSubmitProfitCalc = (month) => {
    if (!month) {
        ElMessage.warning('请选择月份')
        return
    }
    const rect = getElementRect(profitCalcBtnRef.value)
    confirmDialogRef.value.open({
        message: `确定计算 ${month} 的利润吗？这将会删除该月的所有利润信息并重新计算`,
        sourceRect: rect || defaultRect(200, 100),
        onConfirm: doCalcProfitByMonth,
        confirmText: '确认计算'
    })
}

// 利润弹窗删除按钮点击
const handleDeleteProfit = () => {
    const rect = getElementRect(profitDelBtnRef.value)
    confirmDialogRef.value.open({
        message: `确定删除该利润吗？`,
        sourceRect: rect || defaultRect(200, 100),
        onConfirm: doDeleteProfitById
    })
}

// ---------- 3.4 网络请求 ----------
// 网络请求：加载利润列表
const loadProfitList = async () => {
    try {
        profitTableLoading.value = true
        const res = await getProfitList(profitListParam.value)
        profitListTotal.value = res.data.total
        profitList.value = res.data.rows
    } finally {
        profitTableLoading.value = false
    }
}

// 网络请求：利润计算
const doCalcProfitByMonth = async () => {
    await calcProfit(profitCalcForm.value.month)
    ElMessage.success('计算成功')
    loadProfitList()
    profitCalcDialogVisible.value = false
}

// 网络请求：删除利润
const doDeleteProfitById = async () => {
    await deleteProfitById(profitForm.value.id)
    ElMessage.success('删除成功')
    loadProfitList()
    profitDialogVisible.value = false
}

// ============================================================
// 4. 支出模块
// ============================================================
// ---------- 4.1 响应式状态 ----------
const expenditureIsAdd = ref(true)
const expenditureListParam = ref({
    month: '',
    name: '',
    pageNum: 1,
    pageSize: 10
})
const expenditureList = ref([])
const expenditureTableLoading = ref(false)
const expenditureListTotal = ref(0)

// 支出信息弹窗
const expenditureForm = ref({
    id: null,
    month: '',
    name: '',
    amount: null,
    remark: ''
})
const expenditureFormRef = ref(null)
const expenditureDialogVisible = ref(false)
const expenditureDialogSourceRect = reactive({ x: 0, y: 0, width: 240, height: 120 })
const expenditureDialogTitle = ref('新增支出')
const expenditureDelBtnRef = ref(null)

// 支出计算弹窗
const expenditureCalcForm = ref({
    month: ''
})
const expenditureCalcFormRef = ref(null)
const expenditureCalcDialogVisible = ref(false)
const expenditureCalcDialogSourceRect = reactive({ x: 0, y: 0, width: 240, height: 120 })
const calcExpenditureBtnRef = ref(null)
const expenditureCalcBtnRef = ref(null)
const addExpenditureBtnRef = ref(null)

// 保留：旧版支出计算状态（当前未使用）
const calcExpenditureForm = ref({
    month: ''
})
const calcExpenditureDialogVisible = ref(false)
const calcExpenditureDialogSourceRect = reactive({ x: 0, y: 0, width: 240, height: 120 })

// ---------- 4.2 校验规则 & 表单操作 ----------
const expenditureFormRules = reactive({
    month: [
        { required: true, message: '请选择月份', trigger: 'change' }
    ],
    name: [
        { required: true, message: '请输入项目名', trigger: 'change' }
    ],
    amount: [
        { required: true, message: '请输入金额', trigger: 'change' }
    ],
})

// 清空expenditureForm
const clearExpenditureForm = () => {
    expenditureForm.value = {
        id: null,
        month: '',
        name: '',
        amount: null,
        remark: ''
    }
    if (expenditureFormRef.value) {
        expenditureFormRef.value.clearValidate()
    }
}

// ---------- 4.3 交互事件 ----------
// 支出表表格行点击
const handleExpenditureRowClick = (row, column, event) => {
    let el = event && event.target
    while (el && el.tagName !== 'TR' && el.parentElement) {
        el = el.parentElement
    }
    if (el && el.getBoundingClientRect) {
        const rect = el.getBoundingClientRect()
        expenditureDialogSourceRect.x = rect.left
        expenditureDialogSourceRect.y = rect.top
        expenditureDialogSourceRect.width = rect.width
        expenditureDialogSourceRect.height = rect.height
    }
    clearExpenditureForm()
    expenditureDialogTitle.value = '支出信息'
    expenditureIsAdd.value = false
    expenditureForm.value = { ...row }
    expenditureDialogVisible.value = true
}

// 支出计算按钮点击
const handleCalcExpenditure = () => {
    expenditureCalcForm.value = { month: dayjs().format('YYYY-MM') }
    const rect = getElementRect(expenditureCalcBtnRef.value)
    Object.assign(expenditureCalcDialogSourceRect, rect || defaultRect(240, 120))
    expenditureCalcDialogVisible.value = true
}

// 支出计算 - 确认提交
const handleSubmitExpenditureCalc = (month) => {
    if (!month) {
        ElMessage.warning('请选择月份')
        return
    }
    const rect = getElementRect(expenditureCalcBtnRef.value)
    confirmDialogRef.value.open({
        message: `确定计算 ${month} 的支出吗？这将会删除该月的所有支出信息并重新计算`,
        sourceRect: rect || defaultRect(200, 100),
        onConfirm: doCalcExpenditureByMonth,
        confirmText: '确认计算'
    })
}

// 点击新增支出按钮
const handleAddExpenditure = () => {
    expenditureDialogTitle.value = '新增支出'
    expenditureIsAdd.value = true
    clearExpenditureForm()
    const rect = getElementRect(addExpenditureBtnRef.value)
    Object.assign(expenditureDialogSourceRect, rect || defaultRect(240, 120))
    expenditureDialogVisible.value = true
}

// 支出弹窗确认按钮点击
const handleSaveExpenditure = async (formEl) => {
    if (!formEl) return
    try {
        await formEl.validate()
        if (expenditureIsAdd.value) {
            await doAddExpenditure(expenditureForm.value)
        } else {
            await doUpdateExpenditure(expenditureForm.value)
        }
        loadExpenditureList()
    } catch (err) {
        return
    }
}

// 支出弹窗删除按钮点击
const handleDeleteExpenditure = () => {
    const rect = getElementRect(expenditureDelBtnRef.value)
    confirmDialogRef.value.open({
        message: `确定删除该支出吗？`,
        sourceRect: rect || defaultRect(200, 100),
        onConfirm: doDeleteExpenditureById
    })
}

// ---------- 4.4 网络请求 ----------
// 网络请求：加载支出列表
const loadExpenditureList = async () => {
    try {
        expenditureTableLoading.value = true
        const res = await getExpenditureList(expenditureListParam.value)
        expenditureListTotal.value = res.data.total
        expenditureList.value = res.data.rows
    } finally {
        expenditureTableLoading.value = false
    }
}

// 网络请求：新增支出
const doAddExpenditure = async () => {
    await addExpenditure(expenditureForm.value)
    ElMessage.success('添加成功')
    loadExpenditureList()
    expenditureDialogVisible.value = false
}

// 网络请求：修改支出
const doUpdateExpenditure = async () => {
    await updateExpenditure(expenditureForm.value)
    ElMessage.success('修改成功')
    loadExpenditureList()
    expenditureDialogVisible.value = false
}

// 网络请求：删除支出
const doDeleteExpenditureById = async () => {
    await deleteExpenditureById(expenditureForm.value.id)
    ElMessage.success('删除成功')
    loadExpenditureList()
    expenditureDialogVisible.value = false
}

// 网络请求：支出计算
const doCalcExpenditureByMonth = async () => {
    await calcExpenditure(expenditureCalcForm.value.month)
    ElMessage.success('计算成功')
    loadExpenditureList()
    expenditureCalcDialogVisible.value = false
}

// ============================================================
// 5. 收入模块
// ============================================================
// ---------- 5.1 响应式状态 ----------
const revenueIsAdd = ref(true)
const revenueListParam = ref({
    month: '',
    name: '',
    pageNum: 1,
    pageSize: 10
})
const revenueList = ref([])
const revenueTableLoading = ref(false)
const revenueListTotal = ref(0)

// 收入信息弹窗
const revenueForm = ref({
    id: null,
    month: '',
    name: '',
    amount: null,
    remark: ''
})
const revenueFormRef = ref(null)
const revenueDialogVisible = ref(false)
const revenueDialogSourceRect = reactive({ x: 0, y: 0, width: 240, height: 120 })
const revenueDialogTitle = ref('新增收入')
const revenueDelBtnRef = ref(null)

// 收入计算弹窗
const revenueCalcForm = ref({
    month: ''
})
const revenueCalcFormRef = ref(null)
const revenueCalcDialogVisible = ref(false)
const revenueCalcDialogSourceRect = reactive({ x: 0, y: 0, width: 240, height: 120 })
const calcRevenueBtnRef = ref(null)
const revenueCalcBtnRef = ref(null)
const addRevenueBtnRef = ref(null)

// ---------- 5.2 校验规则 & 表单操作 ----------
const revenueFormRules = reactive({
    month: [
        { required: true, message: '请选择月份', trigger: 'change' }
    ],
    name: [
        { required: true, message: '请输入项目名', trigger: 'change' }
    ],
    amount: [
        { required: true, message: '请输入金额', trigger: 'change' }
    ],
})

// 清空revenueForm
const clearRevenueForm = () => {
    revenueForm.value = {
        id: null,
        month: '',
        name: '',
        amount: null,
        remark: ''
    }
    if (revenueFormRef.value) {
        revenueFormRef.value.clearValidate()
    }
}

// ---------- 5.3 交互事件 ----------
// 收入表表格行点击
const handleRevenueRowClick = (row, column, event) => {
    let el = event && event.target
    while (el && el.tagName !== 'TR' && el.parentElement) {
        el = el.parentElement
    }
    if (el && el.getBoundingClientRect) {
        const rect = el.getBoundingClientRect()
        revenueDialogSourceRect.x = rect.left
        revenueDialogSourceRect.y = rect.top
        revenueDialogSourceRect.width = rect.width
        revenueDialogSourceRect.height = rect.height
    }
    clearRevenueForm()
    revenueDialogTitle.value = '收入信息'
    revenueIsAdd.value = false
    revenueForm.value = { ...row }
    revenueDialogVisible.value = true
}

// 收入计算按钮点击
const handleCalcRevenue = () => {
    revenueCalcForm.value = { month: dayjs().format('YYYY-MM') }
    const rect = getElementRect(calcRevenueBtnRef.value)
    Object.assign(revenueCalcDialogSourceRect, rect || defaultRect(240, 120))
    revenueCalcDialogVisible.value = true
}

// 收入计算 - 确认提交
const handleSubmitRevenueCalc = (month) => {
    if (!month) {
        ElMessage.warning('请选择月份')
        return
    }
    const rect = getElementRect(revenueCalcBtnRef.value)
    confirmDialogRef.value.open({
        message: `确定计算 ${month} 的收入吗？这将会删除该月的所有收入信息并重新计算`,
        sourceRect: rect || defaultRect(200, 100),
        onConfirm: doCalcRevenueByMonth,
        confirmText: '确认计算'
    })
}

// 点击新增收入按钮
const handleAddRevenue = () => {
    revenueDialogTitle.value = '新增收入'
    revenueIsAdd.value = true
    clearRevenueForm()
    const rect = getElementRect(addRevenueBtnRef.value)
    Object.assign(revenueDialogSourceRect, rect || defaultRect(240, 120))
    revenueDialogVisible.value = true
}

// 收入弹窗确认按钮点击
const handleSaveRevenue = async (formEl) => {
    if (!formEl) return
    try {
        await formEl.validate()
        if (revenueIsAdd.value) {
            await doAddRevenue(revenueForm.value)
        } else {
            await doUpdateRevenue(revenueForm.value)
        }
        loadRevenueList()
        revenueDialogVisible.value = false
    } catch (err) {
        return
    }
}

// 收入弹窗删除按钮点击
const handleDeleteRevenue = () => {
    const rect = getElementRect(revenueDelBtnRef.value)
    confirmDialogRef.value.open({
        message: `确定删除该利润吗？`,
        sourceRect: rect || defaultRect(200, 100),
        onConfirm: doDeleteRevenueById
    })
}

// ---------- 5.4 网络请求 ----------
// 网络请求：加载收入列表
const loadRevenueList = async () => {
    try {
        revenueTableLoading.value = true
        const res = await getRevenueList(revenueListParam.value)
        revenueListTotal.value = res.data.total
        revenueList.value = res.data.rows
    } finally {
        revenueTableLoading.value = false
    }
}

// 网络请求：新增收入
const doAddRevenue = async () => {
    await addRevenue(revenueForm.value)
    ElMessage.success('添加成功')
    loadRevenueList()
    revenueDialogVisible.value = false
}

// 网络请求：修改收入
const doUpdateRevenue = async () => {
    await updateRevenue(revenueForm.value)
    ElMessage.success('修改成功')
    loadRevenueList()
    revenueDialogVisible.value = false
}

// 网络请求：删除收入
const doDeleteRevenueById = async () => {
    await deleteRevenueById(revenueForm.value.id)
    ElMessage.success('删除成功')
    loadRevenueList()
    revenueDialogVisible.value = false
}

// 网络请求：收入计算
const doCalcRevenueByMonth = async () => {
    await calcRevenue(revenueCalcForm.value.month)
    ElMessage.success('计算成功')
    loadRevenueList()
    revenueCalcDialogVisible.value = false
}

// ============================================================
// 6. 生命周期 & 页面调度
// ============================================================
// 动态加载页面
const loadPage = (name) => {
    if (name == 'first') loadProfitList()
    else if (name == 'second') loadExpenditureList()
    else if (name == 'third') loadRevenueList()
}

onMounted(() => {
    loadProfitList()
})
</script>

<template>
    <div class="main-page">
        <div class="page-header">
            <h1>利润统计</h1>
            <div>
                <el-button ref="calcProfitBtnRef" type="success" @click="handleCalcProfit" v-show="tabPage === 'first'">利润计算</el-button>
                <el-button ref="calcExpenditureBtnRef" type="success" @click="handleCalcExpenditure" v-show="tabPage === 'second'">支出计算</el-button>
                <el-button ref="addExpenditureBtnRef" type="primary" @click="handleAddExpenditure" v-show="tabPage === 'second'">新增支出</el-button>
                <el-button ref="calcRevenueBtnRef" type="success" @click="handleCalcRevenue" v-show="tabPage === 'third'">收入计算</el-button>
                <el-button ref="addRevenueBtnRef" type="primary" @click="handleAddRevenue" v-show="tabPage === 'third'">新增收入</el-button>
            </div>
        </div>
        <el-tabs v-model="tabPage" @tab-change="loadPage">
            <el-tab-pane label="利润管理" name="first">
                <div class="search-bar">
                    <el-date-picker 
                        v-model="profitListParam.month" 
                        type="month" 
                        placeholder="请选择月份"
                        clearable
                        value-format="YYYY-MM"
                        style="width: 200px;" 
                        @change="loadProfitList"
                    />
                </div>
                <div class="table-box">
                    <el-table 
                        :data="profitList"
                        stripe
                        v-loading="profitTableLoading"
                        @row-click="handleProfitRowClick"
                    >
                        <el-table-column prop="id" label="ID" width="60" />
                        <el-table-column prop="month" label="月份" width="100">
                            <template #default="{ row }">
                                {{ row.month ? row.month.slice(0, 7) : '' }}
                            </template>
                        </el-table-column>
                        <el-table-column prop="revenue" label="收入" width="150"/>
                        <el-table-column prop="expenditure" label="支出" width="150"/>
                        <el-table-column prop="profit" label="利润" width="150"/>
                        <el-table-column prop="remark" label="备注" show-overflow-tooltip />
                        <el-table-column prop="createTime" label="创建时间" width="170" />
                        <el-table-column prop="updateTime" label="修改时间" width="170" />
                    </el-table>
                    <div class="pagination-box">
                        <el-pagination 
                            v-model:current-page="profitListParam.pageNum"
                            v-model:page-size="profitListParam.pageSize"
                            :page-sizes="[10, 20, 50, 100]"
                            background
                            @size-change="loadProfitList"
                            @current-change="loadProfitList"
                            layout="total, prev, pager, next, jumper, sizes"
                            :total="profitListTotal" 
                        />
                    </div>
                </div>
            </el-tab-pane>
            <el-tab-pane label="支出管理" name="second">
                <div class="search-bar">
                    <el-date-picker 
                        v-model="expenditureListParam.month" 
                        type="month" 
                        placeholder="请选择月份"
                        clearable
                        value-format="YYYY-MM"
                        style="width: 200px;" 
                        @change="loadExpenditureList"
                    />
                    <el-input v-model="expenditureListParam.name" placeholder="请输入项目名" clearable style="width: 200px;" @input="loadExpenditureList"/>
                </div>
                <div class="table-box">
                    <el-table 
                        :data="expenditureList"
                        stripe
                        v-loading="expenditureTableLoading"
                        @row-click="handleExpenditureRowClick"
                    >
                        <el-table-column prop="id" label="ID" width="60" />
                        <el-table-column prop="month" label="月份" width="100">
                            <template #default="{ row }">
                                {{ row.month ? row.month.slice(0, 7) : '' }}
                            </template>
                        </el-table-column>
                        <el-table-column prop="name" label="项目名" width="150" />
                        <el-table-column prop="amount" label="金额" width="150"/>
                        <el-table-column prop="remark" label="备注" show-overflow-tooltip />
                        <el-table-column prop="createTime" label="创建时间" width="170" />
                        <el-table-column prop="updateTime" label="修改时间" width="170" />
                    </el-table>
                    <div class="pagination-box">
                        <el-pagination 
                            v-model:current-page="expenditureListParam.pageNum"
                            v-model:page-size="expenditureListParam.pageSize"
                            :page-sizes="[10, 20, 50, 100]"
                            background
                            @size-change="loadExpenditureList"
                            @current-change="loadExpenditureList"
                            layout="total, prev, pager, next, jumper, sizes"
                            :total="expenditureListTotal" 
                        />
                    </div>
                </div>
            </el-tab-pane>
            <el-tab-pane label="收入管理" name="third">
                <div class="search-bar">
                    <el-date-picker 
                        v-model="revenueListParam.month" 
                        type="month" 
                        placeholder="请选择月份"
                        clearable
                        value-format="YYYY-MM"
                        style="width: 200px;" 
                        @change="loadRevenueList"
                    />
                    <el-input v-model="revenueListParam.name" placeholder="请输入项目名" clearable style="width: 200px;" @input="loadRevenueList"/>
                </div>
                <div class="table-box">
                    <el-table 
                        :data="revenueList"
                        stripe
                        v-loading="revenueTableLoading"
                        @row-click="handleRevenueRowClick"
                    >
                        <el-table-column prop="id" label="ID" width="60" />
                        <el-table-column prop="month" label="月份" width="100">
                            <template #default="{ row }">
                                {{ row.month ? row.month.slice(0, 7) : '' }}
                            </template>
                        </el-table-column>
                        <el-table-column prop="name" label="项目名" width="150" />
                        <el-table-column prop="amount" label="金额" width="150"/>
                        <el-table-column prop="remark" label="备注" show-overflow-tooltip />
                        <el-table-column prop="createTime" label="创建时间" width="170" />
                        <el-table-column prop="updateTime" label="修改时间" width="170" />
                    </el-table>
                    <div class="pagination-box">
                        <el-pagination 
                            v-model:current-page="revenueListParam.pageNum"
                            v-model:page-size="revenueListParam.pageSize"
                            :page-sizes="[10, 20, 50, 100]"
                            background
                            @size-change="loadRevenueList"
                            @current-change="loadRevenueList"
                            layout="total, prev, pager, next, jumper, sizes"
                            :total="revenueListTotal" 
                        />
                    </div>
                </div>
            </el-tab-pane>
            
        </el-tabs>
        <!-- 修改利润的对话框 -->
        <ZoomDialog
            v-model:visible="profitDialogVisible"
            title="利润信息"
            :source-rect="profitDialogSourceRect"
            :close-on-mask="false"
            :width="350"
        >
            <el-form label-width="70px" :rules="profitFormRules" :model="profitForm" ref="profitFormRef">
                <el-form-item label="月份" prop="month">
                    <el-date-picker 
                        v-model="profitForm.month" 
                        type="month" 
                        placeholder="请选择月份"
                        value-format="YYYY-MM-01"
                    />
                </el-form-item>
                <el-form-item label="收入" prop="revenue">
                    <el-input v-model="profitForm.revenue">
                        <template #append>
                            <el-button type="primary">元</el-button>
                        </template>
                    </el-input>
                </el-form-item>
                <el-form-item label="支出" prop="expenditure">
                    <el-input v-model="profitForm.expenditure">
                        <template #append>
                            <el-button type="primary">元</el-button>
                        </template>
                    </el-input>
                </el-form-item>
                <el-form-item label="利润" prop="profit">
                    <el-input v-model="profitForm.profit">
                        <template #append>
                            <el-button type="primary">元</el-button>
                        </template>
                    </el-input>
                </el-form-item>
                <el-form-item label="备注" prop="remark">
                    <el-input v-model="profitForm.remark" type="textarea" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="profitDialogVisible = false">取消</el-button>
                <el-button ref="profitDelBtnRef" type="danger" @click="handleDeleteProfit">删除</el-button>
            </template>
        </ZoomDialog>
        <!-- 利润计算弹窗 -->
        <ZoomDialog
            v-model:visible="profitCalcDialogVisible"
            title="利润计算"
            :source-rect="profitCalcDialogSourceRect"
            :close-on-mask="false"
            width="350"
        >
            <el-form ref="profitCalcFormRef" :model="profitCalcForm" label-width="auto"> 
                <el-form-item label="月份" prop="month">
                    <el-date-picker 
                        v-model="profitCalcForm.month" 
                        type="month" 
                        placeholder="请选择月份"
                        value-format="YYYY-MM"
                    />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="profitCalcDialogVisible = false">取消</el-button>
                <el-button ref="profitCalcBtnRef" type="success" @click="handleSubmitProfitCalc(profitCalcForm.month)">计算</el-button>
            </template>
        </ZoomDialog>
        <!-- 支出修改 / 新增的对话框 -->
        <ZoomDialog
            v-model:visible="expenditureDialogVisible"
            :title="expenditureDialogTitle"
            :source-rect="expenditureDialogSourceRect"
            :close-on-mask="false"
            :width="350"
        >
            <el-form label-width="70px" :rules="expenditureFormRules" :model="expenditureForm" ref="expenditureFormRef">
                <el-form-item label="月份" prop="month">
                    <el-date-picker 
                        v-model="expenditureForm.month" 
                        type="month" 
                        placeholder="请选择月份"
                        value-format="YYYY-MM-01"
                        clearable
                    />
                </el-form-item>
                <el-form-item label="项目名" prop="name">
                    <el-input v-model="expenditureForm.name" clearable/>
                </el-form-item>
                <el-form-item label="金额" prop="amount">
                    <el-input v-model="expenditureForm.amount" clearable>
                        <template #append>
                            <el-button type="primary">元</el-button>
                        </template>
                    </el-input>
                </el-form-item>
                <el-form-item label="备注" prop="remark">
                    <el-input v-model="expenditureForm.remark" type="textarea" clearable />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="expenditureDialogVisible = false">取消</el-button>
                <el-button ref="expenditureDelBtnRef" type="danger" @click="handleDeleteExpenditure" v-if="expenditureForm.id">删除</el-button>
                <el-button type="primary" @click="handleSaveExpenditure(expenditureFormRef)">确认保存</el-button>
            </template>
        </ZoomDialog>
        <!-- 支出计算弹窗 -->
        <ZoomDialog
            v-model:visible="expenditureCalcDialogVisible"
            title="支出计算"
            :source-rect="expenditureCalcDialogSourceRect"
            :close-on-mask="false"
            width="350"
        >
            <el-form ref="expenditureCalcFormRef" :model="expenditureCalcForm" label-width="auto"> 
                <el-form-item label="月份" prop="month">
                    <el-date-picker 
                        v-model="expenditureCalcForm.month" 
                        type="month" 
                        placeholder="请选择月份"
                        value-format="YYYY-MM"
                    />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="expenditureCalcDialogVisible = false">取消</el-button>
                <el-button ref="expenditureCalcBtnRef" type="success" @click="handleSubmitExpenditureCalc(expenditureCalcForm.month)">计算</el-button>
            </template>
        </ZoomDialog>
        <!-- 收入修改 / 新增的对话框 -->
        <ZoomDialog
            v-model:visible="revenueDialogVisible"
            :title="revenueDialogTitle"
            :source-rect="revenueDialogSourceRect"
            :close-on-mask="false"
            :width="350"
        >
            <el-form label-width="70px" :rules="revenueFormRules" :model="revenueForm" ref="revenueFormRef">
                <el-form-item label="月份" prop="month">
                    <el-date-picker 
                        v-model="revenueForm.month" 
                        type="month" 
                        placeholder="请选择月份"
                        value-format="YYYY-MM-01"
                        clearable
                    />
                </el-form-item>
                <el-form-item label="项目名" prop="name">
                    <el-input v-model="revenueForm.name" clearable/>
                </el-form-item>
                <el-form-item label="金额" prop="amount">
                    <el-input v-model="revenueForm.amount" clearable>
                        <template #append>
                            <el-button type="primary">元</el-button>
                        </template>
                    </el-input>
                </el-form-item>
                <el-form-item label="备注" prop="remark">
                    <el-input v-model="revenueForm.remark" type="textarea" clearable />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="revenueDialogVisible = false">取消</el-button>
                <el-button ref="revenueDelBtnRef" type="danger" @click="handleDeleteRevenue" v-if="revenueForm.id">删除</el-button>
                <el-button type="primary" @click="handleSaveRevenue(revenueFormRef)">确认保存</el-button>
            </template>
        </ZoomDialog>
        <!-- 收入计算弹窗 -->
        <ZoomDialog
            v-model:visible="revenueCalcDialogVisible"
            title="支出计算"
            :source-rect="revenueCalcDialogSourceRect"
            :close-on-mask="false"
            width="350"
        >
            <el-form ref="revenueCalcFormRef" :model="revenueCalcForm" label-width="auto"> 
                <el-form-item label="月份" prop="month">
                    <el-date-picker 
                        v-model="revenueCalcForm.month" 
                        type="month" 
                        placeholder="请选择月份"
                        value-format="YYYY-MM"
                    />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="revenueCalcDialogVisible = false">取消</el-button>
                <el-button ref="revenueCalcBtnRef" type="success" @click="handleSubmitRevenueCalc(revenueCalcForm.month)">计算</el-button>
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
.pagination-box {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>