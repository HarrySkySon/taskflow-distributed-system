import http from 'k6/http';
import { check, sleep } from 'k6';

// Конфігурація smoke тесту (мінімальне навантаження для перевірки базової функціональності)
export const options = {
  vus: 1, // 1 віртуальний користувач
  duration: '30s', // Тривалість 30 секунд
  thresholds: {
    'http_req_duration': ['p(95)<1000'], // 95% запитів < 1с
    'http_req_failed': ['rate<0.01'],     // Менше 1% помилок
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4002';

export default function () {
  // Перевірка health endpoint
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health check is OK': (r) => r.status === 200,
  });

  sleep(1);

  // Перевірка отримання списку проектів
  const projectsRes = http.get(`${BASE_URL}/api/projects`);
  check(projectsRes, {
    'can get projects': (r) => r.status === 200,
    'projects response is valid JSON': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch (e) {
        return false;
      }
    },
  });

  sleep(1);

  // Перевірка створення проекту
  const newProject = {
    name: 'Smoke Test Project',
    description: 'Тестовий проект для smoke тестування',
    status: 'active',
    start_date: '2025-01-01',
    end_date: '2025-12-31',
  };

  const createRes = http.post(
    `${BASE_URL}/api/projects`,
    JSON.stringify(newProject),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const projectCreated = check(createRes, {
    'can create project': (r) => r.status === 201,
  });

  if (projectCreated) {
    try {
      const body = JSON.parse(createRes.body);
      const projectId = body.data.id;

      sleep(1);

      // Видалення створеного проекту
      const deleteRes = http.del(`${BASE_URL}/api/projects/${projectId}`);
      check(deleteRes, {
        'can delete project': (r) => r.status === 200,
      });
    } catch (e) {
      console.error('Error parsing response:', e);
    }
  }

  sleep(2);
}

export function setup() {
  console.log('🔍 Smoke Test - Перевірка базової функціональності');
  console.log(`🎯 Цільовий URL: ${BASE_URL}`);
}

export function teardown(data) {
  console.log('✅ Smoke Test завершено');
}
