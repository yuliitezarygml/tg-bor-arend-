"""
MongoDB data access layer
Заменяет JSON для работы с базой данных
"""
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from contextlib import contextmanager
from utils.logger import logger
import os
from dotenv import load_dotenv

load_dotenv()

class MongoDBManager:
    """Менеджер для работы с MongoDB"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        # Параметры подключения
        self.mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
        self.db_name = os.getenv('MONGO_DB', 'tg_rental')
        
        try:
            self.client = MongoClient(self.mongo_uri, serverSelectionTimeoutMS=5000)
            # Проверка подключения
            self.client.admin.command('ping')
            self.db = self.client[self.db_name]
            logger.info(f"✅ Подключение к MongoDB: {self.mongo_uri}")
            logger.info(f"📊 База данных: {self.db_name}")
            self._initialized = True
            self._init_collections()
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            logger.error(f"❌ Ошибка подключения к MongoDB: {e}")
            logger.warning("💾 Используется локальный режим (JSON fallback)")
            self.client = None
            self.db = None
            self._initialized = True
    
    def _init_collections(self):
        """Инициализация коллекций и индексов"""
        if self.db is None:
            return
        
        collections = {
            'consoles': ['id'],
            'users': ['telegram_id'],
            'rentals': ['id'],
            'rental_requests': ['id'],
            'admin_settings': [],
            'discounts': ['id'],
            'temp_reservations': ['id'],
            'calendar': [],
            'ratings': ['id'],
            'blocked_dates': ['id'],
            'admins': ['username']
        }
        
        for collection_name, index_fields in collections.items():
            if collection_name not in self.db.list_collection_names():
                self.db.create_collection(collection_name)
                logger.info(f"📋 Создана коллекция: {collection_name}")
            
            # Создаем индексы
            collection = self.db[collection_name]
            for field in index_fields:
                try:
                    collection.create_index(field, unique=True)
                    logger.debug(f"🔑 Создан индекс на {collection_name}.{field}")
                except Exception as e:
                    logger.debug(f"Индекс уже существует: {e}")
    
    def is_connected(self):
        """Проверка подключения к MongoDB"""
        return self.db is not None
    
    def get_collection(self, collection_name):
        """Получить коллекцию"""
        if not self.is_connected():
            raise ConnectionError("MongoDB не подключена")
        return self.db[collection_name]
    
    def insert_one(self, collection_name, document):
        """Вставить один документ"""
        collection = self.get_collection(collection_name)
        result = collection.insert_one(document)
        return result.inserted_id
    
    def insert_many(self, collection_name, documents):
        """Вставить много документов"""
        collection = self.get_collection(collection_name)
        result = collection.insert_many(documents)
        return result.inserted_ids
    
    def find_one(self, collection_name, query):
        """Найти один документ"""
        collection = self.get_collection(collection_name)
        return collection.find_one(query)
    
    def find(self, collection_name, query=None, sort=None, limit=None):
        """Найти документы"""
        collection = self.get_collection(collection_name)
        cursor = collection.find(query or {})
        
        if sort:
            cursor = cursor.sort(sort[0], sort[1])
        if limit:
            cursor = cursor.limit(limit)
        
        return list(cursor)
    
    def find_all(self, collection_name):
        """Получить все документы"""
        collection = self.get_collection(collection_name)
        return list(collection.find({}))
    
    def update_one(self, collection_name, query, update):
        """Обновить один документ"""
        collection = self.get_collection(collection_name)
        result = collection.update_one(query, {'$set': update})
        return result.modified_count
    
    def update_many(self, collection_name, query, update):
        """Обновить много документов"""
        collection = self.get_collection(collection_name)
        result = collection.update_many(query, {'$set': update})
        return result.modified_count
    
    def delete_one(self, collection_name, query):
        """Удалить один документ"""
        collection = self.get_collection(collection_name)
        result = collection.delete_one(query)
        return result.deleted_count
    
    def delete_many(self, collection_name, query):
        """Удалить много документов"""
        collection = self.get_collection(collection_name)
        result = collection.delete_many(query)
        return result.deleted_count
    
    def replace_one(self, collection_name, query, document):
        """Заменить один документ"""
        collection = self.get_collection(collection_name)
        result = collection.replace_one(query, document)
        return result.modified_count
    
    def count(self, collection_name, query=None):
        """Подсчитать документы"""
        collection = self.get_collection(collection_name)
        return collection.count_documents(query or {})
    
    def aggregate(self, collection_name, pipeline):
        """Агрегация документов"""
        collection = self.get_collection(collection_name)
        return list(collection.aggregate(pipeline))
    
    def drop_collection(self, collection_name):
        """Удалить коллекцию"""
        if self.is_connected():
            self.db.drop_collection(collection_name)
            logger.info(f"🗑️  Удалена коллекция: {collection_name}")
    
    def close(self):
        """Закрыть подключение"""
        if self.client:
            self.client.close()
            logger.info("🔌 Подключение MongoDB закрыто")

def get_mongodb_manager():
    """Получить синглтон MongoDB менеджера"""
    return MongoDBManager()
