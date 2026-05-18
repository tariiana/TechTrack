<template>
  <header class="app-header">
    <div class="logo" @click="goToHome">
      <img src="@/assets/logo.png" alt="Логотип НИИАР" class="logo-icon" />
      <span class="logo-text">СКЦ НИИАР</span>
    </div>
    <nav class="nav-menu">
      <router-link to="/equipment">Оборудование</router-link>
      <router-link to="/si">Средства измерений</router-link>
      <router-link to="/resources">Ресурсы</router-link>
      <router-link to="/maintenance">Обслуживание</router-link>
      <router-link to="/subsystems">Подсистемы</router-link>
      <router-link v-if="isAdmin" to="/users">Пользователи</router-link>
    </nav>
    <div class="user-info">
      <span class="user-name">{{ userName }}</span>
      <button class="btn btn-sm btn-secondary" @click="logout">Выйти</button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const userName = ref('')
const userRole = ref('')

onMounted(() => {
  const user = localStorage.getItem('user')
  if (user) {
    const parsed = JSON.parse(user)
    userName.value = parsed.name || parsed.login
    userRole.value = parsed.role
  }
})

const isAdmin = computed(() => userRole.value === 'admin')

const goToHome = () => {
  router.push('/')
}

const logout = () => {
  localStorage.removeItem('user')
  router.push('/login')
}
</script>

<style scoped>
.app-header {
  background: #2c5f8a;
  width: 100%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  gap: 15px;
  flex-wrap: wrap;
  /* Убираем фиксированную высоту */
  min-height: 56px;
  height: auto;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.logo-icon {
  height: 32px;
  width: auto;
}

.logo-text {
  font-weight: bold;
  font-size: 18px;
  color: white;
}

.nav-menu {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.nav-menu a {
  color: white;
  text-decoration: none;
  padding: 8px 12px;
  font-size: 14px;
  border-radius: 4px;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.nav-menu a:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.nav-menu a.router-link-active {
  background-color: rgba(255, 255, 255, 0.2);
  font-weight: 500;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.user-name {
  font-size: 14px;
  color: white;
  opacity: 0.9;
  white-space: nowrap;
}

/* Адаптация для узких экранов */
@media (max-width: 900px) {
  .app-header {
    flex-direction: column;
    justify-content: center;
    padding: 12px 20px;
    gap: 12px;
  }

  .logo {
    width: 100%;
    justify-content: center;
  }

  .nav-menu {
    width: 100%;
    justify-content: center;
  }

  .user-info {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 600px) {
  .app-header {
    padding: 10px 16px;
  }

  .logo-text {
    font-size: 16px;
  }

  .logo-icon {
    height: 28px;
  }

  .nav-menu a {
    padding: 6px 10px;
    font-size: 12px;
  }

  .user-name {
    font-size: 12px;
  }

  .btn-sm {
    padding: 4px 8px;
    font-size: 11px;
  }
}

@media (max-width: 450px) {
  .nav-menu {
    gap: 6px;
  }

  .nav-menu a {
    padding: 5px 8px;
    font-size: 11px;
    white-space: normal;
    text-align: center;
  }
}
</style>
