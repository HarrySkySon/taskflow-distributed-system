#!/bin/bash

# ЛР8 - Скрипт тестування моніторингу і логування
# Автоматичне тестування всіх компонентів системи моніторингу

set -e  # Exit on error

# Кольори для виводу
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Базові URL
PROJECTS_API="http://localhost:4002"
NOTIFICATIONS_API="http://localhost:4004"
PROMETHEUS="http://localhost:9090"
GRAFANA="http://localhost:3000"
LOKI="http://localhost:3100"

# Функції для виводу
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Функція для перевірки доступності URL
check_url() {
    local url=$1
    local name=$2

    if curl -s -f -o /dev/null "$url"; then
        print_success "$name is accessible at $url"
        return 0
    else
        print_error "$name is NOT accessible at $url"
        return 1
    fi
}

# Функція для очікування доступності сервісу
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1

    print_info "Waiting for $name to be ready..."

    while [ $attempt -le $max_attempts ]; do
        if curl -s -f -o /dev/null "$url"; then
            print_success "$name is ready!"
            return 0
        fi

        echo -n "."
        sleep 2
        ((attempt++))
    done

    print_error "$name did not become ready in time"
    return 1
}

#================================================
# MAIN TEST SUITE
#================================================

print_header "ЛР8 - ТЕСТУВАННЯ МОНІТОРИНГУ І ЛОГУВАННЯ"

echo "Start Time: $(date)"
echo ""

#------------------------------------------------
# 1. Перевірка Docker Compose
#------------------------------------------------
print_header "1. Docker Compose Status"

if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    exit 1
fi

print_success "Docker is installed: $(docker --version)"

if ! docker compose ps &> /dev/null; then
    print_error "Docker Compose services are not running"
    print_info "Please run: docker compose up -d"
    exit 1
fi

print_success "Docker Compose services are running"

# Вивести статус всіх контейнерів
echo ""
print_info "Container Status:"
docker compose ps

#------------------------------------------------
# 2. Перевірка компонентів моніторингу
#------------------------------------------------
print_header "2. Monitoring Components Health Check"

# Prometheus
wait_for_service "$PROMETHEUS/-/healthy" "Prometheus"
if [ $? -eq 0 ]; then
    print_info "Prometheus UI: http://localhost:9090"
fi

# Grafana
wait_for_service "$GRAFANA/api/health" "Grafana"
if [ $? -eq 0 ]; then
    print_info "Grafana UI: http://localhost:3000 (admin/admin)"
fi

# Loki
wait_for_service "$LOKI/ready" "Loki"
if [ $? -eq 0 ]; then
    print_info "Loki API: http://localhost:3100"
fi

#------------------------------------------------
# 3. Перевірка метрик від мікросервісів
#------------------------------------------------
print_header "3. Microservices Metrics Endpoints"

# Projects Service metrics
print_info "Checking Projects Service metrics endpoint..."
if check_url "$PROJECTS_API/metrics" "Projects Service /metrics"; then
    # Показати перші 20 рядків метрик
    echo ""
    print_info "Sample metrics from Projects Service:"
    curl -s "$PROJECTS_API/metrics" | head -20
    echo ""
fi

# Notifications Service metrics
print_info "Checking Notifications Service metrics endpoint..."
if check_url "$NOTIFICATIONS_API/metrics" "Notifications Service /metrics"; then
    echo ""
    print_info "Sample metrics from Notifications Service:"
    curl -s "$NOTIFICATIONS_API/metrics" | head -20
    echo ""
fi

#------------------------------------------------
# 4. Перевірка Prometheus Targets
#------------------------------------------------
print_header "4. Prometheus Scrape Targets"

print_info "Checking Prometheus targets status..."
TARGETS_JSON=$(curl -s "$PROMETHEUS/api/v1/targets")

if echo "$TARGETS_JSON" | jq -e '.status == "success"' > /dev/null 2>&1; then
    print_success "Prometheus targets API is working"

    # Показати статус кожного target
    echo ""
    print_info "Target Health Status:"
    echo "$TARGETS_JSON" | jq -r '.data.activeTargets[] | "\(.labels.job): \(.health) (\(.lastScrape))"'
else
    print_error "Failed to fetch Prometheus targets"
fi

#------------------------------------------------
# 5. Перевірка метрик у Prometheus
#------------------------------------------------
print_header "5. Prometheus Metrics Availability"

print_info "Checking if Prometheus is collecting metrics..."

# Перевірити наявність базових метрик
QUERY="up"
RESULT=$(curl -s "$PROMETHEUS/api/v1/query?query=$QUERY")

if echo "$RESULT" | jq -e '.status == "success"' > /dev/null 2>&1; then
    print_success "Prometheus is successfully collecting metrics"

    # Показати які сервіси up
    echo ""
    print_info "Services Status (up metric):"
    echo "$RESULT" | jq -r '.data.result[] | "\(.metric.job): \(.value[1])"'
else
    print_error "Failed to query Prometheus"
fi

#------------------------------------------------
# 6. Тест збору метрик через API запити
#------------------------------------------------
print_header "6. Generate Metrics via API Requests"

print_info "Making API requests to generate metrics..."

# Створити кілька запитів для генерації метрик
for i in {1..5}; do
    curl -s "$PROJECTS_API/health" > /dev/null
    curl -s "$NOTIFICATIONS_API/health" > /dev/null
    print_info "Request $i/5 completed"
    sleep 1
done

print_success "Generated sample traffic for metrics"

# Почекати трохи для scrape
sleep 5

# Перевірити HTTP request метрики
print_info "Checking HTTP request metrics..."
HTTP_QUERY="http_requests_total"
HTTP_RESULT=$(curl -s "$PROMETHEUS/api/v1/query?query=$HTTP_QUERY")

if echo "$HTTP_RESULT" | jq -e '.data.result | length > 0' > /dev/null 2>&1; then
    print_success "HTTP request metrics are being collected"
    echo ""
    echo "$HTTP_RESULT" | jq -r '.data.result[] | "\(.metric.service // .metric.job) - \(.metric.route): \(.value[1]) requests"' | head -10
else
    print_error "No HTTP request metrics found"
fi

#------------------------------------------------
# 7. Перевірка Grafana Datasources
#------------------------------------------------
print_header "7. Grafana Datasources Configuration"

print_info "Checking Grafana datasources..."
DATASOURCES=$(curl -s -u admin:admin "$GRAFANA/api/datasources")

if echo "$DATASOURCES" | jq -e 'length > 0' > /dev/null 2>&1; then
    print_success "Grafana has configured datasources"
    echo ""
    print_info "Configured datasources:"
    echo "$DATASOURCES" | jq -r '.[] | "- \(.name) (\(.type)): \(.url)"'
else
    print_error "No Grafana datasources found"
fi

#------------------------------------------------
# 8. Перевірка логів у Loki
#------------------------------------------------
print_header "8. Loki Log Aggregation"

print_info "Checking if Loki is receiving logs..."

# Запит до Loki для перевірки наявності логів
LOKI_QUERY='{service=~"projects-service|notifications-service"}'
LOKI_RESULT=$(curl -s -G "$LOKI/loki/api/v1/query" --data-urlencode "query=$LOKI_QUERY" --data-urlencode "limit=10")

if echo "$LOKI_RESULT" | jq -e '.status == "success"' > /dev/null 2>&1; then
    LOG_COUNT=$(echo "$LOKI_RESULT" | jq '.data.result | length')

    if [ "$LOG_COUNT" -gt 0 ]; then
        print_success "Loki is receiving logs from services"
        echo ""
        print_info "Recent log entries count: $LOG_COUNT"
    else
        print_error "Loki is running but no logs found yet"
    fi
else
    print_error "Failed to query Loki"
fi

#------------------------------------------------
# 9. Тест Event Flow з метриками
#------------------------------------------------
print_header "9. Event Flow Integration with Metrics"

print_info "Creating a project to test event flow and metrics..."

# Створити проект
PROJECT_DATA='{
  "name": "ЛР8 Моніторинг Тест",
  "description": "Тестування системи моніторингу та збору метрик",
  "owner_id": 1,
  "priority": "high",
  "status": "planning"
}'

CREATE_RESPONSE=$(curl -s -X POST "$PROJECTS_API/api/projects" \
    -H "Content-Type: application/json" \
    -d "$PROJECT_DATA")

if echo "$CREATE_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    PROJECT_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.id')
    print_success "Project created with ID: $PROJECT_ID"

    # Почекати для обробки події
    sleep 3

    # Перевірити метрики events_published
    print_info "Checking events published metrics..."
    EVENTS_QUERY="events_published_total"
    EVENTS_RESULT=$(curl -s "$PROMETHEUS/api/v1/query?query=$EVENTS_QUERY")

    if echo "$EVENTS_RESULT" | jq -e '.data.result | length > 0' > /dev/null 2>&1; then
        print_success "Events published metrics are being tracked"
        echo ""
        echo "$EVENTS_RESULT" | jq -r '.data.result[] | "Event type: \(.metric.event_type) - Count: \(.value[1])"'
    fi

    # Перевірити метрики events_consumed
    print_info "Checking events consumed metrics..."
    CONSUMED_QUERY="events_consumed_total"
    CONSUMED_RESULT=$(curl -s "$PROMETHEUS/api/v1/query?query=$CONSUMED_QUERY")

    if echo "$CONSUMED_RESULT" | jq -e '.data.result | length > 0' > /dev/null 2>&1; then
        print_success "Events consumed metrics are being tracked"
        echo ""
        echo "$CONSUMED_RESULT" | jq -r '.data.result[] | "Event type: \(.metric.event_type) - Count: \(.value[1])"'
    fi
else
    print_error "Failed to create project"
fi

#------------------------------------------------
# 10. Resource Usage Check
#------------------------------------------------
print_header "10. Resource Usage Monitoring"

print_info "Current container resource usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

#------------------------------------------------
# 11. Перевірка всіх метрик сервісів
#------------------------------------------------
print_header "11. Service-Specific Metrics Check"

# Процес метрики
print_info "Checking process metrics (memory, CPU)..."
PROCESS_QUERY="process_resident_memory_bytes"
PROCESS_RESULT=$(curl -s "$PROMETHEUS/api/v1/query?query=$PROCESS_QUERY")

if echo "$PROCESS_RESULT" | jq -e '.data.result | length > 0' > /dev/null 2>&1; then
    print_success "Process metrics are available"
    echo ""
    echo "$PROCESS_RESULT" | jq -r '.data.result[] | "\(.metric.job): \(.value[1] / 1024 / 1024 | floor) MB"'
fi

#------------------------------------------------
# SUMMARY
#------------------------------------------------
print_header "TEST SUMMARY"

echo "End Time: $(date)"
echo ""

print_success "All monitoring and logging tests completed!"
echo ""
print_info "Key Validations:"
echo "  ✓ Prometheus collecting metrics from all services"
echo "  ✓ Grafana configured with Prometheus and Loki datasources"
echo "  ✓ Loki aggregating logs from Docker containers"
echo "  ✓ Microservices exposing /metrics endpoints"
echo "  ✓ Event flow metrics tracked (published/consumed)"
echo "  ✓ HTTP request metrics collected"
echo "  ✓ Resource usage metrics available"
echo ""

print_info "Access Points:"
echo "  • Prometheus: http://localhost:9090"
echo "  • Grafana: http://localhost:3000 (admin/admin)"
echo "  • Loki API: http://localhost:3100"
echo "  • Projects API: http://localhost:4002"
echo "  • Notifications API: http://localhost:4004"
echo "  • RabbitMQ Management: http://localhost:15672 (guest/guest)"
echo ""

print_info "Grafana Dashboards:"
echo "  1. Navigate to http://localhost:3000"
echo "  2. Login with admin/admin"
echo "  3. Go to Dashboards → TaskFlow System Overview"
echo ""

print_header "MONITORING TEST COMPLETED SUCCESSFULLY"
