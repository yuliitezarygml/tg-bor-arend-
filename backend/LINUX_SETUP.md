# 🐧 Установка на Linux - Полная функциональность

## Быстрая установка (все 4 уровня проверки)

### Требования
- Linux (Ubuntu, Debian, CentOS и т.д.)
- Node.js 18+ 
- MongoDB
- 2+ GB RAM

### Установка зависимостей системы

#### Ubuntu/Debian:
```bash
# Обновите систему
sudo apt update

# Установите build tools
sudo apt install -y build-essential

# Установите зависимости для canvas
sudo apt install -y libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev librsvg2-dev

# Установите pkg-config
sudo apt install -y pkg-config
```

#### CentOS/RHEL/Fedora:
```bash
sudo yum groupinstall "Development Tools"
sudo yum install -y cairo-devel libjpeg-turbo-devel pango-devel giflib-devel librsvg2-devel
```

### Установка проекта

```bash
# Перейдите в папку backend
cd backend

# Установите все зависимости Node.js
npm install

# Установите TensorFlow и canvas (на Linux это работает!)
npm install @tensorflow/tfjs-node canvas

# Загрузите модели Face-API
node migrations/download-face-api-models.js

# Настройте .env
cp .env.example .env
nano .env  # Добавьте ADMIN_CHAT_ID и другие настройки
```

### Запуск

```bash
# Для разработки
npm run dev

# Для production
npm start
```

### Проверка успешной установки

Вы должны увидеть:

```
✅ Face-API успешно загружен
✅ Face-API модели загружены

╔══════════════════════════════════════════╗
║  🎮 Console Rental Backend               ║
║  Сервер запущен на: http://localhost:5000  ║
╚══════════════════════════════════════════╝

✅ MongoDB подключена
```

**Если видите это - значит все 4 уровня проверки активны! ✅**

## Активные проверки (Linux)

### 🟢 Полный режим - все 4 уровня:

1. ✅ **Проверка качества изображения** (30% веса)
   - Разрешение ≥ 800x600 пикселей
   - Размер файла: 50 КБ - 10 МБ
   - Формат: JPEG/PNG

2. ✅ **Распознавание текста - OCR** (20% веса)
   - Tesseract.js для русского/английского
   - Поиск ключевых слов паспорта
   - Проверка читаемости документа

3. ✅ **Обнаружение лица** (20% веса)
   - Face-API с нейронными сетями (SSD MobileNet v1)
   - Определение лица с уверенностью >60%
   - Проверка, что обнаружено ровно одно лицо

4. ✅ **Сравнение лиц** (30% веса)
   - Сопоставление лица на паспорте с селфи
   - Евклидово расстояние между дескрипторами
   - Порог совпадения: <0.6 (схожесть >78%)

## Тестирование

### Быстрый тест всех проверок:

```bash
# Создайте тестовый скрипт
cat > test-verification.js << 'EOF'
const { verifyPassportPhoto } = require('./src/utils/documentVerification');

async function test() {
  console.log('🧪 Тестирование системы проверки...\n');
  
  try {
    // Создайте тестовое изображение
    const sharp = require('sharp');
    await sharp({
      create: {
        width: 1000,
        height: 800,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    }).toFile('/tmp/test-passport.jpg');
    
    const result = await verifyPassportPhoto('/tmp/test-passport.jpg', 'passport_front');
    
    console.log('✅ Результат проверки:');
    console.log('  - Качество:', result.quality.passed ? '✅' : '❌');
    console.log('  - OCR:', result.text.passed ? '✅' : '❌', result.text.skipped ? '(пропущено)' : '');
    console.log('  - Лицо:', result.face.passed ? '✅' : '❌', result.face.skipped ? '(пропущено)' : '');
    
    if (result.face.skipped) {
      console.log('\n⚠️  Face-API не активен (проверка лиц пропущена)');
      console.log('   Убедитесь что TensorFlow установлен: npm list @tensorflow/tfjs-node');
    } else {
      console.log('\n✅ Все системы работают! Face-API активен.');
    }
    
  } catch (error) {
    console.error('❌ Ошибка теста:', error.message);
  }
}

test();
EOF

# Запустите тест
node test-verification.js
```

## Production deployment на Linux

### Вариант 1: Systemd service

```bash
# Создайте service файл
sudo nano /etc/systemd/system/console-rental.service
```

Содержимое:
```ini
[Unit]
Description=Console Rental Backend
After=network.target mongodb.service

[Service]
Type=simple
User=yourusername
WorkingDirectory=/path/to/backend
Environment="NODE_ENV=production"
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Запуск:
```bash
sudo systemctl enable console-rental
sudo systemctl start console-rental
sudo systemctl status console-rental
```

### Вариант 2: PM2 (рекомендуется)

```bash
# Установите PM2
npm install -g pm2

# Запустите приложение
pm2 start server.js --name console-rental

# Автозапуск при перезагрузке
pm2 startup
pm2 save

# Мониторинг
pm2 monit

# Логи
pm2 logs console-rental
```

### Вариант 3: Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

# Установка зависимостей для canvas и TensorFlow
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

WORKDIR /app

# Копируем package files
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем исходный код
COPY . .

# Загружаем модели Face-API
RUN node migrations/download-face-api-models.js

EXPOSE 5000

CMD ["npm", "start"]
```

Запуск:
```bash
docker build -t console-rental .
docker run -d \
  --name console-rental \
  -p 5000:5000 \
  -e MONGODB_URI=mongodb://localhost:27017/console-rental \
  -e ADMIN_CHAT_ID=your_chat_id \
  console-rental
```

## Nginx reverse proxy

```nginx
# /etc/nginx/sites-available/console-rental
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Увеличиваем лимит для загрузки фото
    client_max_body_size 10M;
}
```

Активация:
```bash
sudo ln -s /etc/nginx/sites-available/console-rental /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL с Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Мониторинг и логи

### Просмотр логов

```bash
# PM2
pm2 logs console-rental

# Systemd
sudo journalctl -u console-rental -f

# Docker
docker logs -f console-rental
```

### Мониторинг Face-API

Создайте endpoint для проверки:

```javascript
// В server.js добавьте:
app.get('/api/health/face-api', async (req, res) => {
  const { checkFaceApiStatus } = require('./src/utils/documentVerification');
  
  try {
    const status = await checkFaceApiStatus();
    res.json({
      faceApiAvailable: status.available,
      modelsLoaded: status.modelsLoaded,
      checks: {
        quality: true,
        ocr: true,
        faceDetection: status.available,
        faceComparison: status.available
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Оптимизация производительности

### 1. Кеширование моделей Face-API

Модели загружаются один раз при старте и хранятся в памяти.

### 2. Ограничение памяти Node.js

```bash
# Если модели занимают много памяти
node --max-old-space-size=2048 server.js
```

### 3. Кластеризация (опционально)

```javascript
// cluster.js
const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
  const cpus = os.cpus().length;
  
  for (let i = 0; i < cpus; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.id} died, restarting...`);
    cluster.fork();
  });
} else {
  require('./server.js');
}
```

## Troubleshooting на Linux

### TensorFlow не загружается

```bash
# Проверьте версию Node.js
node --version  # Должна быть 18+

# Переустановите TensorFlow
npm uninstall @tensorflow/tfjs-node
npm install @tensorflow/tfjs-node

# Проверьте установку
node -e "require('@tensorflow/tfjs-node'); console.log('OK')"
```

### Canvas не устанавливается

```bash
# Установите все зависимости
sudo apt install -y build-essential libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev librsvg2-dev

# Очистите кеш и переустановите
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Модели Face-API не найдены

```bash
# Проверьте наличие моделей
ls -la models/face-api/

# Если пусто, загрузите снова
node migrations/download-face-api-models.js

# Проверьте права доступа
chmod -R 755 models/
```

## Проверка работы всех компонентов

```bash
# 1. Проверка TensorFlow
node -e "require('@tensorflow/tfjs-node'); console.log('✅ TensorFlow OK')"

# 2. Проверка canvas
node -e "require('canvas'); console.log('✅ Canvas OK')"

# 3. Проверка Face-API
node -e "require('@vladmandic/face-api'); console.log('✅ Face-API OK')"

# 4. Проверка моделей
ls models/face-api/ | wc -l  # Должно быть 7-8 файлов

# 5. Запуск полного теста
npm test  # Если есть тесты
```

## Производительность на Linux

### Ожидаемые показатели:

- **Проверка 1 фото:** 3-7 секунд
- **Полная проверка (3 фото + сравнение):** 10-20 секунд
- **Использование RAM:** ~500-800 MB (с TensorFlow)
- **Использование CPU:** 20-50% во время проверки

### Оптимизация:

```javascript
// В documentVerification.js можно добавить кеш дескрипторов
const faceDescriptorCache = new Map();

async function detectFaceWithCache(imagePath, userId) {
  const cacheKey = `${userId}_${path.basename(imagePath)}`;
  
  if (faceDescriptorCache.has(cacheKey)) {
    return faceDescriptorCache.get(cacheKey);
  }
  
  const result = await detectFace(imagePath);
  faceDescriptorCache.set(cacheKey, result);
  
  return result;
}
```

## Резюме: Linux vs Windows

| Функция | Linux | Windows |
|---------|-------|---------|
| Качество | ✅ | ✅ |
| OCR | ✅ | ✅ |
| Face Detection | ✅ | ⚠️ (проблемы с TensorFlow) |
| Face Comparison | ✅ | ⚠️ (проблемы с TensorFlow) |
| Установка | Простая | Сложная (build tools) |
| Производительность | Отличная | Хорошая |
| Размер | ~500 MB | ~500 MB (если работает) |
| Production готовность | ✅ Отлично | ⚠️ Ограничено |

## Рекомендация

**Для production используйте Linux!**

- ✅ Все проверки работают
- ✅ Простая установка
- ✅ Стабильная работа TensorFlow
- ✅ Лучшая производительность
- ✅ Простой deployment

---

**Дата:** 2024-01-15  
**Версия:** 1.0.0 (Linux Production)
