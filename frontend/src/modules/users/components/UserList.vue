<template>
  <div class="card">
    <div class="header">
      <h2>Пользователи</h2>
      <button class="btn btn-primary" @click="openForm">+ Добавить пользователя</button>
    </div>

    <div v-if="store.isLoading">Загрузка...</div>
    <div v-else-if="store.error" class="error">{{ store.error }}</div>
    <table v-else class="data-table">
      <thead>
        <tr>
          <th>Логин</th>
          <th>ФИО</th>
          <th>Роль</th>
          <th>Статус</th>
          <th>Действия</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in store.users" :key="user.user_id">
          <td>{{ user.login }}</td>
          <td>{{ user.full_name }}</td>
          <td>{{ user.role_name }}</td>
          <td>{{ user.is_active ? 'Активен' : 'Заблокирован' }}</td>
          <td>
            <button class="btn-sm btn-secondary" @click="editUser(user)">✏️</button>
            <button class="btn-sm btn-danger" @click="deleteUser(user.user_id)">🗑️</button>
          </td>
        </tr>
      </tbody>
    </table>

    <UserForm ref="formRef" @saved="refresh" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useUsersStore } from '../stores/usersStore';
import UserForm from './UserForm.vue';

const store = useUsersStore();
const formRef = ref();

async function refresh() {
  await store.fetchUsers();
}

function openForm() {
  formRef.value?.open();
}

function editUser(user: any) {
  formRef.value?.open(user);
}

async function deleteUser(id: string) {
  if (confirm('Удалить пользователя?')) {
    await store.deleteUser(id);
  }
}

onMounted(() => {
  store.fetchUsers();
  store.fetchRoles();
});
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}
</style>