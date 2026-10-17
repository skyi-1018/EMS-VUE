<script setup>
// ============================================================
// 1. 依赖导入
// ============================================================
import { ref, reactive, onMounted, watch } from 'vue'
import ZoomDialog from '@/components/ZoomDialog.vue'
import CommonCard from '@/components/CommonCard.vue'
import { getElementRect, defaultRect, rectFromEvent } from '@/utils/zoom'
import { getMaterialList, addMaterial, updateMaterial, deleteMaterialById } from '@/api/materials.js'
import { getMaterialInList, batchAddMaterialIn, updateMaterialIn, deleteMaterialInById } from '@/api/material-ins.js'
import { getMaterialStockList, batchAddMaterialStock, updateMaterialStock, deleteMaterialStockById } from '@/api/material-stocks.js'
import { getMaterialUseList, addMaterialUse, updateMaterialUse, deleteMaterialUseById, calcMaterialUseByMonth } from '@/api/material-uses.js'
import { getFilmList, addFilm, updateFilm, deleteFilmById, getFilmInList, batchAddFilmIn, updateFilmIn, deleteFilmIdById } from '@/api/films.js'
import { getFilmUseList, addFilmUse, updateFilmUse, deleteFilmUseById, calcFilmUseByMonth } from '@/api/film-uses.js'
import { getProcessList } from '@/api/processes.js'
import { dayjs, ElMessage } from 'element-plus'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { ROLE } from '@/utils/role'
import { hasPermission } from '@/utils/global'

// ============================================================
// 2. 全局基础状态
// ============================================================
const processList = ref([])
const cardRefs = {}
const confirmDialogRef = ref(null)
const tabPage = ref('first')

// ============================================================
// 3. 通用工具函数
// ============================================================
// 设置卡片引用
const setCardRef = (id, el) => {
    if (el) cardRefs[id] = el
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

// 计算用料金额
const calcUseAmount = (item) => {
    if(!item.quantity || !item.unitPrice) {
        item.amount = null
        return
    }
    item.amount = item.quantity * item.unitPrice
}

// 计算进料金额
const calcInAmount = (item) => {
    if(!item.quantity || !item.unitPrice) {
        item.amount = null
        return
    }
    item.amount = item.quantity * item.unitPrice
}

// 计算膜进料金额
const calcFilmInAmount = (item) => {
    if(!item.weight || !item.unitPrice) {
        item.amount = null
        return
    }
    item.amount = item.weight * item.unitPrice
}

// ============================================================
// 4. 日期快捷选项
// ============================================================
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

// ============================================================
// 5. 材料模块（Material）
// ============================================================
// ---------- 5.1 响应式状态 ----------
const addMaterialBtnRef = ref(null)
const materialName = ref('')
const materialList = ref([])
const materialForm = ref({
    id: null,
    name: '',
    unit: '',
    remark: ''
})
const materialIsAdd = ref(false)
const materialFormRef = ref(null)
const materialFormRules = reactive({
    name: [
        { required: true, message: '请输入材料名', trigger: 'blur' }
    ],
    unit: [
        { required: true, message: '请输入单位', trigger: 'change'}
    ],
})
const materialDialogVisible = ref(false)
const materialDialogTitle = ref('新增材料')
const materialDialogSourceRect = reactive({ x: 0, y: 0, width: 240, height: 120 })
const materialDelBtnRef = ref(null)

// ---------- 5.2 表单操作 ----------
// 清空materialForm
const clearMaterialForm = () => {
    materialForm.value = {
        id: null,
        name: '',
        unit: '',
        remark: ''
    }
    if(materialFormRef.value){
        materialFormRef.value.clearValidate()
    }
}

// ---------- 5.3 交互事件 ----------
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
        unit: item.unit,
        remark: item.remark
    }

    const cardEl = cardRefs[item.id]
    const rect = cardEl && cardEl.getBoundingClientRect
        ? cardEl.getBoundingClientRect()
        : event.currentTarget.getBoundingClientRect()

    materialDialogSourceRect.x = rect.left
    materialDialogSourceRect.y = rect.top
    materialDialogSourceRect.width = rect.width
    materialDialogSourceRect.height = rect.height
    materialDialogTitle.value = '材料信息'
    materialDialogVisible.value = true
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

// ---------- 5.4 网络请求 ----------
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

// 网络请求：删除材料
const doDeleteMaterial = async () => {
    await deleteMaterialById(materialForm.value.id)
    ElMessage.success('删除成功')
    materialDialogVisible.value = false
    loadMaterialList()
}

// ============================================================
// 6. 材料进料模块（MaterialIn）
// ============================================================
// ---------- 6.1 响应式状态 ----------
const materialInParam = ref({
    materialId: null,
    startDate: '',
    endDate: '',
    pageNum: 1,
    pageSize: 10,
    dateRange: ''
})
const materialInList = ref([])
const materialInTableLoading = ref(false)
const materialInTotal = ref(null)
const materialInFormRef = ref(null)
const materialInForm = ref({
    id: null,
    inDate: '',
    materialId: null,
    unitPrice: null,
    quantity: null,
    amount: null,
    remark: ''
})
const materialInDialogVisible = ref(false)
const materialInDialogSourceRect = reactive({ x: 0, y: 0, width: 240, height: 120 })
const materialInFormRules = reactive({
    inDate: [
        { required: true, message: '请选择进料日期', trigger: 'change' }
    ],
    materialId: [
        { required: true, message: '请选择材料', trigger: 'change' }
    ],
    unitPrice: [
        { required: true, message: '请输入单价', trigger: 'change' }
    ],
    quantity: [
        { required: true, message: '请输入数量', trigger: 'change'}
    ],
    amount: [
        { required: true, message: '请输入金额', trigger: 'change' }
    ],
})
const materialInAddDialogVisible = ref(false)
const materialInAddDialogSourceRect = reactive({ x: 0, y: 0, width: 240, height: 120 })
const addMaterialInBtnRef = ref(null)
const materialInBatchAddForm = ref([
    {
        inDate: dayjs().format('YYYY-MM-DD'),
        materialId: null,
        unitPrice: null,
        quantity: null,
        amount: null,
        remark: ''
    },
])
const materialInAddFormRules = reactive({
    inDate: [
        { required: true, message: '请选择进料日期', trigger: 'change' }
    ],
    materialId: [
        { required: true, message: '请选择材料', trigger: 'change' }
    ],
    unitPrice: [
        { required: true, message: '请输入单价', trigger: 'change' }
    ],
    quantity: [
        { required: true, message: '请输入数量', trigger: 'change'}
    ],
    amount: [
        { required: true, message: '请输入金额', trigger: 'change' }
    ],
})
const materialInDelBtnRef = ref(null)

// ---------- 6.2 表单操作 ----------
// 清空materialInForm
const clearMaterialInForm = () => {
    materialInForm.value = {
        id: null,
        inDate: '',
        materialId: null,
        unitPrice: null,
        quantity: null,
        amount: null,
        remark: ''
    }
    if (materialInFormRef.value) {
        materialInFormRef.value.clearValidate()
    }
}

// 清空materialInBatchAddForm
const clearMaterialInBatchAddForm = () => {
    materialInBatchAddForm.value = [
        {
            inDate: dayjs().format('YYYY-MM-DD'),
            materialId: null,
            unitPrice: null,
            quantity: null,
            amount: null,
            remark: ''
        },
    ]
}

// ---------- 6.3 交互事件 ----------
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

// 点击新增进料按钮
const handleAddMaterialIn = () => {
    clearMaterialInBatchAddForm()
    const rect = getElementRect(addMaterialInBtnRef.value)
    Object.assign(materialInAddDialogSourceRect, rect || defaultRect(240, 120))
    materialInAddDialogVisible.value = true
}

// 批量进料弹窗新增一行
const materialInAddDialogAddRow = () => {
    materialInBatchAddForm.value.push({
        inDate: dayjs().format('YYYY-MM-DD'),
        materialId: null,
        unitPrice: null,
        quantity: null,
        amount: null,
        remark: '',
    })
}

// 批量添加进料弹窗确认提交按钮点击
const handleSubmitMaterialIn = () => {
    doBatchAddMaterialIn()
}

const handleDeleteMaterialIn = () => {
    const rect = getElementRect(materialInDelBtnRef.value)
    confirmDialogRef.value.open({
        message: `确定删除该进料吗？`,
        sourceRect: rect || defaultRect(200, 100),
        onConfirm: doDeleteMaterialIn
    })
}

// ---------- 6.4 网络请求 ----------
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

// 网络请求：删除进料
const doDeleteMaterialIn = async () => {
    await deleteMaterialInById(materialInForm.value.id)
    ElMessage.success('删除成功')
    materialInDialogVisible.value = false
    loadMaterialInList()
}

// ============================================================
// 7. 材料库存模块（MaterialStock）
// ============================================================
// ---------- 7.1 响应式状态 ----------
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
const materialStockDelBtnRef = ref(null)

// ---------- 7.2 表单操作 ----------
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

// ---------- 7.3 交互事件 ----------
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

// 点击新增月初库存按钮
const handleAddMaterialStock = () => {
    clearMaterialStockBatchAddForm()
    const rect = getElementRect(addMaterialStockBtnRef.value)
    Object.assign(materialStockAddDialogSourceRect, rect || defaultRect(240, 120))
    materialStockAddDialogVisible.value = true
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

// 库存新增弹窗确认按钮点击
const handleSubmitMaterialStock = () => {
    doBatchAddMaterialStock()
}

const handleDeleteMaterialStock = () => {
    const rect = getElementRect(materialStockDelBtnRef.value)
    confirmDialogRef.value.open({
        message: `确定删除该库存吗？`,
        sourceRect: rect || defaultRect(200, 100),
        onConfirm: doDeleteMaterialStock
    })
}

// ---------- 7.4 网络请求 ----------
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

// 网络请求：删除库存
const doDeleteMaterialStock = async () => {
    await deleteMaterialStockById(materialStockForm.value.id)
    ElMessage.success('删除成功')
    materialStockDialogVisible.value = false
    loadMaterialStockList()
}

// ============================================================
// 8. 材料用料模块（MaterialUse）
// ============================================================
// ---------- 8.1 响应式状态 ----------
const materialUseDelBtnRef = ref(null)
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
    unitPrice: [
        { required: true, message: '请输入单价', trigger: 'change' }
    ],
    quantity: [
        { required: true, message: '请输入数量', trigger: 'change'}
    ],
    amount: [
        { required: true, message: '请输入金额', trigger: 'change'}
    ]
})
const materialUseForm = ref({
    id: null,
    month: '',
    materialId: null,
    unitPrice: null,
    quantity: null,
    amount: null,
    remark: ''
})
const materialUseCalcDialogVisible = ref(false)
const materialUseCalcDialogSourceRect = reactive({ x: 0, y: 0, width: 240, height: 120 })
const materialUseCalcForm = ref({
    month: dayjs().format('YYYY-MM'),
})
const calcBtnRef = ref(null)

// ---------- 8.2 表单操作 ----------
// 清空materialUseForm
const clearMaterialUseForm = () => {
    materialUseForm.value = {
        id: null,
        month: '',
        materialId: null,
        unitPrice: null,
        quantity: null,
        amount: null,
        remark: ''
    }
    if (materialUseFormRef.value) {
        materialUseFormRef.value.clearValidate()
    }
}

// ---------- 8.3 交互事件 ----------
// 点击新增用料按钮
const handleAddMaterialUse = () => {
    clearMaterialUseForm()
    materialUseForm.value.month = dayjs().format('YYYY-MM-01')
    materialUseDialogTitle.value = '新增用料'
    materialUseIsAdd.value = true
    const rect = getElementRect(addMaterialUseBtnRef.value)
    Object.assign(materialUseDialogSourceRect, rect || defaultRect(240, 120))
    materialUseDialogVisible.value = true
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

// 用料弹窗确认按钮点击
const handleSubmitMaterialUse = async (formEl) => {
    if (!formEl) return
    try {
        await formEl.validate()
        if (materialUseIsAdd.value) {
            doAddMaterialUse()
        } else {
            doUpdateMaterialUse()
        }
    } catch (err) {
        return
    }
}

// 用料计算按钮点击
const handleCalcMaterialUse = () => {
    materialUseCalcForm.value = { month: dayjs().format('YYYY-MM') }
    const rect = getElementRect(calcMaterialUseBtnRef.value)
    Object.assign(materialUseCalcDialogSourceRect, rect || defaultRect(240, 120))
    materialUseCalcDialogVisible.value = true
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

// ---------- 8.4 网络请求 ----------
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

// ============================================================
// 9. 膜模块（Film）
// ============================================================
// ---------- 9.1 响应式状态 ----------
const filmList = ref([])
const filmDialogVisible = ref(false)
const filmDialogSourceRect = reactive({ x: 0, y: 0, width: 240, height: 120 })
const newFilmForm = ref({
    processId: null,
    name: '',
    scale: null,
    remark: ''
})
const editFilmDialogVisible = ref(false)
const editFilmDialogSourceRect = reactive({ x: 0, y: 0, width: 240, height: 120 })
const editFilmForm = ref({
    id: null,
    processId: null,
    name: '',
    scale: null,
    remark: ''
})
const editFilmFormRef = ref(null)
const filmTypeManageBtnRef = ref(null)
const editFilmFormRules = reactive({
    processId: [
        { required: true, message: '请选择关联工艺', trigger: 'change' }
    ],
    name: [
        { required: true, message: '请输入膜名', trigger: 'change' }
    ],
    scale: [
        { required: true, message: '请输入系数', trigger: 'change' }
    ],
})

// ---------- 9.2 表单操作 ----------
// 清空newFilmForm
const clearNewFilmForm = () => {
    newFilmForm.value = {
        processId: null,
        name: '',
        scale: null,
        remark: ''
    }
}

// ---------- 9.3 交互事件 ----------
// 膜类型管理按钮点击
const handleFilmTypeManage = () => {
    loadFilmList()
    const rect = getElementRect(filmTypeManageBtnRef.value)
    Object.assign(filmDialogSourceRect, rect || defaultRect(240, 120))
    filmDialogVisible.value = true
}

const handleAddFilm = () => {
    doAddFilm()
}

// 膜类型删除
const handleDeleteFilm = (film, event) => {
    const rect = rectFromEvent(event)
    confirmDialogRef.value.open({
        message: `确定删除膜类型"${film.name}"吗？`,
        sourceRect: rect,
        onConfirm: () => doDeleteFilmById(film.id)
    })
}

// 膜类型管理内编辑按钮点击
const handleEditFilm = (film, event) => {
    editFilmForm.value = { ...film  }
    const rect = rectFromEvent(event, 200, 100)
    Object.assign(editFilmDialogSourceRect, rect)
    editFilmDialogVisible.value = true
}

// 膜类型管理保存按钮点击
const handleSaveFilm = async (formEl) => {
    if (!formEl) return
    try {
        await formEl.validate()
        doUpdateFilm()
    } catch (err) {
        return
    }
}

// ---------- 9.4 网络请求 ----------
// 网络请求：加载膜列表
const loadFilmList = async () => {
    const res = await getFilmList()
    filmList.value = res.data
}

// 网络请求：添加膜
const doAddFilm = async () => {
    await addFilm(newFilmForm.value)
    ElMessage.success('添加成功')
    clearNewFilmForm()
    loadFilmList()
}

// 网络请求：修改膜
const doUpdateFilm = async () => {
    await updateFilm(editFilmForm.value)
    ElMessage.success('修改成功')
    loadFilmList()
    editFilmDialogVisible.value = false
}

// 网络请求：删除膜
const doDeleteFilmById = async (id) => {
    await deleteFilmById(id)
    ElMessage.success('删除成功')
    loadFilmList()
}

// ============================================================
// 10. 膜进料模块（FilmIn）
// ============================================================
// ---------- 10.1 响应式状态 ----------
const filmInParam = ref({
    filmId: null,
    thickness: null,
    spec: null,
    startDate: '',
    endDate: '',
    pageNum: 1,
    pageSize: 10,
    dateRange: '',
})
const filmInList = ref([])
const filmInTableLoading = ref(false)
const filmInTotal = ref(null)
const filmInDialogVisible = ref(false)
const filmInDialogSourceRect = reactive({ x: 0, y: 0, width: 240, height: 120 })
const filmInFormRef = ref(null)
const filmInForm = ref({
    id: null,
    inDate: dayjs().format('YYYY-MM-DD'),
    filmId: null,
    thickness: null,
    spec: null,
    weight: null,
    unitPrice: null,
    amount: null,
    remark: ''
})
const filmInFormRules = reactive({
    inDate: [
        { required: true, message: '请输入进料日期', trigger: 'change' }
    ],
    filmId: [
        { required: true, message: '请选择膜类型', trigger: 'change'}
    ],
    spec: [
        { required: true, message: '请输入规格', trigger: 'change'}
    ],
    weight: [
        { required: true, message: '请输入重量', trigger: 'change'}
    ],
    unitPrice: [
        { required: true, message: '请输入单价', trigger: 'change'}
    ],
    amount: [
        { required: true, message: '请输入金额', trigger: 'change'}
    ],
})
const filmInAddForm = ref([
    {
        inDate: dayjs().format('YYYY-MM-DD'),
        filmId: null,
        thickness: null,
        spec: null,
        weight: null,
        unitPrice: null,
        amount: null,
        remark: ''
    },
])
const filmInAddDialogVisible = ref(false)
const filmInAddDialogSourceRect = reactive({ x: 0, y: 0, width: 240, height: 120 })
const addFilmInBtnRef = ref(null)
const filmInDelBtnRef = ref(null)

// ---------- 10.2 表单操作 ----------
// 清空filmInParam
const clearFilmInParam = () => {
    filmInParam.value = {
        filmId: null,
        thickness: null,
        spec: null,
        startDate: '',
        endDate: '',
        pageNum: 1,
        pageSize: 10,
        dateRange: '',
    }
    loadFilmInList()
}

// 清空filmInForm
const clearFilmInForm = () => {
    filmInForm.value = {
        inDate: dayjs().format('YYYY-MM-DD'),
        filmId: null,
        thickness: null,
        spec: null,
        weight: null,
        unitPrice: null,
        amount: null,
        remark: ''
    }
}

// 清空filmInAddForm
const clearFilmInAddForm = () => {
    filmInAddForm.value = [
        {
            inDate: dayjs().format('YYYY-MM-DD'),
            filmId: null,
            thickness: null,
            spec: null,
            weight: null,
            unitPrice: null,
            amount: null,
            remark: ''
        },
    ]
}

// ---------- 10.3 交互事件 ----------
// 膜进料表格行点击
const handleFilmInRowClick = (row, column, event) => {
    let el = event && event.target
    while (el && el.tagName !== 'TR' && el.parentElement) {
        el = el.parentElement
    }
    if (el && el.getBoundingClientRect) {
        const rect = el.getBoundingClientRect()
        filmInDialogSourceRect.x = rect.left
        filmInDialogSourceRect.y = rect.top
        filmInDialogSourceRect.width = rect.width
        filmInDialogSourceRect.height = rect.height
    }
    clearFilmInForm()
    filmInForm.value = { ...row }
    filmInDialogVisible.value = true
}

const handleAddFilmIn = () => {
    clearFilmInAddForm()
    const rect = getElementRect(addFilmInBtnRef.value)
    Object.assign(filmInAddDialogSourceRect, rect || defaultRect(240, 120))
    filmInAddDialogVisible.value = true
}

// 批量膜进料弹窗新增一行
const filmInAddDialogAddRow = () => {
    filmInAddForm.value.push({
        inDate: dayjs().format('YYYY-MM-DD'),
        filmId: null,
        thickness: null,
        spec: null,
        weight: null,
        unitPrice: null,
        amount: null,
        remark: ''
    })
}

const handleSubmitFilmIn = () => {
    doBatchAddFilmIn()
}

const handleSaveFilmIn = async (formEl) => {
    if (!formEl) return
    try {
        await formEl.validate()
        doUpdateFilmIn()
    } catch (err) {
        return
    }
}

const handleDeleteFilmIn = () => {
    const rect = getElementRect(filmInDelBtnRef.value)
    confirmDialogRef.value.open({
        message: `确定删除该进料吗？`,
        sourceRect: rect || defaultRect(200, 100),
        onConfirm: doDeleteFilmIn
    })
}

// ---------- 10.4 网络请求 ----------
// 网络请求：加载膜进料列表
const loadFilmInList = async () => {
    try {
        filmInTableLoading.value = true
        if(!filmInParam.value.dateRange){
            filmInParam.value.startDate = null
            filmInParam.value.endDate = null
        } else{
            const [start, end] = filmInParam.value.dateRange
            filmInParam.value.startDate = start
            filmInParam.value.endDate = end
        }
        const res = await getFilmInList(filmInParam.value)
        filmInTotal.value = res.data.total
        filmInList.value = res.data.rows
    } finally {
        filmInTableLoading.value = false
    }
}

// 网络请求：批量新增膜进料
const doBatchAddFilmIn = async () => {
    await batchAddFilmIn(filmInAddForm.value)
    ElMessage.success('添加成功')
    loadFilmInList()
    filmInAddDialogVisible.value = false
}

// 网络请求：修改膜进料
const doUpdateFilmIn = async () => {
    await updateFilmIn(filmInForm.value)
    ElMessage.success('修改成功')
    loadFilmInList()
    filmInDialogVisible.value = false
}

// 网络请求：删除膜进料
const doDeleteFilmIn = async () => {
    await deleteFilmIdById(filmInForm.value.id)
    ElMessage.success('删除成功')
    loadFilmInList()
    filmInDialogVisible.value = false
}

// ============================================================
// 11. 膜用料模块（FilmUse）
// ============================================================
// ---------- 11.1 响应式状态 ----------
const filmUseParam = ref({
    filmId: null,
    month: '',
    pageNum: 1,
    pageSize: 10,
})
const filmUseList = ref([])
const filmUseTableLoading = ref(false)
const filmUseTotal = ref(null)
const filmUseDialogVisible = ref(false)
const filmUseDialogTitle = ref('新增膜用料')
const filmUseDialogSourceRect = reactive({ x: 0, y: 0, width: 240, height: 120 })
const filmUseForm = ref({
    id: null,
    month: '',
    filmId: null,
    unitPrice: null,
    quantity: null,
    amount: null,
    remark: ''
})
const filmUseFormRules = reactive({
    month: [
        { required: true, message: '请选择月份', trigger: 'change' }
    ],
    filmId: [
        { required: true, message: '请选择电影', trigger: 'change' }
    ],
    unitPrice: [
        { required: true, message: '请输入单价', trigger: 'change' }
    ],
    quantity: [
        { required: true, message: '请输入数量', trigger: 'change'}
    ],
    amount: [
        { required: true, message: '请输入金额', trigger: 'change'}
    ]
})
const filmUseFormRef = ref(null)
const filmUseCalcDialogVisible = ref(false)
const filmUseCalcDialogSourceRect = reactive({ x: 0, y: 0, width: 240, height: 120 })
const filmUseCalcForm = ref({
    month: dayjs().format('YYYY-MM'),
})
const filmUseCalcBtnRef = ref(null)
const addFilmUseBtnRef = ref(null)
const filmUseIsAdd = ref(true)
const filmUseDelBtnRef = ref(null)
const calcFilmUseBtnRef = ref(null)

// ---------- 11.2 表单操作 ----------
// 清空filmUseForm
const clearFilmUseForm = () => {
    filmUseForm.value = {
        id: null,
        month: '',
        filmId: null,
        unitPrice: null,
        quantity: null,
        amount: null,
        remark: ''
    }
    if (filmUseFormRef.value) {
        filmUseFormRef.value.clearValidate()
    }
}

// ---------- 11.3 交互事件 ----------
// 点击新增膜用料按钮
const handleAddFilmUse = () => {
    clearFilmUseForm()
    filmUseForm.value.month = dayjs().format('YYYY-MM-01')
    filmUseDialogTitle.value = '新增膜用料'
    filmUseIsAdd.value = true
    const rect = getElementRect(addFilmUseBtnRef.value)
    Object.assign(filmUseDialogSourceRect, rect || defaultRect(240, 120))
    filmUseDialogVisible.value = true
}

// 膜用料表格行点击
const handleFilmUseRowClick = (row, column, event) => {
    let el = event && event.target
    while (el && el.tagName !== 'TR' && el.parentElement) {
        el = el.parentElement
    }
    if (el && el.getBoundingClientRect) {
        const rect = el.getBoundingClientRect()
        filmUseDialogSourceRect.x = rect.left
        filmUseDialogSourceRect.y = rect.top
        filmUseDialogSourceRect.width = rect.width
        filmUseDialogSourceRect.height = rect.height
    }
    clearFilmUseForm()
    filmUseIsAdd.value = false
    filmUseDialogTitle.value = '膜用料信息'
    filmUseForm.value = { ...row }
    filmUseDialogVisible.value = true
}

// 膜用料弹窗确认按钮点击
const handleSubmitFilmUse = async (formEl) => {
    if (!formEl) return
    try {
        await formEl.validate()
        if (filmUseIsAdd.value) {
            doAddFilmUse()
        } else {
            doUpdateFilmUse()
        }
    } catch (err) {
        return
    }
}

// 膜用料计算按钮点击
const handleCalcFilmUse = () => {
    filmUseCalcForm.value = { month: dayjs().format('YYYY-MM') }
    const rect = getElementRect(calcFilmUseBtnRef.value)
    Object.assign(filmUseCalcDialogSourceRect, rect || defaultRect(240, 120))
    filmUseCalcDialogVisible.value = true
}

const handleSubmitFilmUseCalc = (month) => {
    if (!month) {
        ElMessage.warning('请选择月份')
        return
    }
    const rect = getElementRect(filmUseCalcBtnRef.value)
    confirmDialogRef.value.open({
        message: `确定计算 ${month} 的膜用料吗？这将会删除该月的所有膜用料信息并重新计算`,
        sourceRect: rect || defaultRect(200, 100),
        onConfirm: doCalcFilmUseByMonth,
        confirmText: '确认计算'
    })
}

// 膜用料删除按钮点击
const handleDeleteFilmUse = () => {
    const rect = getElementRect(filmUseDelBtnRef.value)
    confirmDialogRef.value.open({
        message: `确定删除该用料吗？`,
        sourceRect: rect || defaultRect(200, 100),
        onConfirm: doDeleteFilmUse
    })
}

// ---------- 11.4 网络请求 ----------
// 网络请求：获取膜用料列表
const loadFilmUseList = async () => {
    try {
        filmUseTableLoading.value = true
        const res = await getFilmUseList(filmUseParam.value)
        filmUseTotal.value = res.data.total
        filmUseList.value = res.data.rows
    } finally {
        filmUseTableLoading.value = false
    }
}

// 网络请求：计算膜用料
const doCalcFilmUseByMonth = async () => {
    await calcFilmUseByMonth(filmUseCalcForm.value.month)
    ElMessage.success('计算成功')
    filmUseCalcDialogVisible.value = false
    loadFilmUseList()
}

// 网络请求：添加膜用料
const doAddFilmUse = async () => {
    await addFilmUse(filmUseForm.value)
    ElMessage.success('添加成功')
    filmUseDialogVisible.value = false
    loadFilmUseList()
}

// 网络请求：修改膜用料
const doUpdateFilmUse = async () => {
    await updateFilmUse(filmUseForm.value)
    ElMessage.success('修改成功')
    filmUseDialogVisible.value = false
    loadFilmUseList()
}

// 网络请求：删除膜用料
const doDeleteFilmUse = async () => {
    await deleteFilmUseById(filmUseForm.value.id)
    ElMessage.success('删除成功')
    filmUseDialogVisible.value = false
    loadFilmUseList()
}

// ============================================================
// 12. 工艺模块（Process）
// ============================================================
// 网络请求：加载工艺列表
const loadProcessList = async () => {
    const res = await getProcessList()
    processList.value = res.data
}

// ============================================================
// 13. 页面调度 & 生命周期
// ============================================================
// 动态加载页面
const loadPage = (name) => {
    if (name == 'first') loadMaterialList()
    else if (name == 'second') loadMaterialInList()
    else if (name == 'third') loadMaterialStockList()
    else if (name == 'fourth') loadFilmInList()
    else if (name == 'fifth') loadMaterialUseList()
    else if (name == 'sixth') loadFilmUseList()
}

onMounted(() => {
    loadMaterialList()
    loadFilmList()
    loadProcessList()
})
</script>

<template>
    <div class="main-page">
        <div class="page-header">
            <h1>材料管理</h1>
            <div>
                <el-button ref="addMaterialBtnRef" type="primary" @click="handleAddMaterial" v-show="tabPage === 'first'">新增材料</el-button>
                <el-button ref="addMaterialInBtnRef" type="primary" @click="handleAddMaterialIn" v-show="tabPage === 'second'">新增进料</el-button>
                <el-button ref="addMaterialStockBtnRef" type="primary" @click="handleAddMaterialStock" v-show="tabPage === 'third'">新增月初库存</el-button>
                <el-button ref="filmTypeManageBtnRef" @click="handleFilmTypeManage" v-show="tabPage === 'fourth'">膜类型管理</el-button>
                <el-button ref="addFilmInBtnRef" type="primary" @click="handleAddFilmIn" v-show="tabPage === 'fourth'">新增进料</el-button>
                <el-button ref="calcMaterialUseBtnRef" type="success" @click="handleCalcMaterialUse" v-show="tabPage === 'fifth'" v-permission="ROLE.ADMIN">用料计算</el-button>
                <el-button ref="addMaterialUseBtnRef" type="primary" @click="handleAddMaterialUse" v-show="tabPage === 'fifth'" v-permission="ROLE.ADMIN">新增用料</el-button>
                <el-button ref="calcFilmUseBtnRef" type="success" @click="handleCalcFilmUse" v-show="tabPage === 'sixth'" v-permission="ROLE.ADMIN">膜用料计算</el-button>
                <el-button ref="addFilmUseBtnRef" type="primary" @click="handleAddFilmUse" v-show="tabPage === 'sixth'" v-permission="ROLE.ADMIN">新增膜用料</el-button>
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
                    <el-select v-model="materialInParam.materialId" placeholder="请选择材料" @change="loadMaterialInList" clearable filterable>
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
                        <el-table-column prop="inDate" label="进料日期" width="120" />
                        <el-table-column prop="materialName" label="材料名" width="200"/>
                        <el-table-column prop="unitPrice" label="单价" width="70" />
                        <el-table-column prop="quantity" label="数量" width="100" />
                        <el-table-column prop="unit" label="单位" width="60" />
                        <el-table-column prop="amount" label="金额" width="70" />
                        <el-table-column prop="remark" label="备注" show-overflow-tooltip />
                        <el-table-column prop="createTime" label="创建时间" width="170" />
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
                    <el-select v-model="materialStockParam.materialId" placeholder="请选择材料" @change="loadMaterialStockList" clearable filterable>
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
                        <el-table-column prop="month" label="月份" width="100">
                            <template #default="{ row }">
                                {{ row.month ? row.month.slice(0, 7) : '' }}
                            </template>
                        </el-table-column>
                        <el-table-column prop="materialName" label="材料名" width="200"/>
                        <el-table-column prop="quantity" label="数量" width="100" />
                        <el-table-column prop="unit" label="单位" width="60" />
                        <el-table-column prop="remark" label="备注" show-overflow-tooltip />
                        <el-table-column prop="createTime" label="创建时间" width="170" />
                        <el-table-column prop="updateTime" label="修改时间" width="170" />
                    </el-table>
                    <div class="pagination-box">
                        <el-pagination 
                            v-model:current-page="materialStockParam.pageNum"
                            v-model:page-size="materialStockParam.pageSize"
                            :page-sizes="[10, 20, 50, 100]"
                            background
                            @size-change="loadMaterialStockList"
                            @current-change="loadMaterialStockList"
                            layout="total, prev, pager, next, jumper, sizes"
                            :total="materialStockTotal" 
                        />
                    </div>
                </div>
            </el-tab-pane>
            <!-- 膜进料管理 -->
            <el-tab-pane label="膜进料管理" name="fourth">
                <div class="search-bar">
                    <el-select v-model="filmInParam.filmId" placeholder="请选择膜类型" @change="loadFilmInList" clearable filterable style="width: 200px;">
                        <el-option
                            v-for="item in filmList"
                            :key="item.id"
                            :label="item.name"
                            :value="item.id"
                        />
                    </el-select>
                    <el-select 
                        v-model="filmInParam.thickness" 
                        placeholder="请输入厚度(μm)" 
                        filterable
                        allow-create
                        clearable
                        style="width: 200px;"
                        @change="loadFilmInList"
                    >
                        <el-option label="10" value="10" />
                        <el-option label="12" value="12" />
                    </el-select>
                    <el-input v-model="filmInParam.spec" placeholder="请输入规格(cm)" type="number" clearable style="width: 200px;" @change="loadFilmInList"/>
                    <el-date-picker 
                        v-model="filmInParam.dateRange"
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
                        @change="loadFilmInList"
                    />
                    <el-button @click="clearFilmInParam">清空</el-button>
                </div>
                <div class="table-box">
                    <el-table
                        :data="filmInList"
                        stripe
                        v-loading="filmInTableLoading"
                        @row-click="handleFilmInRowClick"
                    >
                        <el-table-column prop="id" label="ID" width="60" />
                        <el-table-column prop="inDate" label="进料日期" width="120" />
                        <el-table-column prop="filmName" label="膜名" width="200" />
                        <el-table-column prop="thickness" label="厚度" width="100" />
                        <el-table-column prop="spec" label="规格(cm)" width="100" />
                        <el-table-column prop="weight" label="重量(kg)" width="100" />
                        <el-table-column prop="unitPrice" label="单价" width="100" />
                        <el-table-column prop="amount" label="金额" width="150" />
                        <el-table-column prop="remark" label="备注" show-overflow-tooltip />
                        <el-table-column prop="createTime" label="创建时间" width="170" />
                        <el-table-column prop="updateTime" label="修改时间" width="170" />
                    </el-table>
                    <div class="pagination-box">
                        <el-pagination 
                            v-model:current-page="filmInParam.pageNum"
                            v-model:page-size="filmInParam.pageSize"
                            :page-sizes="[10, 20, 50, 100]"
                            :page-size="10"
                            background
                            @size-change="loadFilmInList"
                            @current-change="loadFilmInList"
                            layout="total, prev, pager, next, jumper, sizes"
                            :total="filmInTotal" 
                        />
                    </div>
                </div>
            </el-tab-pane>
            <!-- 月度用料管理 -->
            <el-tab-pane label="月度用料管理" name="fifth" v-if="hasPermission(ROLE.ADMIN)">
                <div class="search-bar">
                    <el-select v-model="materialUseParam.materialId" placeholder="请选择材料" @change="loadMaterialUseList" clearable filterable>
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
                        <el-table-column prop="month" label="月份" width="100">
                            <template #default="{ row }">
                                {{ row.month ? row.month.slice(0, 7) : '' }}
                            </template>
                        </el-table-column>
                        <el-table-column prop="materialName" label="材料名" width="200"/>
                        <el-table-column prop="quantity" label="数量" width="100" />
                        <el-table-column prop="unit" label="单位" width="60" />
                        <el-table-column prop="unitPrice" label="单价" width="60" />
                        <el-table-column prop="amount" label="金额" width="100" />
                        <el-table-column prop="remark" label="备注" show-overflow-tooltip />
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
            <!-- 膜用料管理 -->
            <el-tab-pane label="膜用料管理" name="sixth" v-if="hasPermission(ROLE.ADMIN)">
                <div class="search-bar">
                    <el-select v-model="filmUseParam.filmId" placeholder="请选择膜" @change="loadFilmUseList" clearable filterable>
                        <el-option
                            v-for="item in filmList"
                            :key="item.id"
                            :label="item.name"
                            :value="item.id"
                        />
                    </el-select>
                    <el-date-picker 
                        v-model="filmUseParam.month"
                        type="month" 
                        placeholder="请选择月份"
                        value-format="YYYY-MM"
                        clearable
                        @change="loadFilmUseList"
                    />
                </div>
                <div class="table-box">
                    <el-table
                        :data="filmUseList"
                        stripe
                        v-loading="filmUseTableLoading"
                        @row-click="handleFilmUseRowClick"
                    >
                        <el-table-column prop="id" label="ID" width="60" />
                        <el-table-column prop="month" label="月份" width="100">
                            <template #default="{ row }">
                                {{ row.month ? row.month.slice(0, 7) : '' }}
                            </template>
                        </el-table-column>
                        <el-table-column prop="filmName" label="膜名" width="200"/>
                        <el-table-column prop="quantity" label="面积(m²)" width="100" />
                        <el-table-column prop="unitPrice" label="单价(元/m²)" width="120" />
                        <el-table-column prop="amount" label="金额" width="100" />
                        <el-table-column prop="remark" label="备注" show-overflow-tooltip />
                        <el-table-column prop="createTime" label="创建时间" width="170" />
                        <el-table-column prop="updateTime" label="修改时间" width="170" />
                    </el-table>
                    <div class="pagination-box">
                        <el-pagination 
                            v-model:current-page="filmUseParam.pageNum"
                            v-model:page-size="filmUseParam.pageSize"
                            :page-sizes="[10, 20, 50, 100]"
                            :page-size="10"
                            background
                            @size-change="loadFilmUseList"
                            @current-change="loadFilmUseList"
                            layout="total, prev, pager, next, jumper, sizes"
                            :total="filmUseTotal" 
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
                <el-form-item label="单位" prop="unit">
                    <el-select v-model="materialForm.unit" placeholder="请输入单位" filterable allow-create>
                        <el-option label="kg" value="kg" />
                        <el-option label="m" value="m" />
                        <el-option label="m²" value="m²" />
                        <el-option label="桶" value="桶" />
                        <el-option label="件" value="件" />
                    </el-select>
                </el-form-item>
                <el-form-item label="备注" prop="remark">
                    <el-input v-model="materialForm.remark" placeholder="请输入备注" type="textarea" />
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
            <el-form label-width="80px" :rules="materialInFormRules" :model="materialInForm" ref="materialInFormRef">
                <el-form-item label="进料日期" prop="inDate">
                    <el-date-picker 
                        v-model="materialInForm.inDate" 
                        type="date" 
                        placeholder="请选择进料日期" 
                        value-format="YYYY-MM-DD"
                        style="width: 100%;"
                        clearable
                    />
                </el-form-item>
                <el-form-item label="材料" prop="materialId">
                    <el-select v-model="materialInForm.materialId" placeholder="请选择材料" style="width: 100%" filterable>
                        <el-option
                            v-for="item in materialList"
                            :key="item.id"
                            :label="item.name"
                            :value="item.id"
                            clearable
                        />
                    </el-select>
                </el-form-item>
                <el-form-item label="单价" prop="unitPrice">
                    <el-input
                        v-model="materialInForm.unitPrice" 
                        placeholder="请输入单价" 
                        type="number"
                        clearable
                        @input="calcInAmount(materialInForm)"
                    >
                        <template #append>元/{{ getMaterialUnit(materialInForm.materialId) }}</template>
                    </el-input>
                </el-form-item>
                <el-form-item label="数量" prop="quantity">
                    <el-input
                        v-model="materialInForm.quantity" 
                        placeholder="请输入数量" 
                        type="number"
                        clearable
                        @input="calcInAmount(materialInForm)"
                    >
                        <template #append>{{ getMaterialUnit(materialInForm.materialId) }}</template>
                    </el-input>
                </el-form-item>
                <el-form-item label="金额" prop="amount">
                    <el-input
                        v-model="materialInForm.amount" 
                        placeholder="请输入金额" 
                        type="number"
                        clearable
                        disabled
                    >
                        <template #append>元</template>
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
                <el-form-item prop="inDate"> 
                    <el-date-picker 
                        v-model="item.inDate" 
                        type="date" 
                        placeholder="请选择进料日期" 
                        value-format="YYYY-MM-DD"
                        style="width: 140px;"
                        clearable
                    />
                </el-form-item>
                <el-form-item prop="materialId">
                    <el-select v-model="item.materialId" placeholder="请选择材料" clearable filterable style="width: 140px">
                        <el-option
                            v-for="item in materialList"
                            :key="item.id"
                            :label="item.name"
                            :value="item.id"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item prop="unitPrice"> 
                    <el-input
                        v-model="item.unitPrice" 
                        placeholder="请输入单价" 
                        type="number"
                        clearable
                        style="width: 150px"
                        @input="calcInAmount(item)"
                    >
                        <template #append>元/{{ getMaterialUnit(item.materialId) }}</template>
                    </el-input>
                </el-form-item>
                <el-form-item prop="quantity">
                    <el-input 
                        v-model="item.quantity" 
                        placeholder="请输入进料数量" 
                        type="number"
                        clearable
                        style="width: 150px"
                        @input="calcInAmount(item)"
                    >
                        <template #append>{{ getMaterialUnit(item.materialId) }}</template>
                    </el-input>
                </el-form-item>
                <el-form-item prop="amount">
                    <el-input
                        v-model="item.amount" 
                        placeholder="请输入金额" 
                        type="number"
                        clearable
                        style="width: 130px"
                        disabled
                    >
                        <template #append>元</template>
                    </el-input>
                </el-form-item>
                <el-form-item prop="remark">
                    <el-input v-model="item.remark" placeholder="请输入备注" type="textarea" style="width: 150px"/>
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
                    <el-select v-model="materialStockForm.materialId" placeholder="请选择材料" style="width: 100%" filterable>
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
                    <el-select v-model="item.materialId" placeholder="请选择材料" clearable style="width: 120px" filterable>
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
                    <el-select v-model="materialUseForm.materialId" placeholder="请选择材料" style="width: 100%" filterable>
                        <el-option
                            v-for="item in materialList"
                            :key="item.id"
                            :label="item.name"
                            :value="item.id"
                            clearable
                        />
                    </el-select>
                </el-form-item>
                <el-form-item label="月份" prop="month"  >
                    <el-date-picker 
                        v-model="materialUseForm.month" 
                        type="month" 
                        placeholder="请选择日期"
                        value-format="YYYY-MM-01"
                        style="width: 100%"
                    />
                </el-form-item>
                <el-form-item label="单价" prop="unitPrice">
                    <el-input
                        v-model="materialUseForm.unitPrice" 
                        placeholder="请输入单价" 
                        type="number"
                        clearable
                        @input="calcUseAmount(materialUseForm)"
                    >
                        <template #append>元/{{ getMaterialUnit(materialUseForm.materialId) }}</template>
                    </el-input>
                </el-form-item>
                <el-form-item label="数量" prop="quantity">
                    <el-input
                        v-model="materialUseForm.quantity" 
                        placeholder="请输入数量" 
                        type="number"
                        clearable
                        @input="calcUseAmount(materialUseForm)"
                    >
                        <template #append>{{ getMaterialUnit(materialUseForm.materialId) }}</template>
                    </el-input>
                </el-form-item>
                <el-form-item label="金额" prop="quantity">
                    <el-input
                        v-model="materialUseForm.amount" 
                        placeholder="请输入金额" 
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
        <!-- 膜进料修改弹窗 -->
        <ZoomDialog
            v-model:visible="filmInDialogVisible"
            title="膜进料信息"
            :source-rect="filmInDialogSourceRect"
            :close-on-mask="false"
            :width="350"
        >
            <el-form label-width="100px" :rules="filmInFormRules" :model="filmInForm" ref="filmInFormRef">
                <el-form-item label="膜类型" prop="filmId">
                    <el-select v-model="filmInForm.filmId" placeholder="请选择膜类型" style="width: 100%" filterable>
                        <el-option
                            v-for="item in filmList"
                            :key="item.id"
                            :label="item.name"
                            :value="item.id"
                            clearable
                        />
                    </el-select>
                </el-form-item>
                <el-form-item label="进料日期" prop="inDate"  style="width: 100%">
                    <el-date-picker 
                        v-model="filmInForm.inDate" 
                        type="date" 
                        placeholder="请选择日期"
                        value-format="YYYY-MM-DD"
                        style="width: 100%"
                    />
                </el-form-item>
                <el-form-item label="厚度" prop="thickness">
                    <el-select v-model="filmInForm.thickness" placeholder="请选择厚度(μm)" filterable allow-create clearable style="width: 100%">
                        <el-option label="10" :value="10" />
                        <el-option label="12" :value="12" />
                    </el-select>
                </el-form-item>
                <el-form-item label="规格" prop="spec">
                    <el-input
                        v-model="filmInForm.spec" 
                        placeholder="请输入规格" 
                        type="number"
                        clearable
                    >
                        <template #append>cm</template>
                    </el-input>
                </el-form-item>
                <el-form-item label="重量" prop="weight">
                    <el-input
                        v-model="filmInForm.weight" 
                        placeholder="请输入重量" 
                        type="number"
                        clearable
                        @input="calcFilmInAmount(filmInForm)"
                    >
                        <template #append>kg</template>
                    </el-input>
                </el-form-item>
                <el-form-item label="单价" prop="unitPrice">
                    <el-input
                        v-model="filmInForm.unitPrice" 
                        placeholder="请输入单价" 
                        type="number"
                        clearable
                        @input="calcFilmInAmount(filmInForm)"
                    >
                        <template #append>元/kg</template>
                    </el-input>
                </el-form-item>
                <el-form-item label="金额" prop="amount">
                    <el-input
                        v-model="filmInForm.amount" 
                        placeholder="请输入金额" 
                        type="number"
                        clearable
                        disabled
                        step="0.01"
                    >
                        <template #append>元</template>
                    </el-input>
                </el-form-item>
                <el-form-item label="备注" prop="remark">
                    <el-input v-model="filmInForm.remark" placeholder="请输入备注" type="textarea" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="filmInDialogVisible = false">取消</el-button>
                <el-button ref="filmInDelBtnRef" type="danger" @click="handleDeleteFilmIn">删除</el-button>
                <el-button type="primary" @click="handleSaveFilmIn(filmInFormRef)">确认提交</el-button>
            </template>
        </ZoomDialog>
        <!-- 膜类型管理 -->
         <ZoomDialog
            v-model:visible="filmDialogVisible"
            title="膜类型管理"
            :source-rect="filmDialogSourceRect"
        >
            <div class="film-manage-list">
                <div 
                    v-for="film in filmList"
                    :key="film.id"
                    class="film-manage-item"
                >
                    <span>{{ film.name }}</span>
                    <span class="film-remark">{{ film.remark }}</span>
                    <div>
                        <el-button size="small" type="primary" @click="handleEditFilm(film, $event)">编辑</el-button>
                        <el-button size="small" type="danger" @click="handleDeleteFilm(film, $event)">删除</el-button>
                    </div>
                </div>
            </div>
            <div style="margin-top: 20px; display: flex; gap: 10px;">
                <el-select v-model="newFilmForm.processId" placeholder="请选择工艺" style="width: 400px">
                        <el-option
                            v-for="process in processList"
                            :key="process.id"
                            :label="process.name"
                            :value="process.id"
                        />
                </el-select>
                <el-input v-model="newFilmForm.name" placeholder="请输入膜类型名称" />
                <el-input v-model="newFilmForm.scale" placeholder="请输入系数" />
                <el-input v-model="newFilmForm.remark" placeholder="请输入备注" />
                <el-button type="primary" @click="handleAddFilm">添加</el-button>
            </div>
            <template #footer>
                <el-button @click="filmDialogVisible = false">取消</el-button>
            </template>
        </ZoomDialog>
        <!-- 膜类型编辑 -->
         <ZoomDialog
            v-model:visible="editFilmDialogVisible"
            title="编辑膜类型"
            size="xs"
            :source-rect="editFilmDialogSourceRect"
        > 
            <el-form label-width="100" :rules="editFilmFormRules" ref="editFilmFormRef" :model="editFilmForm">
                <el-form-item label="关联工艺" prop="processId">
                    <el-select v-model="editFilmForm.processId" placeholder="请选择工艺" style="width: 100%">
                        <el-option
                            v-for="process in processList"
                            :key="process.id"
                            :label="process.name"
                            :value="process.id"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item label="膜类型名称" prop="name">
                    <el-input v-model="editFilmForm.name" placeholder="请输入膜类型名称" />
                </el-form-item>
                <el-form-item label="系数" prop="scale">
                    <el-input v-model="editFilmForm.scale" placeholder="请输入系数" type="number" />
                </el-form-item>
                <el-form-item label="备注" prop="remark">
                    <el-input v-model="editFilmForm.remark" placeholder="请输入备注" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="editFilmDialogVisible = false">取消</el-button>
                <el-button type="primary" @click="handleSaveFilm(editFilmFormRef)">保存</el-button>
            </template>
        </ZoomDialog>
        <!-- 膜进料批量添加弹窗 -->
         <ZoomDialog
            v-model:visible="filmInAddDialogVisible"
            title="膜进料添加"
            :source-rect="filmInAddDialogSourceRect"
            :close-on-mask="false"
            :width="350"
        >
            <el-table :data="filmInAddForm" style="width: 100%" stripe >
                <el-table-column label="进料日期" width="180" >
                    <template #default="scope">
                        <el-date-picker 
                            v-model="scope.row.inDate" 
                            type="date" 
                            placeholder="请选择进料日期" 
                            value-format="YYYY-MM-DD"
                            clearable
                            style="width: 150px"
                        >
                        </el-date-picker>
                    </template>
                </el-table-column>
                <el-table-column label="膜类型" width="130" >
                    <template #default="scope">
                        <el-select v-model="scope.row.filmId" placeholder="请选择膜类型" clearable>
                            <el-option 
                                v-for="film in filmList" 
                                :key="film.id" 
                                :value="film.id" 
                                :label="film.name" 
                            />
                        </el-select>
                    </template>
                </el-table-column>
                <el-table-column label="厚度(μm)" width="120" >
                    <template #default="scope">
                        <el-select v-model="scope.row.thickness" placeholder="请输入厚度" clearable allow-create filterable>
                            <el-option label="10" value="10" />
                            <el-option label="12" value="12" />
                        </el-select>
                    </template>
                </el-table-column>
                <el-table-column label="规格(cm)" width="120" >
                    <template #default="scope">
                        <el-input 
                            v-model="scope.row.spec" 
                            placeholder="请输入规格" 
                            type="number"
                            clearable
                        />
                    </template>
                </el-table-column>
                <el-table-column label="重量(kg)" width="120" >
                    <template #default="scope">
                        <el-input 
                            v-model="scope.row.weight" 
                            placeholder="请输入重量" 
                            type="number"
                            clearable
                            @input="calcFilmInAmount(scope.row)"
                        />
                    </template>
                </el-table-column>
                <el-table-column label="单价(元/kg)" width="120" >
                    <template #default="scope">
                        <el-input 
                            v-model="scope.row.unitPrice" 
                            placeholder="请输入单价" 
                            type="number"
                            clearable
                            @input="calcFilmInAmount(scope.row)"
                        />
                    </template>
                </el-table-column>
                <el-table-column label="金额(元)" width="120" >
                    <template #default="scope">
                        <el-input 
                            v-model="scope.row.amount" 
                            placeholder="请输入金额" 
                            type="number"
                            clearable
                            disabled
                        />
                    </template>
                </el-table-column>
                <el-table-column label="备注" width="180" >
                    <template #default="scope">
                        <el-input 
                            v-model="scope.row.remark" 
                            placeholder="请输入备注" 
                            type="textarea"
                            clearable
                        />
                    </template>
                </el-table-column>
                <el-table-column label="操作" >
                    <template #default="scope">
                        <el-button 
                            @click="filmInAddForm.splice(scope.$index, 1)"
                            type="danger"
                            icon="Delete"
                            size="small"
                            :disabled="filmInAddForm.length <= 1"
                        />
                    </template>
                </el-table-column>
            </el-table>
            
            <template #footer>
                <el-button @click="filmInAddDialogVisible = false">取消</el-button>
                <el-button type="success" @click="filmInAddDialogAddRow">新增一行</el-button>
                <el-button type="primary" @click="handleSubmitFilmIn">确认提交</el-button>
            </template>
        </ZoomDialog>
        <!-- 膜用料添加/修改弹窗 -->
        <ZoomDialog
            v-model:visible="filmUseDialogVisible"
            :title="filmUseDialogTitle"
            :source-rect="filmUseDialogSourceRect"
            :close-on-mask="false"
            :width="350"
        >
            <el-form label-width="70px" :rules="filmUseFormRules" :model="filmUseForm" ref="filmUseFormRef">
                <el-form-item label="膜名" prop="filmId">
                    <el-select v-model="filmUseForm.filmId" placeholder="请选择膜名" style="width: 100%" filterable>
                        <el-option
                            v-for="item in filmList"
                            :key="item.id"
                            :label="item.name"
                            :value="item.id"
                            clearable
                        />
                    </el-select>
                </el-form-item>
                <el-form-item label="月份" prop="month">
                    <el-date-picker 
                        v-model="filmUseForm.month" 
                        type="month" 
                        placeholder="请选择日期"
                        value-format="YYYY-MM-01"
                        style="width: 100%"
                    />
                </el-form-item>
                <el-form-item label="单价" prop="unitPrice">
                    <el-input
                        v-model="filmUseForm.unitPrice" 
                        placeholder="请输入单价" 
                        type="number"
                        clearable
                        step="0.01"
                        min="0"
                        @input="calcUseAmount(filmUseForm)"
                    >
                        <template #append>元/m²</template>
                    </el-input>
                </el-form-item>
                <el-form-item label="数量" prop="quantity">
                    <el-input
                        v-model="filmUseForm.quantity" 
                        placeholder="请输入数量" 
                        type="number"
                        clearable
                        step="1"
                        min="0"
                        @input="calcUseAmount(filmUseForm)"
                    >
                        <template #append>m²</template>
                    </el-input>
                </el-form-item>
                <el-form-item label="金额" prop="quantity">
                    <el-input
                        v-model="filmUseForm.amount" 
                        placeholder="请输入金额" 
                        type="number"
                        clearable
                        disabled
                    >
                        <template #append>元</template>
                    </el-input>
                </el-form-item>
                <el-form-item label="备注" prop="remark">
                    <el-input v-model="filmUseForm.remark" placeholder="请输入备注" type="textarea" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="filmUseDialogVisible = false">取消</el-button>
                <el-button ref="filmUseDelBtnRef" type="danger" @click="handleDeleteFilmUse" v-if="filmUseForm.id">删除</el-button>
                <el-button type="primary" @click="handleSubmitFilmUse(filmUseFormRef)">确认提交</el-button>
            </template>
        </ZoomDialog>
        <!-- 膜用料计算弹窗 -->
        <ZoomDialog
            v-model:visible="filmUseCalcDialogVisible"
            title="膜用料计算"
            :source-rect="filmUseCalcDialogSourceRect"
            :close-on-mask="false"
            width="350"
        >
            <el-form ref="filmUseCalcFormRef" :model="filmUseCalcForm" label-width="auto"> 
                <el-form-item label="月份" prop="month">
                    <el-date-picker 
                        v-model="filmUseCalcForm.month" 
                        type="month" 
                        placeholder="请选择月份"
                        value-format="YYYY-MM"
                    />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="filmUseCalcDialogVisible = false">取消</el-button>
                <el-button ref="filmUseCalcBtnRef" type="success" @click="handleSubmitFilmUseCalc(filmUseCalcForm.month)">计算</el-button>
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
.film-manage-list {
  max-height: 400px;
  overflow-y: auto;
}
.film-manage-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #eee;
}
.film-remark {
  color: #999;
  font-size: 12px;
  margin: 0 10px;
  flex: 1;
}
</style>