import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import LoginView from '@/views/LoginView.vue';
import MainLayout from '@/layouts/MainLayout.vue';
import PlaceholderView from '@/views/PlaceholderView.vue';
import HomeView from '@/views/HomeView.vue';
import UsersView from '@/modules/users/views/UsersView.vue';

// Модуль СИ
import SIView from '@/modules/si/views/SIView.vue';
import SICardView from '@/modules/si/views/SICardView.vue';

// Модуль Оборудование
import EquipmentView from '@/modules/equipment/views/EquipmentView.vue';
import EquipmentCardView from '@/modules/equipment/views/EquipmentCardView.vue';

// Модуль Ресурсы
import ResourcesView from '@/modules/resources/views/ResourcesView.vue';
import ResourceCardView from '@/modules/resources/views/ResourceCardView.vue';

// Модуль Обслуживание
import MaintenanceView from '@/modules/maintenance/views/MaintenanceView.vue';
import MaintenancePlanView from '@/modules/maintenance/views/MaintenancePlanView.vue';

import SubsystemCard from '@/modules/subsystems/components/SubsystemCard.vue';
import SubsystemsView from '@/modules/subsystems/views/SubsystemsView.vue';
import PlanView from '@/modules/subsystems/views/PlanView.vue';



const routes = [
  {
    path: '/login',
    component: LoginView,
  },
  {
    path: '/',
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      // Модуль Пользователи
      { path: 'users', component: UsersView },
      // главная страница после авторизации
      { path: '', component: HomeView },
      // Модуль СИ
      { path: 'si', component: SIView },
      { path: 'si/:id', component: SICardView },
      // Модуль Оборудование
      { path: 'equipment', component: EquipmentView },
      { path: 'equipment/:id', component: EquipmentCardView },
      // Модуль Ресурсы
      { path: 'resources', component: ResourcesView },
      { path: 'resources/:id', component: ResourceCardView },
      // Модуль Обслуживание
      { path: 'maintenance', component: MaintenanceView },
      { path: 'maintenance/:id', component: MaintenancePlanView },
      { path: 'subsystems', component: SubsystemsView },
      { path: 'subsystems/:id', component: SubsystemsView }, // для карточки подсистемы
      { path: 'subsystems/plan/:id', component: PlanView },
      {
        path: 'subsystems',
        component: SubsystemsView,
        children: [{ path: ':id', component: SubsystemCard }],
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Защита маршрутов (требуется авторизация)
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  if (to.meta.requiresAuth && !authStore.user) {
    await authStore.fetchMe();
    if (!authStore.user) next('/login');
    else next();
  } else {
    next();
  }
});

export default router;