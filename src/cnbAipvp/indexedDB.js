// IndexedDB工具类
class IndexedDBManager {
  constructor(dbName, version = 1) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
  }

  // 打开数据库
  async open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 创建角色存储对象
        if (!db.objectStoreNames.contains('roles')) {
          const store = db.createObjectStore('roles', { keyPath: 'id' });
          // 创建过期时间索引
          store.createIndex('expiresAt', 'expiresAt', { unique: false });
        }

        // 创建元数据存储对象
        if (!db.objectStoreNames.contains('metadata')) {
          const store = db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  // 存储角色数据
  async setRole(role, ttl = 30 * 60 * 1000) { // 默认30分钟
    if (!this.db) await this.open();

    const transaction = this.db.transaction(['roles'], 'readwrite');
    const store = transaction.objectStore('roles');

    const item = {
      ...role,
      expiresAt: Date.now() + ttl
    };

    return new Promise((resolve, reject) => {
      const request = store.put(item);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // 获取角色数据
  async getRole(id) {
    if (!this.db) await this.open();

    const transaction = this.db.transaction(['roles'], 'readonly');
    const store = transaction.objectStore('roles');

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.expiresAt > Date.now()) {
          resolve(result);
        } else {
          // 数据已过期或不存在
          resolve(null);
        }
      };
    });
  }

  // 批量存储角色数据
  async setRoles(roles, ttl = 30 * 60 * 1000) {
    if (!this.db) await this.open();

    const transaction = this.db.transaction(['roles'], 'readwrite');
    const store = transaction.objectStore('roles');

    const promises = roles.map(role => {
      const item = {
        ...role,
        expiresAt: Date.now() + ttl
      };

      return new Promise((resolve, reject) => {
        const request = store.put(item);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    });

    return Promise.all(promises);
  }

  // 获取所有角色数据
  async getAllRoles() {
    if (!this.db) await this.open();

    const transaction = this.db.transaction(['roles'], 'readonly');
    const store = transaction.objectStore('roles');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const now = Date.now();
        const validRoles = request.result.filter(role => role.expiresAt > now);
        resolve(validRoles);
      };
    });
  }

  // 清除过期数据
  async clearExpired() {
    if (!this.db) await this.open();

    const transaction = this.db.transaction(['roles'], 'readwrite');
    const store = transaction.objectStore('roles');
    const index = store.index('expiresAt');

    return new Promise((resolve, reject) => {
      const request = index.openCursor(IDBKeyRange.upperBound(Date.now()));
      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }

  // 设置元数据
  async setMetadata(key, value) {
    if (!this.db) await this.open();

    const transaction = this.db.transaction(['metadata'], 'readwrite');
    const store = transaction.objectStore('metadata');

    const item = { key, value };

    return new Promise((resolve, reject) => {
      const request = store.put(item);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // 获取元数据
  async getMetadata(key) {
    if (!this.db) await this.open();

    const transaction = this.db.transaction(['metadata'], 'readonly');
    const store = transaction.objectStore('metadata');

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ? request.result.value : null);
    });
  }
}

// 创建全局实例
export const roleDB = new IndexedDBManager('cnb_pvp_roles');

export default IndexedDBManager;
