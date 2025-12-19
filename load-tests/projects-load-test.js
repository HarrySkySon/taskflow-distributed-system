import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Власні метрики
const projectCreationErrors = new Counter('project_creation_errors');
const projectCreationSuccess = new Rate('project_creation_success');
const projectGetDuration = new Trend('project_get_duration');

// Конфігурація навантажувального тестування
export const options = {
  // Сценарій поступового збільшення навантаження
  stages: [
    { duration: '30s', target: 10 },  // Розігрів: 10 користувачів за 30 сек
    { duration: '1m', target: 50 },   // Збільшення до 50 користувачів за 1 хв
    { duration: '2m', target: 100 },  // Пікове навантаження: 100 користувачів за 2 хв
    { duration: '1m', target: 50 },   // Зниження до 50 користувачів
    { duration: '30s', target: 0 },   // Завершення: зниження до 0
  ],

  // Пороги успішності тестування
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95% запитів мають завершуватись за 500мс
    'http_req_failed': ['rate<0.05'],   // Менше 5% помилок
    'project_creation_success': ['rate>0.90'], // 90%+ успішних створень проектів
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4002';

// Допоміжна функція для генерації випадкових даних
function randomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Головна функція тестування
export default function () {
  // 1. Перевірка здоров'я сервісу
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);

  // 2. Отримання всіх проектів
  const getAllStart = Date.now();
  const getAllRes = http.get(`${BASE_URL}/api/projects`);
  projectGetDuration.add(Date.now() - getAllStart);

  check(getAllRes, {
    'get all projects status is 200': (r) => r.status === 200,
    'get all projects returns array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.data);
      } catch (e) {
        return false;
      }
    },
  });

  sleep(1);

  // 3. Створення нового проекту
  const newProject = {
    name: `Load Test Project ${randomString(8)}`,
    description: `Автоматично створений проект для навантажувального тестування - ${Date.now()}`,
    status: 'active',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  };

  const createRes = http.post(
    `${BASE_URL}/api/projects`,
    JSON.stringify(newProject),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const createSuccess = check(createRes, {
    'create project status is 201': (r) => r.status === 201,
    'create project returns id': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.id;
      } catch (e) {
        return false;
      }
    },
  });

  if (createSuccess) {
    projectCreationSuccess.add(1);

    // Отримання ID створеного проекту
    let projectId;
    try {
      const createBody = JSON.parse(createRes.body);
      projectId = createBody.data.id;
    } catch (e) {
      projectCreationErrors.add(1);
    }

    sleep(1);

    // 4. Отримання конкретного проекту за ID
    if (projectId) {
      const getByIdRes = http.get(`${BASE_URL}/api/projects/${projectId}`);
      check(getByIdRes, {
        'get project by id status is 200': (r) => r.status === 200,
        'get project by id returns correct data': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.data && body.data.id === projectId;
          } catch (e) {
            return false;
          }
        },
      });

      sleep(1);

      // 5. Оновлення проекту
      const updatedProject = {
        name: `Updated ${newProject.name}`,
        description: 'Оновлений опис проекту',
        status: 'in_progress',
      };

      const updateRes = http.put(
        `${BASE_URL}/api/projects/${projectId}`,
        JSON.stringify(updatedProject),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      check(updateRes, {
        'update project status is 200': (r) => r.status === 200,
        'update project reflects changes': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.data && body.data.name === updatedProject.name;
          } catch (e) {
            return false;
          }
        },
      });

      sleep(1);

      // 6. Видалення проекту
      const deleteRes = http.del(`${BASE_URL}/api/projects/${projectId}`);
      check(deleteRes, {
        'delete project status is 200': (r) => r.status === 200,
      });
    }
  } else {
    projectCreationSuccess.add(0);
    projectCreationErrors.add(1);
  }

  // Пауза між ітераціями
  sleep(2);
}

// Функція для виконання на початку тестування
export function setup() {
  console.log('🚀 Початок навантажувального тестування');
  console.log(`📊 Цільовий URL: ${BASE_URL}`);

  // Перевірка доступності сервісу
  const healthCheck = http.get(`${BASE_URL}/health`);
  if (healthCheck.status !== 200) {
    throw new Error('❌ Сервіс недоступний! Перевірте, чи запущений projects-service');
  }

  console.log('✅ Сервіс доступний, розпочинаємо тестування');
  return { startTime: new Date().toISOString() };
}

// Функція для виконання після завершення тестування
export function teardown(data) {
  console.log('🏁 Завершення навантажувального тестування');
  console.log(`⏰ Час початку: ${data.startTime}`);
  console.log(`⏰ Час завершення: ${new Date().toISOString()}`);
}
