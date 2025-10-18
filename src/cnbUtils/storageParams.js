/**
 * 从浏览器存储中获取分页参数
 * 支持从 settingsData 获取 pageNum 和 sizeNum 参数
 * 如果不存在则使用默认值
 * @returns {Object} 包含 page 和 pageSize 的对象
 */
export const getStoragePaginationParams = () => {
  try {
    // 从 localStorage 获取存储的设置数据
    const settingsData = localStorage.getItem('settingsData');

    if (settingsData) {
      const settings = JSON.parse(settingsData);
      // 从设置数据中获取分页参数
      const page = settings.pageNum ? parseInt(settings.pageNum, 10) : 1;
      const pageSize = settings.sizeNum ? parseInt(settings.sizeNum, 10) : 20;

      // 确保参数有效
      return {
        page: isNaN(page) || page < 1 ? 1 : page,
        pageSize: isNaN(pageSize) || pageSize < 1 ? 20 : pageSize
      };
    } else {
      // 如果没有设置数据，使用默认值
      return { page: 1, pageSize: 20 };
    }
  } catch (error) {
    console.warn('从存储获取分页参数失败，使用默认值:', error);
    return { page: 1, pageSize: 20 };
  }
};

/**
 * 设置分页参数到浏览器存储
 * @param {number} pageNum - 页码
 * @param {number} sizeNum - 每页数量
 */
export const setStoragePaginationParams = (pageNum, sizeNum) => {
  try {
    // 获取现有的设置数据
    const existingSettings = localStorage.getItem('settingsData');
    let settings = {};

    if (existingSettings) {
      settings = JSON.parse(existingSettings);
    }

    // 更新分页参数
    settings.pageNum = pageNum;
    settings.sizeNum = sizeNum;

    // 保存更新后的设置数据
    localStorage.setItem('settingsData', JSON.stringify(settings));

    // 触发设置更新事件
    localStorage.setItem('settingsUpdated', Date.now().toString());
  } catch (error) {
    console.warn('设置存储分页参数失败:', error);
  }
};
