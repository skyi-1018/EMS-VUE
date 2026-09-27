// @/router/index.js
import { createRouter, createWebHistory } from "vue-router"

import CustomerManage from "@/views/customer/CustomerManage.vue"
import Home from "@/views/home/Home.vue"
import OrderManage from "@/views/order/OrderManage.vue"
import PrepareOrderManage from "@/views/prepare-order/PrepareOrderManage.vue"
import QuickOrder from "@/views/quick/QuickOrder.vue"
import Print from "@/views/print/Print.vue"
import Login from "@/views/auth/Login.vue"
import Register from "@/views/auth/Register.vue"
import { ROLE } from "@/utils/role"
import { useUserStore } from "@/store/user"
import { ElMessage } from "element-plus"
import OperationLogPage from "@/views/operation-log/OperationLogPage.vue"
import StatisticalChart from "@/views/report/StatisticalChart.vue"
import About from "@/views/about/About.vue"

const routes = [
    {
        path: '/customer-manage',
        name: 'CustomerManage',
        component: CustomerManage,
        meta: { requireAuth: true, roles: [ROLE.ADMIN]}
    },
    {
        path: '/',
        name: 'Home',
        component: Home,
        meta: { requireAuth: true}
    },
    {
        path: '/order-manage',
        name: 'OrderManage',
        component: OrderManage,
        meta: { requireAuth: true}
    },
    {
        path: '/prepare-order-manage',
        name: 'PrepareOrderManage',
        component: PrepareOrderManage,
        meta: { requireAuth: true}
    },
    {
        path: '/quick-order',
        name: 'QuickOrder',
        component: QuickOrder,
        meta: { requireAuth: true}
    },
    {
        path: '/print-order',
        name: 'Print',
        component: Print,
        meta: { requireAuth: true}
    },
    {
        path: '/login',
        name: 'Login',
        component: Login,
        meta: { hideLayout: true}
    },
    {
        path: '/register',
        name: 'Register',
        component: Register,
        meta: { hideLayout: true}
    },
    {
        path: '/operation-log',
        name: 'OperationLog',
        component: OperationLogPage,
        meta: { requireAuth: true, roles: [ROLE.ADMIN]}
    },
    {
        path: '/statistical-chart',
        name: 'StatisticalChart',
        component: StatisticalChart,
        meta: { requireAuth: true, roles: [ROLE.ADMIN]}
    },
    {
        path: '/about',
        name: 'About',
        component: About,
        meta: { requireAuth: true}
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

router.beforeEach((to, from, next) => {
    const token = localStorage.getItem('token')
    const userStore = useUserStore()

    if(to.meta.requireAuth && !token) {
        next({ path: '/login', query: {redirect: to.fullPath}})
        return
    }
    if (to.path === '/login' && token) {
        next('/')
        return
    }
    if (to.meta.roles) {
        const role = userStore.userInfo?.role
        if (!to.meta.roles.includes(role)) {
            ElMessage.error('无权限访问')
            next('/')
            return
        }
    }
    next()
})

export default router