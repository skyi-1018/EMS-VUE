<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElButton, ElInput, ElMessage } from 'element-plus';
import CommonCard from '@/components/CommonCard.vue';
import ZoomDialog from '@/components/ZoomDialog.vue'
import { getElementRect, defaultRect, rectFromEvent } from '@/utils/zoom'
import { getCustomerList, deleteCustomerById, addCustomer, updateCustomer } from '@/api/customers.js'
import { getProcessList, addProcess, updateProcess, deleteProcessById } from '@/api/processes.js'
import ConfirmDialog from '@/components/ConfirmDialog.vue'


const cardRefs = {}
const input = ref('')


const processList = ref([])
const customerList = ref([])

const isAdd = ref(true)
const loading = ref(false)

const newProcess = ref({ name: '', remark: '' })
const editProcessForm = ref({ id: '', name: '', remark: '' })
const customerForm = ref({
    id: '',
    name: '',
    contactPerson: '',
    phone: '',
    address: '',
    unitPriceMap: {}
})


const customerDialogVisible = ref(false)
const processDialogVisible = ref(false)
const editProcessDialogVisible = ref(false)

const addBtnRef = ref(null)
const processBtnRef = ref(null)
const deleteBtnRef = ref(null)
const confirmDialogRef = ref(null)

const customerSourceRect = reactive({ x: 0, y: 0, width: 240, height: 120 })
const processSourceRect = reactive({ x: 0, y: 0, width: 240, height: 120 })
const editProcessSourceRect = reactive({ x: 0, y: 0, width: 200, height: 100 })

// 设置卡片引用
const setCardRef = (id, el) => {
    if (el) cardRefs[id] = el
}

// 打开新增客户对话框
const openProcessDialog = () => {
    const rect = getElementRect(processBtnRef.value)
    Object.assign(processSourceRect, rect || defaultRect(240, 120))
    processDialogVisible.value = true
}

// 打开添加客户对话框
const openAddDialog = () => {
    isAdd.value = true
    customerForm.value = {
        id: '',
        name: '',
        contactPerson: '',
        phone: '',
        address: '',
        unitPriceMap: buildUnitPriceMap()
    }
    const rect = getElementRect(addBtnRef.value)
    Object.assign(customerSourceRect, rect || defaultRect(240, 120))
    customerDialogVisible.value = true
}

// 打开卡片
const handleRowClick = async (item, event) => {
    isAdd.value = false
    customerForm.value = {
        id: item.id,
        name: item.name,
        contactPerson: item.contactPerson,
        phone: item.phone,
        address: item.address,
        unitPriceMap: buildUnitPriceMap(item.unitPriceMap || {})
    }

    const cardEl = cardRefs[item.id]
    const rect = cardEl && cardEl.getBoundingClientRect()
        ? cardEl.getBoundingClientRect()
        : event.currentTarget.getBoundingClientRect()

    customerSourceRect.x = rect.left
    customerSourceRect.y = rect.top
    customerSourceRect.width = rect.width
    customerSourceRect.height = rect.height

    customerDialogVisible.value = true
}

// 构建单价信息
const buildUnitPriceMap = (existion = {}) => {
    const map = {}
    processList.value.forEach(process => {
        const old = existion[process.id] || {}
        map[process.id] = {
            realUnitPrice: old.realUnitPrice || null,
            fakeUnitPrice: old.fakeUnitPrice || null
        }
    })
    return map
}

// 清空输入框
const clearBtn = () => {
    input.value = ''
    loadCustomerList()
}

// 删除按钮点击
const handleDelete = (name) => {
    const rect = getElementRect(deleteBtnRef.value)
    confirmDialogRef.value.open({
        message: `确定删除该客户"${name}"吗？`,
        sourceRect: rect || defaultRect(200, 100),
        onConfirm: doDeleteCustomer
    })
}

// 工艺添加按钮点击
const handleAddProcess = async () => {
    if (!newProcess.value.name){
        ElMessage.warning('工艺名称不得为空')
        return
    }
    await addProcess(newProcess.value)
    ElMessage.success('添加成功')
    newProcess.value = { name: '', remark: '' }
    loadProcessList()

}

// 工艺管理内编辑按钮点击
const handleEditProcess = (process, event) => {
    editProcessForm.value = { ...process  }
    const rect = rectFromEvent(event, 200, 100)
    Object.assign(editProcessSourceRect, rect)
    editProcessDialogVisible.value = true
}

// 工艺管理内删除按钮点击
const handleDeleteProcess = (process, event) => { 
    const rect = rectFromEvent(event)
    confirmDialogRef.value.open({
        message: `确定删除工艺"${process.name}"吗？`,
        sourceRect: rect,
        onConfirm: () => doDeleteProcessById(process.id)
    })
}

// 网络请求：根据id删除工艺
const doDeleteProcessById = async (id) => {
    await deleteProcessById(id)
    loadProcessList()
    ElMessage.success('删除成功')
}

// 网络请求：根据id删除客户
const doDeleteCustomer = async () => {
    await deleteCustomerById(customerForm.value.id)
    loadCustomerList()
    customerDialogVisible.value = false
    ElMessage.success('删除成功')

}

// 网络请求：加载客户列表
const loadCustomerList = async () => {
    try {
        loading.value = true
        const res = await getCustomerList(input.value)
        customerList.value = res.data
    } finally {
        loading.value = false
    }
}

// 网络请求：加载所有工艺列表
const loadProcessList = async () => {
    const res = await getProcessList()
    processList.value = res.data
    
}

// 网络请求：添加客户
const submitForm = async () => { 
    if(isAdd.value){
        await addCustomer(customerForm.value)
        ElMessage.success('添加成功')
    } else {
        await updateCustomer(customerForm.value)
        ElMessage.success('修改成功')
    }
    customerDialogVisible.value = false
    await loadCustomerList()

}

// 网络请求：提交编辑工艺
const doEditProcess = async () => {
    await updateProcess(editProcessForm.value)
    ElMessage.success('修改成功')
    editProcessDialogVisible.value = false
    loadProcessList()

}

onMounted(() => { 
    loadCustomerList()
    loadProcessList()
})
</script>

<template>
    <div class="main-page" ref="pageRef">
        <div class="page-header">
            <h1>客户管理</h1>
            <div>
                <el-button ref="processBtnRef" @click="openProcessDialog">工艺管理</el-button>
                <el-button ref="addBtnRef" type="primary" @click="openAddDialog">新增客户</el-button>
            </div>
        </div>
        <div class="search-bar">
            <el-input v-model="input" placeholder="请输入客户名" clearable style="width: 200px" @change="loadCustomerList"/>
            <el-button @click="clearBtn">清空</el-button>
        </div>
        <div class="card-list">
            <CommonCard
                v-for="item in customerList"
                :key="item.id"
                :title="item.name"
                :info-list="[
                    { label: '联系人', value: item.contactPerson },
                    { label: '电话', value: item.phone },
                    { label: '地址', value: item.address }
                ]"
                :card-ref="el => setCardRef(item.id, el)"
                @click="handleRowClick(item, $event)"
            >
                <!-- 插槽：自定义区域，放单价信息 -->
                 <div class="price-section">
                    <div class="price-title">单价信息</div>
                    <div class="price-grid">
                        <div
                            v-for="process in processList"
                            :key="process.id"
                            class="price-item"
                        >
                            <label>{{ process.name }}</label>
                            <div class="price-value">{{ item.unitPriceMap?.[process.id]?.realUnitPrice || '-' }}</div>
                        </div>
                    </div>
                 </div>
            </CommonCard>
        </div>
        <ZoomDialog
            v-model:visible="customerDialogVisible"
            title="客户信息"
            :source-rect="customerSourceRect"
            :close-on-mask="false"
        > 
            <el-form label-width="110px">
                <el-form-item label="客户名称">
                    <el-input v-model="customerForm.name" placeholder="请输入客户名" />
                </el-form-item>
                <el-form-item label="客户联系人">
                    <el-input v-model="customerForm.contactPerson" placeholder="请输入联系人" />
                </el-form-item>
                <el-form-item label="联系电话">
                    <el-input v-model="customerForm.phone" placeholder="请输入电话" />
                </el-form-item>
                <el-form-item label="客户地址">
                    <el-input v-model="customerForm.address" placeholder="请输入地址" />
                </el-form-item>

                <div class="form-price-title">单价信息（真价/假价）</div>
                <div class="price-form-grid">
                    <div
                        v-for="process in processList"
                        :key="process.id"
                        class="price-form-row"
                    >
                        <el-form-item :label="process.name">
                            <div class="double-input">
                                <el-input-number 
                                    v-model="customerForm.unitPriceMap[process.id].realUnitPrice" 
                                    :min="0" 
                                    :step="0.001"
                                    placeholder="真价"
                                    controls-position="right"
                                />
                                <el-input-number 
                                    v-model="customerForm.unitPriceMap[process.id].fakeUnitPrice" 
                                    :min="0" 
                                    :step="0.001"
                                    placeholder="假价"
                                    controls-position="right"
                                />
                            </div>
                        </el-form-item>
                    </div>
                </div>
            </el-form>
            <template #footer>
                <el-button @click="customerDialogVisible = false">取消</el-button>
                <el-button ref="deleteBtnRef" v-if="customerForm.id" type="danger" @click="handleDelete(customerForm.name)">删除</el-button>
                <el-button type="primary" @click="submitForm">确认保存</el-button>
            </template>
        </ZoomDialog>

        <ZoomDialog
            v-model:visible="processDialogVisible"
            title="工艺管理"
            size="sm"
            :source-rect="processSourceRect"
        >
            <div class="process-manage-list">
                <div 
                    v-for="process in processList"
                    :key="process.id"
                    class="process-manage-item"
                >
                    <span>{{ process.name }}</span>
                    <span class="process-remark">{{ process.remark }}</span>
                    <div>
                        <el-button size="small" type="primary" @click="handleEditProcess(process, $event)">编辑</el-button>
                        <el-button size="small" type="danger" @click="handleDeleteProcess(process, $event)">删除</el-button>
                    </div>
                </div>
            </div>
            <div style="margin-top: 20px; display: flex; gap: 10px;">
                <el-input v-model="newProcess.name" placeholder="请输入工艺名称" />
                <el-input v-model="newProcess.remark" placeholder="请输入备注" />
                <el-button type="primary" @click="handleAddProcess">添加</el-button>
            </div>
            <template #footer>
                <el-button @click="processDialogVisible = false">取消</el-button>
            </template>
        </ZoomDialog>

        <ZoomDialog
            v-model:visible="editProcessDialogVisible"
            title="编辑工艺"
            size="xs"
            :source-rect="editProcessSourceRect"
        > 
            <el-form>
                <el-form-item label="工艺名称">
                    <el-input v-model="editProcessForm.name" placeholder="请输入工艺" />
                </el-form-item>
                <el-form-item label="备注">
                    <el-input v-model="editProcessForm.remark" placeholder="请输入备注" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="editProcessDialogVisible = false">取消</el-button>
                <el-button type="primary" @click="doEditProcess">保存</el-button>
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

.price-section {
  margin-top: 12px;
}
.price-title {
  font-size: 15px;
  color: #666;
  margin-bottom:8px;
}
.price-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.price-item {
  display: flex;
  justify-content: space-between;
  font-size:14px;
}
.price-item label {
  color:#888;
}
.price-value {
  color:#1890ff;
}
.process-manage-list {
  max-height: 400px;
  overflow-y: auto;
}
.process-manage-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #eee;
}
.process-remark {
  color: #999;
  font-size: 12px;
  margin: 0 10px;
  flex: 1;
}
</style>