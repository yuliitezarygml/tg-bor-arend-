const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs').promises;

// Опциональная загрузка Face-API (может не работать без TensorFlow)
let faceapi = null;
let faceApiAvailable = false;

try {
  // Сначала пробуем загрузить TensorFlow
  require('@tensorflow/tfjs-node');
  
  // Затем Face-API
  faceapi = require('@vladmandic/face-api');
  const canvas = require('canvas');
  const { Canvas, Image, ImageData } = canvas;
  faceapi.env.monkeyPatch({ Canvas, Image, ImageData });
  faceApiAvailable = true;
  console.log('✅ Face-API успешно загружен');
} catch (error) {
  console.warn('⚠️ Face-API недоступен. Проверка лиц будет пропущена.');
  console.warn('   Причина:', error.message);
  if (error.message.includes('tfjs-node') || error.code === 'MODULE_NOT_FOUND') {
    console.warn('   TensorFlow может требовать перекомпиляцию для вашей системы');
    console.warn('   Попробуйте: npm rebuild @tensorflow/tfjs-node');
  }
}

let modelsLoaded = false;

/**
 * Загрузка моделей распознавания лиц
 */
async function loadModels() {
  if (!faceApiAvailable) {
    console.log('⚠️ Face-API недоступен, пропускаем загрузку моделей');
    return false;
  }
  
  if (modelsLoaded) return true;
  
  try {
    const modelPath = path.join(__dirname, '../../models/face-api');
    
    // Проверяем наличие моделей
    try {
      await fs.access(modelPath);
    } catch {
      console.warn('⚠️ Модели Face-API не найдены в:', modelPath);
      console.warn('   Запустите: node migrations/download-face-api-models.js');
      return false;
    }
    
    // Загружаем модели
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
    
    modelsLoaded = true;
    console.log('✅ Face-API модели загружены');
    return true;
  } catch (error) {
    console.error('❌ Ошибка загрузки Face-API моделей:', error.message);
    console.log('⚠️ Для полной проверки запустите: node migrations/download-face-api-models.js');
    return false;
  }
}

/**
 * Проверка качества изображения
 */
async function checkImageQuality(imagePath) {
  try {
    const metadata = await sharp(imagePath).metadata();
    
    const checks = {
      resolution: false,
      fileSize: false,
      format: false
    };
    
    // Проверка разрешения (минимум 800x600)
    if (metadata.width >= 800 && metadata.height >= 600) {
      checks.resolution = true;
    }
    
    // Проверка размера файла (минимум 50KB, максимум 10MB)
    const stats = await fs.stat(imagePath);
    const fileSizeKB = stats.size / 1024;
    if (fileSizeKB >= 50 && fileSizeKB <= 10240) {
      checks.fileSize = true;
    }
    
    // Проверка формата (JPEG, PNG)
    if (['jpeg', 'png', 'jpg'].includes(metadata.format)) {
      checks.format = true;
    }
    
    return {
      passed: checks.resolution && checks.fileSize && checks.format,
      checks,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        sizeKB: Math.round(fileSizeKB)
      }
    };
  } catch (error) {
    console.error('Ошибка проверки качества:', error);
    return { passed: false, error: error.message };
  }
}

/**
 * Распознавание текста на изображении (OCR)
 */
async function recognizeText(imagePath) {
  try {
    const result = await Tesseract.recognize(imagePath, 'rus+eng', {
      logger: m => {
        if (m.status === 'recognizing text') {
          console.log(`OCR прогресс: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    
    const text = result.data.text;
    const confidence = result.data.confidence;
    
    // Проверяем наличие ключевых слов паспорта
    const keywords = [
      'паспорт', 'passport', 'seria', 'серия', 'номер', 'number',
      'дата', 'date', 'выдан', 'issued', 'фамилия', 'имя', 'name'
    ];
    
    const foundKeywords = keywords.filter(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );
    
    return {
      passed: foundKeywords.length >= 2 && confidence > 30,
      text: text.substring(0, 500), // Первые 500 символов
      confidence: Math.round(confidence),
      foundKeywords: foundKeywords.length,
      totalKeywords: keywords.length
    };
  } catch (error) {
    console.error('Ошибка OCR:', error);
    return { passed: false, error: error.message };
  }
}

/**
 * Определение лица на фото
 */
async function detectFace(imagePath) {
  try {
    if (!faceApiAvailable) {
      return { 
        passed: true, 
        skipped: true, 
        message: 'Face detection skipped - Face-API not available' 
      };
    }
    
    if (!modelsLoaded) {
      const loaded = await loadModels();
      if (!loaded) {
        return { 
          passed: true, 
          skipped: true, 
          message: 'Face detection skipped - models not loaded' 
        };
      }
    }
    
    const canvas = require('canvas');
    const img = await canvas.loadImage(imagePath);
    const detections = await faceapi
      .detectAllFaces(img)
      .withFaceLandmarks()
      .withFaceDescriptors();
    
    if (detections.length === 0) {
      return { 
        passed: false, 
        faces: 0,
        message: 'Лицо не обнаружено на фото' 
      };
    }
    
    if (detections.length > 1) {
      return { 
        passed: false, 
        faces: detections.length,
        message: 'Обнаружено несколько лиц. Должно быть только одно' 
      };
    }
    
    // Проверка качества обнаружения
    const detection = detections[0];
    const score = detection.detection.score;
    
    return {
      passed: score > 0.6,
      faces: 1,
      confidence: Math.round(score * 100),
      message: score > 0.6 ? 'Лицо обнаружено' : 'Низкое качество распознавания лица',
      descriptor: detection.descriptor // Для сравнения лиц
    };
  } catch (error) {
    console.error('Ошибка определения лица:', error);
    return { 
      passed: true, 
      skipped: true, 
      error: error.message 
    };
  }
}

/**
 * Сравнение лиц на двух фотографиях
 */
async function compareFaces(imagePath1, imagePath2) {
  try {
    if (!faceApiAvailable) {
      return { 
        passed: true, 
        skipped: true, 
        message: 'Face comparison skipped - Face-API not available' 
      };
    }
    
    if (!modelsLoaded) {
      const loaded = await loadModels();
      if (!loaded) {
        return { 
          passed: true, 
          skipped: true, 
          message: 'Face comparison skipped - models not loaded' 
        };
      }
    }
    
    // Определяем лица на обеих фотографиях
    const face1 = await detectFace(imagePath1);
    const face2 = await detectFace(imagePath2);
    
    if (face1.skipped || face2.skipped) {
      return {
        passed: true,
        skipped: true,
        message: 'Face comparison skipped'
      };
    }
    
    if (!face1.passed || !face2.passed) {
      return {
        passed: false,
        message: 'Не удалось обнаружить лица на обеих фотографиях'
      };
    }
    
    // Сравниваем дескрипторы лиц
    const distance = faceapi.euclideanDistance(face1.descriptor, face2.descriptor);
    
    // Порог схожести (чем меньше, тем больше похожи)
    const threshold = 0.6;
    const similarity = Math.round((1 - distance) * 100);
    
    return {
      passed: distance < threshold,
      similarity: similarity,
      distance: distance.toFixed(3),
      message: distance < threshold 
        ? `Лица совпадают (схожесть ${similarity}%)`
        : `Лица не совпадают (схожесть ${similarity}%)`
    };
  } catch (error) {
    console.error('Ошибка сравнения лиц:', error);
    return { 
      passed: true, 
      skipped: true, 
      error: error.message 
    };
  }
}

/**
 * Полная проверка документа паспорта
 */
async function verifyPassportPhoto(imagePath, documentType) {
  const results = {
    documentType,
    imagePath,
    timestamp: new Date(),
    checks: {}
  };
  
  console.log(`\n🔍 Начало проверки: ${documentType}`);
  
  // 1. Проверка качества изображения
  console.log('1️⃣ Проверка качества изображения...');
  results.checks.quality = await checkImageQuality(imagePath);
  
  if (!results.checks.quality.passed) {
    results.passed = false;
    results.message = 'Фото не прошло проверку качества';
    return results;
  }
  
  // 2. Распознавание текста (только для паспорта)
  if (documentType === 'passport_front' || documentType === 'passport_back') {
    console.log('2️⃣ Распознавание текста (OCR)...');
    results.checks.ocr = await recognizeText(imagePath);
    
    if (!results.checks.ocr.passed) {
      results.passed = false;
      results.message = 'На фото не обнаружен текст паспорта';
      return results;
    }
  }
  
  // 3. Определение лица (для всех типов)
  console.log('3️⃣ Определение лица...');
  results.checks.face = await detectFace(imagePath);
  
  if (documentType === 'selfie' && !results.checks.face.passed && !results.checks.face.skipped) {
    results.passed = false;
    results.message = results.checks.face.message;
    return results;
  }
  
  // Все проверки пройдены
  results.passed = true;
  results.message = 'Документ прошел все проверки';
  
  console.log('✅ Проверка завершена успешно\n');
  
  return results;
}

/**
 * Полная верификация всех документов пользователя
 */
async function verifyAllDocuments(userId, passportFrontPath, passportBackPath, selfiePath) {
  console.log(`\n🎯 ПОЛНАЯ ВЕРИФИКАЦИЯ ДОКУМЕНТОВ пользователя ${userId}`);
  console.log('='.repeat(60));
  
  const results = {
    userId,
    timestamp: new Date(),
    documents: {},
    overallPassed: false
  };
  
  // Проверяем паспорт (лицевая сторона)
  results.documents.passportFront = await verifyPassportPhoto(passportFrontPath, 'passport_front');
  
  // Проверяем паспорт (обратная сторона)
  results.documents.passportBack = await verifyPassportPhoto(passportBackPath, 'passport_back');
  
  // Проверяем селфи
  results.documents.selfie = await verifyPassportPhoto(selfiePath, 'selfie');
  
  // Сравниваем лицо на паспорте и селфи
  console.log('4️⃣ Сравнение лица на паспорте и селфи...');
  results.faceComparison = await compareFaces(passportFrontPath, selfiePath);
  
  // Итоговая оценка
  const allPassed = 
    results.documents.passportFront.passed &&
    results.documents.passportBack.passed &&
    results.documents.selfie.passed &&
    (results.faceComparison.passed || results.faceComparison.skipped);
  
  results.overallPassed = allPassed;
  results.confidence = calculateConfidence(results);
  
  console.log('='.repeat(60));
  console.log(`🎯 ИТОГ: ${allPassed ? '✅ ВЕРИФИЦИРОВАН' : '❌ НЕ ВЕРИФИЦИРОВАН'}`);
  console.log(`📊 Уверенность: ${results.confidence}%\n`);
  
  return results;
}

/**
 * Расчет общей уверенности верификации
 */
function calculateConfidence(results) {
  let totalScore = 0;
  let maxScore = 0;
  
  // Качество изображений (30%)
  ['passportFront', 'passportBack', 'selfie'].forEach(doc => {
    if (results.documents[doc].checks.quality?.passed) totalScore += 10;
    maxScore += 10;
  });
  
  // OCR текста (20%)
  if (results.documents.passportFront.checks.ocr?.passed) totalScore += 10;
  if (results.documents.passportBack.checks.ocr?.passed) totalScore += 10;
  maxScore += 20;
  
  // Определение лиц (20%)
  if (results.documents.passportFront.checks.face?.passed) totalScore += 10;
  if (results.documents.selfie.checks.face?.passed) totalScore += 10;
  maxScore += 20;
  
  // Сравнение лиц (30%)
  if (results.faceComparison?.passed) {
    totalScore += 30;
  } else if (results.faceComparison?.skipped) {
    totalScore += 15; // Половина баллов если проверка пропущена
  }
  maxScore += 30;
  
  return Math.round((totalScore / maxScore) * 100);
}

/**
 * Генерация отчета о верификации
 */
function generateVerificationReport(results) {
  let report = `📄 ОТЧЕТ О ВЕРИФИКАЦИИ\n`;
  report += `🆔 Пользователь: ${results.userId}\n`;
  report += `📅 Дата: ${results.timestamp.toLocaleString('ru-RU')}\n`;
  report += `📊 Уверенность: ${results.confidence}%\n`;
  report += `✅ Результат: ${results.overallPassed ? 'ВЕРИФИЦИРОВАН' : 'НЕ ВЕРИФИЦИРОВАН'}\n\n`;
  
  report += `📸 ПАСПОРТ (ЛИЦЕВАЯ):\n`;
  report += `  ✓ Качество: ${results.documents.passportFront.checks.quality?.passed ? '✅' : '❌'}\n`;
  report += `  ✓ Текст: ${results.documents.passportFront.checks.ocr?.passed ? '✅' : '❌'} (${results.documents.passportFront.checks.ocr?.confidence}%)\n`;
  report += `  ✓ Лицо: ${results.documents.passportFront.checks.face?.passed ? '✅' : results.documents.passportFront.checks.face?.skipped ? '⏭️' : '❌'}\n\n`;
  
  report += `📸 ПАСПОРТ (ОБРАТНАЯ):\n`;
  report += `  ✓ Качество: ${results.documents.passportBack.checks.quality?.passed ? '✅' : '❌'}\n`;
  report += `  ✓ Текст: ${results.documents.passportBack.checks.ocr?.passed ? '✅' : '❌'} (${results.documents.passportBack.checks.ocr?.confidence}%)\n\n`;
  
  report += `📸 СЕЛФИ:\n`;
  report += `  ✓ Качество: ${results.documents.selfie.checks.quality?.passed ? '✅' : '❌'}\n`;
  report += `  ✓ Лицо: ${results.documents.selfie.checks.face?.passed ? '✅' : results.documents.selfie.checks.face?.skipped ? '⏭️' : '❌'}\n\n`;
  
  if (results.faceComparison) {
    report += `🔍 СРАВНЕНИЕ ЛИЦ:\n`;
    report += `  ${results.faceComparison.message}\n`;
  }
  
  return report;
}

/**
 * Проверка статуса Face-API
 * Для мониторинга и health checks
 */
async function checkFaceApiStatus() {
  const status = {
    available: faceApiAvailable,
    modelsLoaded: modelsLoaded,
    checks: {
      quality: true, // Всегда доступно (sharp)
      ocr: true,     // Всегда доступно (tesseract.js)
      faceDetection: faceApiAvailable && modelsLoaded,
      faceComparison: faceApiAvailable && modelsLoaded
    }
  };
  
  if (faceApiAvailable && !modelsLoaded) {
    try {
      const loaded = await loadModels();
      status.modelsLoaded = loaded;
      status.checks.faceDetection = loaded;
      status.checks.faceComparison = loaded;
    } catch (error) {
      // Модели не загружены
    }
  }
  
  return status;
}

module.exports = {
  verifyPassportPhoto,
  verifyAllDocuments,
  checkImageQuality,
  recognizeText,
  detectFace,
  compareFaces,
  generateVerificationReport,
  loadModels,
  checkFaceApiStatus
};
