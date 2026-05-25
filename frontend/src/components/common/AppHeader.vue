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
      <div class="user-details">
        <span class="user-name">{{ userName }}</span>
        <span class="user-role">{{ userRoleText }}</span>
      </div>
      <div class="action-buttons">
        <button class="btn btn-sm btn-secondary" @click="confirmLogout">Выйти</button>
        <button class="btn-about" @click="showAboutModal" title="О программе">!</button>
      </div>
    </div>
    
    <ConfirmDialog ref="confirmDialog" />
    
    <!-- Модальное окно "О программе" -->
    <div class="modal-overlay" v-if="aboutModalVisible" @click.self="aboutModalVisible = false">
      <div class="modal-content about-modal">
        <div class="modal-header">
          <span>О программе</span>
          <button class="modal-close" @click="aboutModalVisible = false">×</button>
        </div>
        <div class="about-content">
          <div class="about-logo">
            <img src="@/assets/logo.png" alt="Логотип" class="about-logo-img" />
            <h2>СКЦ НИИАР</h2>
            <p class="about-subtitle">Система учёта и технического обслуживания оборудования</p>
          </div>
          
          <div class="about-version">
            <p>Версия: 1.0.0</p>
          </div>

          <div class="about-features">
            <h3>Функциональные возможности:</h3>
            <div class="features-list">
              <div class="feature-item">
                <span class="feature-icon">🏭</span>
                <span><strong>Управление оборудованием</strong> – полный учёт агрегатов и блоков, история перемещений</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">📊</span>
                <span><strong>Средства измерения (СИ)</strong> – учёт поверок, контроль сроков, цветовая индикация просрочек, автоматический расчёт следующей поверки</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">⚡</span>
                <span><strong>Ресурсы и параметры</strong> – контроль остаточного ресурса, графики изменения параметров, пороговые значения</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">🔧</span>
                <span><strong>Техническое обслуживание</strong> – планирование ТО, генерация мероприятий, контроль просрочек</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">📁</span>
                <span><strong>Подсистемы</strong> – иерархическая структура, привязка всех модулей к подсистемам, перемещение объектов</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">📎</span>
                <span><strong>Экспорт данных</strong> – выгрузка отчётов в Excel и Word с учётом выбранных колонок и фильтров</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">👥</span>
                <span><strong>Разграничение доступа</strong> – три уровня прав: администратор, оператор, наблюдатель</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">⚙️</span>
                <span><strong>Настройка интерфейса</strong> – сохранение настроек в cookies, выбор отображаемых полей</span>
              </div>
            </div>
          </div>

          <div class="about-tech">
            <h3>Технологический стек:</h3>
            <div class="tech-badges">
              <span class="tech-badge">Vue 3</span>
              <span class="tech-badge">TypeScript</span>
              <span class="tech-badge">Pinia</span>
              <span class="tech-badge">Vite</span>
              <span class="tech-badge">Node.js</span>
              <span class="tech-badge">Express</span>
              <span class="tech-badge">PostgreSQL</span>
              <span class="tech-badge">Chart.js</span>
              <span class="tech-badge">SheetJS</span>
            </div>
          </div>

          <div class="about-developers">
            <h3>Разработчики:</h3>
            <p>Студенты ДИТИ НИЯУ МИФИ</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" @click="aboutModalVisible = false">Закрыть</button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import ConfirmDialog from './ConfirmDialog.vue'
import { showToast } from '@/utils/toast'

const router = useRouter()
const authStore = useAuthStore()
const confirmDialog = ref()
const aboutModalVisible = ref(false)
const userName = ref('')
const userLogin = ref('')
const userRole = ref('')

const getRoleName = (role: string): string => {
  const roles: Record<string, string> = {
    'admin': 'Администратор',
    'operator': 'Оператор',
    'observer': 'Наблюдатель'
  }
  return roles[role] || role
}

const userRoleText = computed(() => getRoleName(userRole.value))

const showAboutModal = () => {
  aboutModalVisible.value = true
}

onMounted(() => {
  const user = localStorage.getItem('user')
  if (user) {
    const parsed = JSON.parse(user)
    userName.value = parsed.full_name || parsed.name || parsed.login || 'Пользователь'
    userLogin.value = parsed.login || ''
    userRole.value = parsed.role || ''
  }
})

const isAdmin = computed(() => userRole.value === 'admin')

const goToHome = () => {
  router.push('/')
}

const confirmLogout = async () => {
  const confirmed = await confirmDialog.value?.show('Выход из системы', 'Вы уверены, что хотите выйти?')
  if (confirmed) {
    authStore.logout()
    showToast('До свидания!', 'success')
    setTimeout(() => {
      router.push('/login')
    }, 500)
  }
}
</script>

<style scoped>
.app-header {
  background: var(--primary-color);
  width: 100%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  gap: 15px;
  flex-wrap: wrap;
  min-height: var(--header-height);
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
  font-size: var(--font-size-large);
  color: var(--text-white);
}

.nav-menu {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.nav-menu a {
  color: var(--text-white);
  text-decoration: none;
  padding: 8px 12px;
  font-size: var(--font-size-base);
  border-radius: var(--border-radius-small);
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

.user-details {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.user-name {
  font-size: var(--font-size-base);
  color: var(--text-white);
  font-weight: 500;
}

.user-role {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
}

.action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn-about {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-about:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

/* Стили для модального окна "О программе" */
.about-modal {
  width: 600px;
  max-width: 90%;
}

.about-content {
  max-height: 65vh;
  overflow-y: auto;
  padding-right: 8px;
}

.about-logo {
  text-align: center;
  margin-bottom: 15px;
}

.about-logo-img {
  width: 60px;
  height: 60px;
  margin-bottom: 8px;
}

.about-logo h2 {
  color: var(--primary-color);
  margin: 0;
  font-size: 20px;
}

.about-subtitle {
  color: var(--text-muted);
  font-size: 13px;
  margin-top: 4px;
}

.about-version {
  text-align: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
}

.about-version p {
  color: var(--text-muted);
  font-size: 12px;
}

.about-features h3,
.about-tech h3,
.about-developers h3 {
  font-size: 16px;
  margin: 20px 0 12px 0;
  color: var(--primary-color);
}

.features-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.feature-item {
  display: flex;
  gap: 10px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.4;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.feature-item:hover {
  background: var(--primary-light);
  transform: translateX(4px);
}

.feature-icon {
  font-size: 20px;
  min-width: 32px;
  text-align: center;
}

.feature-item strong {
  color: var(--text-secondary);
}

.tech-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.tech-badge {
  background: var(--primary-light);
  color: var(--primary-color);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.tech-badge:hover {
  background: var(--primary-color);
  color: white;
  transform: translateY(-2px);
}

.about-developers {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid var(--border-color);
  text-align: center;
}

.about-developers p {
  margin: 5px 0;
  color: var(--text-secondary);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 20px;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-secondary);
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-muted);
  padding: 4px 8px;
  border-radius: var(--border-radius-small);
}

.modal-close:hover {
  background-color: var(--secondary-color);
  color: var(--text-secondary);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

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
    flex-wrap: wrap;
  }
  .user-details {
    align-items: center;
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
    font-size: var(--font-size-small);
  }
  .user-name {
    font-size: var(--font-size-small);
  }
  .user-role {
    font-size: 10px;
  }
  .feature-item {
    font-size: 12px;
  }
  .feature-icon {
    font-size: 18px;
    min-width: 28px;
  }
  .about-modal {
    width: 95%;
  }
}
</style>