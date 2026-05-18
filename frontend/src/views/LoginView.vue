<template>
  <div class="login-container">
    <div class="login-card">
      <h2>Вход в систему</h2>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>Логин</label>
          <input v-model="login" type="text" required class="form-control" />
        </div>
        <div class="form-group">
          <label>Пароль</label>
          <input v-model="password" type="password" required class="form-control" />
        </div>
        <div v-if="authStore.error" class="error-text">{{ authStore.error }}</div>
        <button type="submit" :disabled="authStore.isLoading" class="btn btn-primary btn-block">
          {{ authStore.isLoading ? 'Вход...' : 'Войти' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';

const router = useRouter();
const authStore = useAuthStore();
const login = ref('');
const password = ref('');

async function handleLogin() {
  const success = await authStore.login(login.value, password.value);
  if (success) {
    router.push('/');
  }
}
</script>

<style scoped>
.login-container { display: flex; justify-content: center; align-items: center; height: 100vh; background: #e9ecef; }
.login-card { background: white; padding: 32px; border-radius: 8px; width: 360px; }
.form-group { margin-bottom: 15px; }
.form-control { width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius: 4px; }
.btn-block { width: 100%; }
.error-text { color: #c0392b; margin-bottom: 15px; }
</style>