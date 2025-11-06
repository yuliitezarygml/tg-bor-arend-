"""
Адаптер для работы с MongoDB
Используется для совместимости с существующим кодом
"""
from core.mongodb import get_mongodb_manager
from utils.logger import logger


class DataManager:
    """Адаптер для работы с MongoDB (замена JSON)"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self.mongo = get_mongodb_manager()
        self._initialized = True
    
    def load(self, filename: str):
        """Загрузить данные из MongoDB коллекции"""
        try:
            collection_name = filename.replace('.json', '')
            docs = self.mongo.find_all(collection_name)
            
            # Преобразуем в старый формат {id: {...}}
            result = {}
            for doc in docs:
                doc_id = doc.get('_id', doc.get('id'))
                if '_id' in doc:
                    del doc['_id']
                result[doc_id] = doc
            
            return result
        except Exception as e:
            logger.error(f"Ошибка загрузки {filename}: {e}")
            return {}
    
    def save(self, filename: str, data):
        """Сохранить данные в MongoDB коллекцию"""
        try:
            collection_name = filename.replace('.json', '')
            self.mongo.drop_collection(collection_name)
            
            if isinstance(data, dict):
                for doc_id, doc_data in data.items():
                    if isinstance(doc_data, dict):
                        doc_data['_id'] = doc_id
                        self.mongo.insert_one(collection_name, doc_data)
            
            return True
        except Exception as e:
            logger.error(f"Ошибка сохранения {filename}: {e}")
            return False


# Глобальный экземпляр менеджера
_db_manager = None


def get_db_manager():
    """Получить экземпляр менеджера данных (Singleton)"""
    global _db_manager
    if _db_manager is None:
        _db_manager = DataManager()
    return _db_manager

