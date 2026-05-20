const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Расширенный класс для работы с API
export class ApiClient {
  private static instance: ApiClient;
  
  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }
  
  async request(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
    
    // Убираем автоматический редирект при 401 для страницы логина
    const isLoginRequest = endpoint.includes('/auth/login');
    
    if (response.status === 401 && !isLoginRequest) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Не делаем редирект здесь, просто кидаем ошибку
      throw new Error('Сессия истекла');
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Ошибка ${response.status}`);
    }
    
    // Для пустых ответов (204 No Content)
    if (response.status === 204) {
      return null;
    }
    
    return response.json();
  }
  
  get(endpoint: string, params?: Record<string, any>) {
    let url = endpoint;
    if (params) {
      const queryString = new URLSearchParams(params).toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    return this.request(url, { method: 'GET' });
  }
  
  post(endpoint: string, data?: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }
  
  put(endpoint: string, data?: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }
  
  delete(endpoint: string) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

// Сохраняем старую функцию для обратной совместимости
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const client = ApiClient.getInstance();
  const method = options.method || 'GET';
  
  switch (method) {
    case 'GET':
      return client.get(endpoint);
    case 'POST':
      return client.post(endpoint, options.body ? JSON.parse(options.body as string) : undefined);
    case 'PUT':
      return client.put(endpoint, options.body ? JSON.parse(options.body as string) : undefined);
    case 'DELETE':
      return client.delete(endpoint);
    default:
      return client.request(endpoint, options);
  }
}