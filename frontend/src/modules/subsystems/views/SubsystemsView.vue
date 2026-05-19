<template>
  <div class="subsystems-view">
    <div class="sidebar">
      <SubsystemTree 
        @select-subsystem="onSelectSubsystem" 
        @select-content="onSelectContent" 
      />
    </div>
    <div class="main">
      <!-- Карточка подсистемы -->
      <SubsystemCard v-if="selectedType === 'subsystem' && selectedId" :key="selectedId" />
      
      <!-- Карточка СИ -->
      <SICardView 
        v-else-if="selectedType === 'si' && selectedId" 
        :id="selectedId" 
        :embedded="true" 
        :key="`si-${selectedId}`" 
      />
      
      <!-- Карточка оборудования -->
      <EquipmentCardView 
        v-else-if="selectedType === 'equipment' && selectedId" 
        :id="selectedId" 
        :embedded="true" 
        :key="`equipment-${selectedId}`" 
      />
      
      <!-- Карточка ресурса -->
      <ResourceCard 
        v-else-if="selectedType === 'resource' && selectedId" 
        :id="selectedId" 
        :embedded="true" 
        :key="`resource-${selectedId}`" 
      />
      
      <!-- Карточка плана ТО -->
      <MaintenancePlanView 
        v-else-if="selectedType === 'maintenance' && selectedId" 
        :id="selectedId" 
        :embedded="true" 
        :key="`maintenance-${selectedId}`" 
      />
      
      <!-- Пустое состояние -->
      <div v-else class="card empty-state">
        <p>Выберите подсистему или элемент из дерева</p>
        <div class="hints">
          <p>📁 Подсистемы → откроют карточку подсистемы</p>
          <p>📏 СИ → откроют карточку средства измерения</p>
          <p>🖥️ Оборудование → откроют карточку узла</p>
          <p>⚡ Ресурсы → откроют карточку ресурса</p>
          <p>🔧 Планы ТО → откроют карточку плана</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import SubsystemTree from '../components/SubsystemTree.vue';
import SubsystemCard from '../components/SubsystemCard.vue';
import SICardView from '@/modules/si/views/SICardView.vue';
import EquipmentCardView from '@/modules/equipment/views/EquipmentCardView.vue';
import ResourceCard from '@/modules/resources/components/ResourceCard.vue';
import MaintenancePlanView from '@/modules/maintenance/views/MaintenancePlanView.vue';

const selectedType = ref<string | null>(null);
const selectedId = ref<number | null>(null);

function onSelectSubsystem(id: number) {
  selectedType.value = 'subsystem';
  selectedId.value = id;
}

function onSelectContent(content: { type: string; id: number; name: string }) {
  selectedType.value = content.type;
  selectedId.value = content.id;
}
</script>

<style scoped>
.subsystems-view {
  display: flex;
  gap: 20px;
}
.sidebar {
  width: 350px;
  flex-shrink: 0;
}
.main {
  flex: 1;
}
.empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  color: #999;
}
.hints {
  margin-top: 20px;
  text-align: left;
}
.hints p {
  margin: 8px 0;
  font-size: 13px;
}
</style>