import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiFetch } from '@/api/client';

export const useSIStore = defineStore('si', () => {
  const instruments = ref<any[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const filterParams = ref({ search: '', status: '', verifier: '' });

  // computed для фильтрации (бэкенд сам фильтрует, но можно оставить для простоты)
  const filteredInstruments = computed(() => instruments.value);

  async function fetchInstruments() {
    isLoading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams();
      if (filterParams.value.search) params.append('search', filterParams.value.search);
      if (filterParams.value.status) params.append('status', filterParams.value.status);
      if (filterParams.value.verifier) params.append('verifier', filterParams.value.verifier);
      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await apiFetch(`/instruments${query}`);
      instruments.value = data;
    } catch (err: any) {
      error.value = err.message;
      console.error('fetchInstruments error:', err);
    } finally {
      isLoading.value = false;
    }
  }

  
  async function fetchInstrumentById(id: string) {
    isLoading.value = true;
    try {
      const data = await apiFetch(`/instruments/${id}`);
      return data;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchCalibrationHistory(instrumentId: string) {
    const data = await apiFetch(`/instruments/${instrumentId}/calibration-history`);
    return data;
  }

  async function createInstrument(data: any) {
    const newInstrument = await apiFetch('/instruments', { method: 'POST', body: JSON.stringify(data) });
    await fetchInstruments(); // обновляем список
    return newInstrument;
  }

  async function updateInstrument(id: string, data: any) {
    const updated = await apiFetch(`/instruments/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    await fetchInstruments();
    return updated;
  }

  async function writeOffInstrument(id: string) {
    await apiFetch(`/instruments/${id}/write-off`, { method: 'DELETE' });
    await fetchInstruments();
  }

  async function addCalibrationHistory(instrumentId: string, data: any) {
    const history = await apiFetch(`/instruments/${instrumentId}/calibration`, { method: 'POST', body: JSON.stringify(data) });
    return history;
  }

  function setFilterParams(params: any) {
    filterParams.value = { ...filterParams.value, ...params };
    fetchInstruments(); // применяем фильтры сразу
  }

  return {
    instruments: filteredInstruments,
    isLoading,
    error,
    filterParams,
    fetchInstruments,
    fetchInstrumentById,
    fetchCalibrationHistory,
    createInstrument,
    updateInstrument,
    writeOffInstrument,
    addCalibrationHistory,
    setFilterParams,
  };
});