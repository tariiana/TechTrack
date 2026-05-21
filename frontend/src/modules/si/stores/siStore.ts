import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiFetch } from '@/api/client';
import { addYears } from '@/utils/dateUtils';

type EntityId = string | number;

export const useSIStore = defineStore('si', () => {
  const instruments = ref<any[]>([]);
  const verifications = ref<any[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const filterParams = ref({ search: '', status: '' });

  const allInstruments = computed(() => instruments.value);

  const filteredInstruments = computed(() => {
    let list = instruments.value;
    const params = filterParams.value;
    if (params.search) {
      const s = params.search.toLowerCase();
      list = list.filter(si => si.name?.toLowerCase().includes(s) || si.tabNumber?.toLowerCase().includes(s));
    }
    if (params.status) {
      list = list.filter(si => si.status === params.status);
    }
    return list;
  });

  async function fetchInstruments() {
    isLoading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams();
      if (filterParams.value.search) params.append('search', filterParams.value.search);
      if (filterParams.value.status) params.append('status', filterParams.value.status);
      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await apiFetch(`/instruments${query}`);
      instruments.value = data;
    } catch (err: any) {
      error.value = err.message;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchInstrumentById(id: EntityId) {
    try {
      const data = await apiFetch(`/instruments/${id}`);
      const index = instruments.value.findIndex(si => String(si.id) === String(id));
      if (data && index >= 0) instruments.value[index] = data;
      else if (data) instruments.value.push(data);
      return data;
    } catch (err: any) {
      error.value = err.message;
      return null;
    }
  }

  async function fetchVerifications(siId: EntityId) {
    try {
      const data = await apiFetch(`/instruments/${siId}/verifications`);
      verifications.value = data;
      return data;
    } catch (err: any) {
      error.value = err.message;
      return [];
    }
  }

  function getVerificationsForSI(siId: EntityId) {
    return verifications.value
      .filter(v => String(v.siId) === String(siId))
      .sort((a, b) => new Date(b.receiptDate || b.calibrationDate || 0).getTime() - new Date(a.receiptDate || a.calibrationDate || 0).getTime());
  }

  function getLastVerificationDate(siId: EntityId): string {
    const verificationsForSI = getVerificationsForSI(siId);
    const lastGood = verificationsForSI
      .filter(v => v.result === 'годен')
      .sort((a, b) => new Date(b.receiptDate).getTime() - new Date(a.receiptDate).getTime())[0];
    if (lastGood?.receiptDate) return lastGood.receiptDate;

    const si = instruments.value.find(s => String(s.id) === String(siId));
    return si?.lastVerificationDate || si?.last_verification_date || '';
  }

  function getNextVerificationDate(siId: EntityId): string {
    const lastDate = getLastVerificationDate(siId);
    const si = instruments.value.find(s => String(s.id) === String(siId));
    if (si?.nextVerificationDate || si?.next_verification_date) {
      return si.nextVerificationDate || si.next_verification_date;
    }
    if (lastDate && si?.verificationInterval) {
      return addYears(lastDate, si.verificationInterval);
    }
    return '';
  }

  async function createInstrument(data: any) {
    const newInstrument = await apiFetch('/instruments', { method: 'POST', body: JSON.stringify(data) });
    await fetchInstruments();
    return newInstrument;
  }

  async function updateInstrument(id: EntityId, data: any) {
    const updated = await apiFetch(`/instruments/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    await fetchInstruments();
    return updated;
  }

  async function writeOffInstrument(id: EntityId) {
    await apiFetch(`/instruments/${id}/write-off`, { method: 'DELETE' });
    await fetchInstruments();
  }

  async function addVerification(data: any) {
    const newVer = await apiFetch(`/instruments/${data.siId}/verifications`, { method: 'POST', body: JSON.stringify(data) });
    await fetchVerifications(data.siId);
    return newVer;
  }

  async function updateVerification(siId: EntityId, verificationId: EntityId, data: any) {
    const updated = await apiFetch(`/instruments/${siId}/verifications/${verificationId}`, { method: 'PUT', body: JSON.stringify(data) });
    await fetchVerifications(siId);
    return updated;
  }

  function setFilterParams(params: any) {
    filterParams.value = { ...filterParams.value, ...params };
    fetchInstruments();
  }

  return {
    instruments: filteredInstruments,
    allInstruments,
    verifications,
    isLoading,
    error,
    filterParams,
    fetchInstruments,
    fetchInstrumentById,
    fetchVerifications,
    getVerificationsForSI,
    getLastVerificationDate,
    getNextVerificationDate,
    createInstrument,
    updateInstrument,
    writeOffInstrument,
    addVerification,
    updateVerification,
    setFilterParams,
  };
});
