<template>
  <div class="card">
    <div style="display: flex; justify-content: space-between; margin-bottom: 20px">
      <h2>Пользователи системы</h2>
      <button class="btn btn-primary" @click="openAddForm">+ Добавить пользователя</button>
    </div>

    <!-- Панель фильтров -->
    <div class="filter-panel">
      <div class="filter-row">
        <input
          v-model="filters.search"
          type="text"
          placeholder="Поиск по логину или ФИО..."
          class="form-control"
          style="width: 250px"
          @input="applyFilters"
        />
        <select v-model="filters.role_id" class="form-control" style="width: 180px" @change="applyFilters">
          <option value="">Все роли</option>
          <option v-for="role in store.roles" :key="role.role_id" :value="role.role_id">{{ role.name }}</option>
        </select>
        <select v-model="filters.is_active" class="form-control" style="width: 150px" @change="applyFilters">
          <option value="">Все статусы</option>
          <option value="true">Активен</option>
          <option value="false">Заблокирован</option>
        </select>
        <button class="btn btn-secondary" @click="resetFilters">Сбросить</button>
      </div>
    </div>

    <!-- Таблица пользователей с прокруткой -->
    <div class="table-scroll-container">
      <table class="data-table">
        <thead>
          <tr>
            <th @click="sortBy('login')">
              Логин
              <span class="sort-icon" v-if="sortField === 'login'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
            </th>
            <th @click="sortBy('full_name')">
              ФИО
              <span class="sort-icon" v-if="sortField === 'full_name'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
            </th>
            <th @click="sortBy('role_name')">
              Роль
              <span class="sort-icon" v-if="sortField === 'role_name'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
            </th>
            <th @click="sortBy('is_active')">
              Статус
              <span class="sort-icon" v-if="sortField === 'is_active'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
            </th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in filteredAndSortedUsers" :key="user.user_id">
            <td>{{ user.login }}</td>
            <td>{{ user.full_name }}</td>
            <td>{{ user.role_name }}</td>
            <td>
              <span :class="user.is_active ? 'status-active' : 'status-inactive'">
                {{ user.is_active ? 'Активен' : 'Заблокирован' }}
              </span>
            </td>
            <td>
              <button class="btn btn-sm btn-secondary" @click="editUser(user)">✏️</button>
              <button class="btn btn-sm btn-danger" @click="deleteUser(user.user_id)">🗑️</button>
            </td>
          </tr>
          <tr v-if="filteredAndSortedUsers.length === 0">
            <td colspan="5" class="empty-data">Нет пользователей</td>
          </tr>
        </tbody>
      </table>
    </div>

    <UserForm ref="formRef" @saved="refresh" />
    <ConfirmDialog ref="confirmDialog" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useUsersStore } from '../stores/usersStore';
import UserForm from './UserForm.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';

const store = useUsersStore();
const formRef = ref();
const confirmDialog = ref();

// Фильтры
const filters = ref({
  search: '',
  role_id: '',
  is_active: '',
});

// Сортировка
const sortField = ref<'login' | 'full_name' | 'role_name' | 'is_active'>('login');
const sortOrder = ref<'asc' | 'desc'>('asc');

function sortBy(field: 'login' | 'full_name' | 'role_name' | 'is_active') {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field;
    sortOrder.value = 'asc';
  }
}

const filteredAndSortedUsers = computed(() => {
  let list = [...store.users];

  // Фильтрация по поиску
  if (filters.value.search) {
    const search = filters.value.search.toLowerCase();
    list = list.filter(u =>
      u.login.toLowerCase().includes(search) ||
      u.full_name.toLowerCase().includes(search)
    );
  }

  // Фильтрация по роли
  if (filters.value.role_id) {
    list = list.filter(u => u.role_id === Number(filters.value.role_id));
  }

  // Фильтрация по статусу
  if (filters.value.is_active !== '') {
    const isActive = filters.value.is_active === 'true';
    list = list.filter(u => u.is_active === isActive);
  }

  // Сортировка
  list.sort((a, b) => {
    let valA = a[sortField.value];
    let valB = b[sortField.value];

    if (sortField.value === 'is_active') {
      valA = valA ? 1 : 0;
      valB = valB ? 1 : 0;
    }

    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return sortOrder.value === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder.value === 'asc' ? 1 : -1;
    return 0;
  });

  return list;
});

function applyFilters() {}
function resetFilters() {
  filters.value = { search: '', role_id: '', is_active: '' };
}

function openAddForm() {
  formRef.value?.open();
}

function editUser(user: any) {
  formRef.value?.open(user);
}

async function deleteUser(id: number) {
  const ok = await confirmDialog.value?.show('Удаление', 'Удалить пользователя?');
  if (ok) {
    await store.deleteUser(id);
  }
}

function refresh() {
  store.fetchUsers();
}

onMounted(() => {
  store.fetchUsers();
  store.fetchRoles();
});
</script>

<style scoped>
.filter-panel {
  background: #f8f9fa;
  border: 1px solid #e0e4e8;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}
.filter-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}
.sort-icon {
  margin-left: 5px;
  font-size: 12px;
  color: #2c5f8a;
}
.status-active {
  color: #27ae60;
  font-weight: 500;
}
.status-inactive {
  color: #c0392b;
  font-weight: 500;
}
.empty-data {
  text-align: center;
  color: #999;
  padding: 20px;
}

/* Контейнер для таблицы с прокруткой */
.table-scroll-container {
  width: 100%;
  overflow-x: auto;
  overflow-y: auto;
  max-height: 500px;
  border: 1px solid #e0e4e8;
  border-radius: 8px;
  background: white;
}

.table-scroll-container::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

.table-scroll-container::-webkit-scrollbar-track {
  background: #e0e4e8;
  border-radius: 6px;
}

.table-scroll-container::-webkit-scrollbar-thumb {
  background: #2c5f8a;
  border-radius: 6px;
  cursor: pointer;
}

.table-scroll-container::-webkit-scrollbar-thumb:hover {
  background: #1e4566;
}

/* Стили для таблицы внутри контейнера */
.table-scroll-container .data-table {
  min-width: 600px;
}
</style>