<template>
  <div class="login-container">
    <div class="login-card">
      <h2>Вход в систему</h2>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>Логин</label>
          <input 
            v-model="login" 
            type="text" 
            required 
            class="form-control" 
            :class="{ 'is-invalid': loginError }"
            :disabled="isLoading"
          />
        </div>
        <div class="form-group">
          <label>Пароль</label>
          <input 
            v-model="password" 
            type="password" 
            required 
            class="form-control"
            :class="{ 'is-invalid': loginError }"
            :disabled="isLoading"
          />
        </div>
        
        <!-- Сообщение об ошибке прямо на форме -->
        <div v-if="loginError" class="error-message">
          ❌ {{ loginError }}
        </div>
        
        <button type="submit" :disabled="isLoading" class="btn btn-primary btn-block">
          {{ isLoading ? 'Вход...' : 'Войти' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { showToast } from '@/utils/toast';

const router = useRouter();
const authStore = useAuthStore();
const login = ref('');
const password = ref('');
const isLoading = ref(false);
const loginError = ref('');

async function handleLogin() {
  if (isLoading.value) return;
  
  loginError.value = '';
  
  if (!login.value.trim()) {
    loginError.value = 'Введите логин';
    showToast('Введите логин', 'error');
    return;
  }
  if (!password.value) {
    loginError.value = 'Введите пароль';
    showToast('Введите пароль', 'error');
    return;
  }

  isLoading.value = true;
  
  try {
    const success = await authStore.login(login.value, password.value);
    
    if (success) {
      showToast('Добро пожаловать!', 'success');
      setTimeout(() => {
        router.push('/');
      }, 500);
    } else {
      const errorMsg = authStore.error || 'Неверный логин или пароль';
      loginError.value = errorMsg;
      showToast(errorMsg, 'error');
    }
  } catch (err: any) {
    loginError.value = 'Ошибка подключения к серверу';
    showToast('Ошибка подключения к серверу', 'error');
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: #e9ecef;
}

.login-card {
  background: white;
  padding: 32px;
  border-radius: 8px;
  width: 360px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.login-card h2 {
  text-align: center;
  margin-bottom: 24px;
  color: #2c3e50;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #2c3e50;
}

.form-control {
  width: 100%;
  padding: 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: #2c5f8a;
}

.form-control.is-invalid {
  border-color: #c0392b;
}

.form-control:disabled {
  background-color: #e9ecef;
  cursor: not-allowed;
}

.error-message {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #c0392b;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
  font-size: 14px;
  text-align: center;
}

.btn-block {
  width: 100%;
}

.btn-primary {
  background-color: #2c5f8a;
  color: white;
  border: none;
  padding: 10px;
  font-size: 16px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background-color: #1e4566;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>