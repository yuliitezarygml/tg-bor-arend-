const https = require('https');
const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, '../models/face-api');

// Используем корректный URL для моделей vladmandic/face-api
const BASE_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

const REQUIRED_MODELS = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2'
];

async function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);
    
    https.get(url, (response) => {
      // Обрабатываем редиректы
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location, destination)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`✅ Downloaded: ${path.basename(destination)}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destination, () => {});
      reject(err);
    });
  });
}

async function downloadModels() {
  console.log('🔄 Загрузка моделей Face-API...\n');
  
  // Создаем директорию для моделей
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
    console.log(`📁 Создана директория: ${MODELS_DIR}\n`);
  }
  
  // Скачиваем каждый файл
  for (const modelFile of REQUIRED_MODELS) {
    const url = `${BASE_URL}/${modelFile}`;
    const destination = path.join(MODELS_DIR, modelFile);
    
    try {
      console.log(`⬇️  Загрузка: ${modelFile}...`);
      await downloadFile(url, destination);
    } catch (error) {
      console.error(`❌ Ошибка загрузки ${modelFile}:`, error.message);
      throw error;
    }
  }
  
  console.log('\n✅ Все модели успешно загружены!');
  console.log(`📁 Расположение: ${MODELS_DIR}`);
}

// Запуск
downloadModels().catch((error) => {
  console.error('\n❌ Ошибка загрузки моделей:', error);
  process.exit(1);
});
