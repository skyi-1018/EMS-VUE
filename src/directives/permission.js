import { useUserStore } from '@/store/user'
import { ROLE } from '@/utils/role'

export default {
    mounted(el, binding) {
        const allowedRoles = Array.isArray(binding.value) ? binding.value : [binding.value]

        const userStore = useUserStore()
        const role = userStore.userInfo?.role

        if (!allowedRoles.includes(role)) {
            el.parentNode?.removeChild(el)
        }
    }
}