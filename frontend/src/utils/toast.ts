type ToastType = 'success' | 'error' | 'info';

let toastHandler: ((message: string, type: ToastType) => void) | null = null;

export const registerToast = (handler: (message: string, type: ToastType) => void) => {
  toastHandler = handler;
  console.log('Toast registered successfully'); // Для отладки
};

export const showToast = (message: string, type: ToastType = 'info') => {
  console.log(`showToast called: ${message} (${type})`); // Для отладки
  if (toastHandler) {
    toastHandler(message, type);
  } else {
    console.warn('Toast handler not registered yet');
  }
};