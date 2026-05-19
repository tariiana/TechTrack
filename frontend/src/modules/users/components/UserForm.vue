<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content" style="width: 500px">
      <div class="modal-header">{{ isEdit ? 'Редактирование пользователя' : 'Добавление пользователя' }}</div>

      <div class="form-group">
        <label>Логин *</label>
        <input type="text" v-model="form.login" class="form-control" :class="{ 'invalid': errors.login }" />
        <span v-if="errors.login" class="error-text">{{ errors.login }}</span>
      </div>

      <div class="form-group">
        <label>Пароль *</label>
        <input type="password" v-model="form.password" class="form-control" :class="{ 'invalid': errors.password }" />
        <small v-if="isEdit" class="hint-text">Оставьте пустым, если не хотите менять пароль</small>
        <span v-if="errors.password" class="error-text">{{ errors.password }}</span>
      </div>

      <div class="form-group">
        <label>ФИО *</label>
        <input type="text" v-model="form.full_name" class="form-control" :class="{ 'invalid': errors.full_name }" />
        <span v-if="errors.full_name" class="error-text">{{ errors.full_name }}</span>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Роль *</label>
          <select v-model="form.role_id" class="form-control">
            <option v-for="role in store.roles" :key="role.role_id" :value="role.role_id">
              {{ role.name }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label>Статус</label>
          <select v-model="form.is_active" class="form-control">
            <option :value="true">Активен</option>
            <option :value="false">Заблокирован</option>
          </select>
        </div>
      </div>

      <div v-if="error" class="error-text">{{ error }}</div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="close">Отмена</button>
        <button class="btn btn-primary" @click="save">Сохранить</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useUsersStore } from '../stores/usersStore';

const store = useUsersStore();
const visible = ref(false);
const isEdit = ref(false);
const editId = ref<number | null>(null);
const error = ref('');

const errors = reactive({
  login: '',
  password: '',
  full_name: '',
});

const form = reactive({
  login: '',
  password: '',
  full_name: '',
  role_id: '',
  is_active: true,
});

function validate(): boolean {
  let isValid = true;
  errors.login = '';
  errors.password = '';
  errors.full_name = '';

  if (!form.login.trim()) {
    errors.login = 'Введите логин';
    isValid = false;
  }
  if (!isEdit.value && !form.password) {
    errors.password = 'Введите пароль';
    isValid = false;
  }
  if (!form.full_name.trim()) {
    errors.full_name = 'Введите ФИО';
    isValid = false;
  }

  return isValid;
}

async function loadRoles() {
  await store.fetchRoles();
  if (store.roles.length > 0 && !form.role_id) {
    form.role_id = store.roles[0]?.role_id || '';
  }
}

function open(user?: any) {
  reset();
  loadRoles();

  if (user) {
    isEdit.value = true;
    editId.value = user.user_id;
    form.login = user.login;
    form.full_name = user.full_name;
    form.role_id = user.role_id;
    form.is_active = user.is_active;
    form.password = '';
  }
  visible.value = true;
}

function reset() {
  isEdit.value = false;
  editId.value = null;
  form.login = '';
  form.password = '';
  form.full_name = '';
  form.role_id = '';
  form.is_active = true;
  error.value = '';
  errors.login = '';
  errors.password = '';
  errors.full_name = '';
}

function close() {
  visible.value = false;
}

async function save() {
  if (!validate()) return;

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
    error.value = err.message || 'Ошибка при сохранении пользователя';
  }
}

defineExpose({ open });
</script>

<style scoped>
.form-row {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
}
.form-row .form-group {
  flex: 1;
}
.hint-text {
  font-size: 11px;
  color: #6c757d;
  display: block;
  margin-top: 4px;
}
.invalid {
  border-color: #c0392b !important;
  background-color: #ffe0e0;
}
.error-text {
  color: #c0392b;
  font-size: 12px;
  margin-top: 4px;
  display: block;
}
</style>