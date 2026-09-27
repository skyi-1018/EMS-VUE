<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ROLE } from '@/utils/role' 
import { getUpdateLogList, addUpdateLog } from '@/api/update-log'
import { getElementRect, defaultRect,  } from '@/utils/zoom'
import ZoomDialog from '@/components/ZoomDialog.vue'
import { ElMessage } from 'element-plus'

const activeNames = ref('')
const addBtnRef = ref(null)
const addFormRef = ref(null)
const updateLogList = ref([])

const addDialogVisible = ref(false)
const addSourceRect = reactive({ x: 0, y: 0, width: 200, height: 100 })

const addForm = ref({
    version: '',
    updateDate: '',
    updateContents: ['']
})

// 清空表单
const clearAddForm = () => {
    addForm.value.version = ''
    addForm.value.updateDate = ''
    addForm.value.updateContents = ['']
}

// 打开添加日志弹窗
const openAddDialog = () => {
    clearAddForm()
    const rect = getElementRect(addBtnRef.value)
    Object.assign(addSourceRect, rect || defaultRect(240, 120))
    addDialogVisible.value = true
}

// 新增一行
const handleAddRowBtn = () => {
    addForm.value.updateContents.push('')
}

const handleAddBtn = async (formEl) => {
    if (!formEl) return
    try {
        await formEl.validate()
        doAddUpdateLog()
    } catch (err) {
        return
    }  
}

// 网络请求：查询更新日志List
const loadUpdateLogList = async () => {
    const res = await getUpdateLogList()
    updateLogList.value = res.data
}

// 网络请求：添加更新日志
const doAddUpdateLog = async () => {
    await addUpdateLog(addForm.value)
    ElMessage.success('添加成功')
    addDialogVisible.value = false
    loadUpdateLogList()
}

onMounted(() => {
    loadUpdateLogList()
})
</script>

<template>
    <div class="main-page">
        <div class="page-header">
            <h1>关于</h1>
            <div class="header-toolbar">
                <el-button ref="addBtnRef" type="primary" @click="openAddDialog" v-permission="ROLE.ADMIN">添加更新日志</el-button>
            </div>
        </div>
        <div class="page-content">
            <el-card class="info-card">
                <template #header>
                    <div class="card-header">
                        <span>关于企业管理系统</span>
                    </div>
                </template>
                <p>版本号：V1.3</p>
                <p>制作人：一个人</p>
                <p>使用过程中出现问题，请及时记录出错时间并联系制作人</p>
            </el-card>
            <el-card>
                <template #header>
                    <div class="card-header">
                        <span>更新日志</span>
                    </div>
                </template>
                <el-collapse v-model="activeNames" accordion>
                    <el-collapse-item 
                        v-for="updateLog in updateLogList"
                        :key="updateLog.version"
                        :title="updateLog.version + ' - ' + updateLog.updateDate"
                        :name="updateLog.version"   
                    >
                        <div 
                            v-for="(updateContent, index) in updateLog.updateContents"
                            :key="index" 
                            class="log-item"
                        >
                            {{ updateContent }}
                        </div>
                    </el-collapse-item>
                    
                </el-collapse>
            </el-card>
            
        </div>
        <ZoomDialog
            v-model:visible="addDialogVisible"
            title="添加更新日志"
            width="600px"
            :close-on-mask="false"
            :source-rect="addSourceRect"
        >
            <el-form ref="addFormRef" :model="addForm" label-width="90px">
                <el-form-item 
                    label="版本号"
                    prop="version"
                    :rules="[
                        {
                            required: true,
                            message: '请输入版本号',
                            trigger: 'blur'
                        }
                    ]"
                >
                    <el-input v-model="addForm.version" placeholder="请输入版本号" />
                </el-form-item>
                <el-form-item 
                    label="更新日期" 
                    prop="updateDate"
                    :rules="[
                        {
                            required: true,
                            message: '请选择日期',
                            trigger: 'blur'
                        }
                    ]"
                >
                    <el-date-picker 
                        v-model="addForm.updateDate" 
                        type="date" 
                        placeholder="请选择日期" 
                        value-format="YYYY-MM-DD"
                        clearable
                        style="width: 100%;"
                    />
                </el-form-item>
                <el-form-item 
                    v-for="(updateContent, index) in addForm.updateContents" 
                    :key="index"
                    :label="'更新内容' + (index + 1)"
                    :rules="[
                        {
                            required: true,
                            message: '请输入更新内容',
                            trigger: 'blur'
                        }
                    ]"
                >
                    <div class="row-item">
                        <el-input v-model="addForm.updateContents[index]" placeholder="请输入更新内容" />
                        <el-button 
                            @click="addForm.updateContents.splice(index, 1)" 
                            type="danger"
                            icon="Delete"
                            size="small"
                            :disabled="addForm.updateContents.length <= 1"
                        />
                    </div>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="addDialogVisible = false">取消</el-button>
                <el-button type="success" @click="handleAddRowBtn">新增一行</el-button>
                <el-button type="primary" @click="handleAddBtn(addFormRef)">确定</el-button>
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
.page-content { 
    margin-top: 16px;
}
.info-card { 
    margin-bottom: 18px;
}
:deep(.el-collapse-item__header) {
    font-size: 17px !important;
    font-weight: 700 !important;
    padding-left: 10px !important;
    color: #1890FF
}
.log-item {
  position: relative;
  padding-left: 18px;   /* 整体缩进 */
  line-height: 1.8;
  font-size: 15px;
  color: #444;
}
.log-item::before {
  content: "·";  /* 前面的圆点 */
  position: absolute;
  left: 4px;
  top: 0;
  color: #666;
}
.row-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
}
</style>