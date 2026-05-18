<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content">
      <div class="modal-header">{{ isEdit ? 'Редактирование пользователя' : 'Новый пользователь' }}</div>
      <form @submit.prevent="save">
        <div class="form-group">
          <label>Логин *</label>
          <input v-model="form.login" required />
        </div>
        <div class="form-group">
          <label>Пароль *</label>
          <input type="password" v-model="form.password" :required="!isEdit" />
          <small v-if="isEdit">Оставьте пустым, если не хотите менять</small>
        </div>
        <div class="form-group">
          <label>ФИО *</label>
          <input v-model="form.full_name" required />
        </div>
        <div class="form-group">
          <label>Роль *</label>
          <select v-model="form.role_id" required>
            <option v-for="role in roles" :key="role.role_id" :value="role.role_id">{{ role.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>Статус</label>
          <select v-model="form.is_active">
            <option :value="true">Активен</option>
            <option :value="false">Заблокирован</option>
          </select>
        </div>
        <div v-if="error" class="error-text">{{ error }}</div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="close">Отмена</button>
          <button type="submit" class="btn btn-primary">Сохранить</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useUsersStore } from '../stores/usersStore';

const store = useUsersStore();
const visible = ref(false);
const isEdit = ref(false);
const editId = ref<string | null>(null);
const error = ref('');
const roles = ref<any[]>([]);

const form = reactive({
  login: '',
  password: '',
  full_name: '',
  role_id: '',
  is_active: true,
});

async function loadRoles() {
  await store.fetchRoles();
  roles.value = store.roles;
}

function open(user?: any) {
  loadRoles();
  if (user) {
    isEdit.value = true;
    editId.value = user.user_id;
    form.login = user.login;
    form.full_name = user.full_name;
    form.role_id = user.role_id;
    form.is_active = user.is_active;
    form.password = ''; // очищаем пароль при редактировании
  } else {
    reset();
  }
  visible.value = true;
}

function reset() {
  isEdit.value = false;
  editId.value = null;
  form.login = '';
  form.password = '';
  form.full_name = '';
  form.role_id = roles.value[0]?.role_id || '';
  form.is_active = true;
  error.value = '';
}

function close() {
  visible.value = false;
}

async function save() {
  try {
    const data: any = {
      login: form.login,
      full_name: form.full_name,
      role_id: form.role_id,
      is_active: form.is_active,
    };
    if (form.password) data.password = form.password;

    if (isEdit.value && editId.value) {
      await store.updateUser(editId.value, data);
    } else {
      await store.createUser(data);
    }
    close();
    window.dispatchEvent(new Event('user-saved'));
  } catch (err: any) {
    error.value = err.message;
  }
}

defineExpose({ open });
</script>