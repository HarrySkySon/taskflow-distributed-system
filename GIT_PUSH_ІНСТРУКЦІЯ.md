# Інструкція для публікації на GitHub

## ✅ Підсумок перевірки

### Перевірено:
- ✅ **Код чистий** - credentials не знайдено
- ✅ **Діаграми є** - достатньо для курсової (PlantUML в ЛР3, ASCII в README)
- ✅ **Файли організовані** - лабораторні в docs/
- ✅ **Документація готова** - README.md, .gitignore, LICENSE, .env.example

### Структура проекту:
```
taskflow-distributed-system/
├── .gitignore                  ✅ Створено
├── .env.example                ✅ Створено
├── LICENSE                     ✅ Створено (MIT)
├── README.md                   ✅ Головний файл
├── docker-compose.yml          ✅ Є
├── docker-compose.scale.yml    ✅ Є
├── scale.sh / scale.bat        ✅ Є
│
├── projects-service/           ✅ Готовий сервіс
├── notifications-service/      ✅ Готовий сервіс
├── nginx/                      ✅ Конфігурація LB
├── monitoring/                 ✅ Prometheus, Grafana, Loki
├── load-tests/                 ✅ k6 тести
│
└── docs/                       ✅ Вся документація
    ├── ЛР1-ЛР9 (всі лабораторні)
    ├── LAB6-LAB8 (звіти)
    ├── ДІАГРАМИ_ОГЛЯД.md       ✅ Новий файл
    ├── REST_gRPC_Async_Questions.md
    └── Відповіді_на_іспит.md
```

---

## 🚀 Покрокова інструкція для Git Push

### Крок 1: Відкрийте термінал в директорії проекту

```bash
cd "C:\Users\123_4\Documents\Deutschland\Bewerbung\Вступ до ВУЗ\КНУБА навчання\Архітектура розподілених програмних систем_Мазуренко Р_ІСП"
```

### Крок 2: Ініціалізуйте Git репозиторій

```bash
git init
```

### Крок 3: Додайте всі файли (окрім тих, що в .gitignore)

```bash
git add .
```

### Крок 4: Перевірте що додається (опціонально)

```bash
git status
```

Переконайтеся що:
- ❌ Немає node_modules/
- ❌ Немає .env
- ✅ Є .env.example
- ✅ Є README.md
- ✅ Є всі інші файли

### Крок 5: Створіть перший commit

```bash
git commit -m "Initial commit: TaskFlow distributed system

Features:
- Projects microservice with REST API
- Notifications microservice with RabbitMQ consumer
- Nginx load balancer with least_conn strategy
- Horizontal scaling (3-5 replicas support)
- Monitoring stack: Prometheus + Grafana + Loki + Promtail
- k6 load testing (smoke + load tests)
- Complete documentation with lab reports
- Docker Compose orchestration

Tech Stack:
- Node.js 20 + TypeScript
- PostgreSQL 16
- RabbitMQ 3.12
- Nginx 1.25
- Docker + Docker Compose

Performance:
- 124 req/s throughput (3 replicas)
- p(95) 420ms response time
- 99.2% success rate
- Tested up to 100 concurrent users"
```

---

## 📝 Створення GitHub репозиторію

### Варіант A: Через веб-інтерфейс GitHub

1. Зайдіть на https://github.com
2. Натисніть зелену кнопку **"New"** (або "+") → "New repository"
3. Заповніть форму:
   - **Repository name:** `taskflow-distributed-system`
   - **Description:** `Distributed Project Management System with microservices architecture, load balancing, monitoring, and horizontal scaling`
   - **Visibility:** Public (або Private за бажанням)
   - ⚠️ **НЕ** ставте галочки:
     - [ ] Add a README file
     - [ ] Add .gitignore
     - [ ] Choose a license

     (вони вже є в проекті!)

4. Натисніть **"Create repository"**

5. GitHub покаже інструкції - **скопіюйте URL** вашого репозиторію:
   ```
   https://github.com/YOUR_USERNAME/taskflow-distributed-system.git
   ```

### Варіант B: Через GitHub CLI (якщо встановлено)

```bash
gh repo create taskflow-distributed-system --public --description "Distributed Project Management System"
```

---

## 🔗 Підключення до GitHub та Push

### Крок 6: Додайте remote

Замініть `YOUR_USERNAME` на ваш GitHub username:

```bash
git remote add origin https://github.com/YOUR_USERNAME/taskflow-distributed-system.git
```

### Крок 7: Перейменуйте гілку на main (якщо потрібно)

```bash
git branch -M main
```

### Крок 8: Push на GitHub

```bash
git push -u origin main
```

При першому push може запитати авторизацію:
- **Username:** ваш GitHub username
- **Password:** Personal Access Token (не пароль!)

---

## 🔑 Якщо потрібен Personal Access Token

1. Зайдіть на GitHub → Settings → Developer settings
2. Personal access tokens → Tokens (classic)
3. Generate new token (classic)
4. Виберіть scopes: `repo` (повний доступ до репозиторіїв)
5. Згенеруйте та скопіюйте токен
6. Використайте його як пароль при push

Або налаштуйте SSH ключі: https://docs.github.com/en/authentication/connecting-to-github-with-ssh

---

## ✅ Перевірка після публікації

1. Відкрийте ваш репозиторій на GitHub
2. Перевірте що:
   - ✅ README.md відображається на головній сторінці
   - ✅ Структура файлів коректна
   - ✅ Всі папки на місці
   - ✅ Немає node_modules/
   - ✅ Немає .env файлів
   - ✅ LICENSE відображається
   - ✅ Діаграми в docs/ доступні

3. Спробуйте клонувати в іншу папку (тест):
   ```bash
   cd /tmp
   git clone https://github.com/YOUR_USERNAME/taskflow-distributed-system.git
   cd taskflow-distributed-system
   docker compose up -d
   ```

---

## 🎨 Додаткові налаштування (опціонально)

### 1. Додайте Topics на GitHub

На сторінці репозиторію, клікніть "Add topics":
```
microservices
distributed-systems
nodejs
typescript
docker
rabbitmq
postgresql
nginx
prometheus
grafana
load-balancing
horizontal-scaling
k6
devops
```

### 2. Додайте про себе в README.md

Відредагуйте розділ "Автор" в README.md:
```markdown
## 👨‍💻 Автор

**[Ваше повне ім'я]**
- Університет: КНУБА
- Курс: [Курс]
- Група: [Група]
- Email: your.email@example.com
- GitHub: [@yourusername](https://github.com/yourusername)
```

Зробіть commit:
```bash
git add README.md
git commit -m "docs: add author information"
git push
```

### 3. Додайте About секцію

На GitHub репозиторії → Settings → About → Edit:
- **Description:** Distributed Project Management System
- **Website:** (якщо є)
- **Topics:** (як вище)

---

## 📊 Фінальний Checklist

Перед тим як розповсюджувати посилання на GitHub:

### Код:
- ✅ Немає credentials в коді
- ✅ .env в .gitignore
- ✅ .env.example є приклад
- ✅ node_modules не в репозиторії

### Документація:
- ✅ README.md актуальний
- ✅ LICENSE присутня
- ✅ Всі лабораторні в docs/
- ✅ Діаграми доступні

### Функціональність:
- ✅ docker compose up працює
- ✅ k6 тести є
- ✅ Масштабування працює
- ✅ Інструкції коректні

---

## 🎓 Для курсової роботи

Після публікації на GitHub, посилання на репозиторій можна використати в курсовій:

```markdown
## Посилання на репозиторій

Повний код проекту доступний на GitHub:
https://github.com/YOUR_USERNAME/taskflow-distributed-system

Репозиторій містить:
- Вихідний код всіх мікросервісів
- Конфігурації Docker та Nginx
- Скрипти моніторингу та тестування
- Повну документацію з усіма лабораторними роботами
```

---

## 💡 Поради

1. **Commit messages:** Пишіть зрозумілі описи
2. **Branches:** Для експериментів створюйте окремі гілки
3. **Issues:** Можна використати для TODOs
4. **Wiki:** Можна додати додаткову документацію
5. **GitHub Actions:** Можна додати CI/CD пізніше

---

## 🆘 Troubleshooting

### Проблема: "fatal: not a git repository"
**Рішення:** Виконайте `git init` в кореневій папці проекту

### Проблема: "remote origin already exists"
**Рішення:**
```bash
git remote remove origin
git remote add origin https://github.com/...
```

### Проблема: "Permission denied"
**Рішення:** Налаштуйте Personal Access Token або SSH ключі

### Проблема: Великий розмір репозиторію
**Рішення:** Перевірте що node_modules в .gitignore:
```bash
git rm -r --cached node_modules
git commit -m "Remove node_modules"
```

---

## ✨ Готово!

Після успішного push ваш проект буде доступний на GitHub!

**Наступні кроки:**
1. ⭐ Додати про себе в README
2. 📝 Написати КУРСОВА_РОБОТА.md (можна ПІСЛЯ push)
3. 🎨 Додати topics та about
4. 🎓 Використати посилання в курсовій роботі

---

**Успіхів з публікацією! 🚀**
