import { useUserStore } from '@/store/user'
import { ROLE } from '@/utils/role'


export function hasPermission(binding) {
    const allowedRoles = Array.isArray(binding) ? binding : [binding]

    const userStore = useUserStore()
    const role = userStore.userInfo?.role

    return allowedRoles.includes(role)
}