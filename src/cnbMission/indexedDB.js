// indexedDB工具函数
export class MissionDB {
  constructor() {
    this.dbName = 'cnb_mission';
    this.version = 1;
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
        const oldVersion = event.oldVersion;

        // 处理从版本1到版本2的升级
        if (oldVersion < 2) {
          // 删除旧的missionData存储（如果存在）
          if (db.objectStoreNames.contains('missionData')) {
            db.deleteObjectStore('missionData');
          }

          // 创建新的missionData存储
          const store = db.createObjectStore('missionData', { keyPath: 'id' });
          store.createIndex('missionPath', 'missionPath', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // 创建其他存储（如果不存在）
        if (!db.objectStoreNames.contains('missionTags')) {
          const store = db.createObjectStore('missionTags', { keyPath: 'missionPath' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('missionConfigs')) {
          const store = db.createObjectStore('missionConfigs', { keyPath: 'id' });
          store.createIndex('missionPath', 'missionPath', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('fieldConfigs')) {
          const store = db.createObjectStore('fieldConfigs', { keyPath: 'missionPath' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
    });
  }

  // 存储看板标签
  async storeMissionTags(missionPath, tags) {
    await this.open();
    const transaction = this.db.transaction(['missionTags'], 'readwrite');
    const store = transaction.objectStore('missionTags');

    return new Promise((resolve, reject) => {
      const request = store.put({
        missionPath,
        tags,
        updatedAt: new Date()
      });

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // 获取看板标签
  async getMissionTags(missionPath) {
    await this.open();
    const transaction = this.db.transaction(['missionTags'], 'readonly');
    const store = transaction.objectStore('missionTags');

    return new Promise((resolve, reject) => {
      const request = store.get(missionPath);

      request.onsuccess = () => resolve(request.result?.tags || null);
      request.onerror = () => reject(request.error);
    });
  }

  // 存储看板配置
  async storeMissionConfig(missionPath, uuid, config) {
    await this.open();
    const transaction = this.db.transaction(['missionConfigs'], 'readwrite');
    const store = transaction.objectStore('missionConfigs');

    return new Promise((resolve, reject) => {
      const request = store.put({
        id: `${missionPath}-${uuid}`,
        missionPath,
        uuid,
        config,
        updatedAt: new Date()
      });

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // 获取看板配置
  async getMissionConfig(missionPath, uuid) {
    await this.open();
    const transaction = this.db.transaction(['missionConfigs'], 'readonly');
    const store = transaction.objectStore('missionConfigs');

    return new Promise((resolve, reject) => {
      const request = store.get(`${missionPath}-${uuid}`);

      request.onsuccess = () => resolve(request.result?.config || null);
      request.onerror = () => reject(request.error);
    });
  }

  // 存储字段配置
  async storeFieldConfigs(missionPath, fieldConfigs) {
    await this.open();
    const transaction = this.db.transaction(['fieldConfigs'], 'readwrite');
    const store = transaction.objectStore('fieldConfigs');

    return new Promise((resolve, reject) => {
      const request = store.put({
        missionPath,
        fieldConfigs,
        updatedAt: new Date()
      });

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // 获取字段配置
  async getFieldConfigs(missionPath) {
    await this.open();
    const transaction = this.db.transaction(['fieldConfigs'], 'readonly');
    const store = transaction.objectStore('fieldConfigs');

    return new Promise((resolve, reject) => {
      const request = store.get(missionPath);

      request.onsuccess = () => resolve(request.result?.fieldConfigs || null);
      request.onerror = () => reject(request.error);
    });
  }

  // 存储看板数据
  async storeMissionData(missionPath, uuid, data) {
    await this.open();
    const transaction = this.db.transaction(['missionData'], 'readwrite');
    const store = transaction.objectStore('missionData');

    return new Promise((resolve, reject) => {
      const request = store.put({
        id: `${missionPath}-${uuid}`,
        missionPath,
        uuid,
        data,
        updatedAt: new Date()
      });

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // 获取看板数据
  async getMissionData(missionPath, uuid) {
    await this.open();
    const transaction = this.db.transaction(['missionData'], 'readonly');
    const store = transaction.objectStore('missionData');

    return new Promise((resolve, reject) => {
      const request = store.get(`${missionPath}-${uuid}`);

      request.onsuccess = () => resolve(request.result?.data || null);
      request.onerror = () => reject(request.error);
    });
  }

  // 清除所有数据
  async clearAll() {
    await this.open();
    const transaction = this.db.transaction([
      'missionTags', 'missionConfigs', 'fieldConfigs', 'missionData'
    ], 'readwrite');

    const promises = [];

    promises.push(
      new Promise((resolve, reject) => {
        const request = transaction.objectStore('missionTags').clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
    );

    promises.push(
      new Promise((resolve, reject) => {
        const request = transaction.objectStore('missionConfigs').clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
    );

    promises.push(
      new Promise((resolve, reject) => {
        const request = transaction.objectStore('fieldConfigs').clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
    );

    promises.push(
      new Promise((resolve, reject) => {
        const request = transaction.objectStore('missionData').clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
    );

    return Promise.all(promises);
  }
}

// 创建全局实例
export const missionDB = new MissionDB();
