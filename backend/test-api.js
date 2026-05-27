// test-auth.js
// Ручной smoke-тест логина: ожидает запущенный backend на localhost:3000.
const http = require('http');

async function testAuth() {
  console.log('🔐 Проверка аутентификации...\n');
  
  const tests = [
    { login: 'admin', password: 'admin123', role: 'admin' },
    { login: 'operator', password: 'operator123', role: 'operator' },
    { login: 'observer', password: 'observer123', role: 'observer' },
    { login: 'wrong', password: 'wrong', role: 'none' } // Негативный тест: должен вернуть 401.
  ];
  
  for (const test of tests) {
    console.log(`Тест: ${test.login}/${test.password}`);
    
    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: test.login, password: test.password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log(`  ✅ Успешно! Роль: ${data.user?.role || test.role}`);
        console.log(`  🔑 Токен: ${data.token?.substring(0, 50)}...\n`);
      } else {
        console.log(`  ❌ Ошибка: ${data.error}\n`);
      }
    } catch (err) {
      console.log(`  ❌ Ошибка запроса: ${err.message}\n`);
    }
  }
}

testAuth();
