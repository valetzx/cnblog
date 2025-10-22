import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const BoardView = forwardRef(({ config, data, fieldConfigs }, ref) => {
  // 从配置中获取分组字段（通常是labels）
  const groupField = config?.group?.field || 'labels';
  const customOrders = config?.group?.customOrders || {};
  const customVisible = config?.group?.customVisible || {};

  // 合并issues和pull_requests作为任务数据
  const allResources = [...(data?.issues || []), ...(data?.pull_requests || [])];

  // 获取字段配置中的标签信息
  const getLabelInfo = (labelId) => {
    if (!fieldConfigs || typeof fieldConfigs !== 'object') return null;

    // 处理字段配置的对象格式（如 {"0": {...}, "1": {...}}）
    const fieldConfigsArray = Array.isArray(fieldConfigs)
      ? fieldConfigs
      : Object.values(fieldConfigs);

    // 查找label字段配置 - 尝试多种可能的字段名
    const labelField = fieldConfigsArray.find(
      field => field && field.name && (
        field.name === 'label' ||
        field.name === 'labels' ||
        field.name === 'Label' ||
        field.name === 'Labels'
      )
    );

    if (!labelField || !labelField.value) return null;

    // 处理标签值的不同格式
    let labelValues = [];
    if (Array.isArray(labelField.value)) {
      labelValues = labelField.value;
    } else if (typeof labelField.value === 'object') {
      // 处理对象格式的标签值
      labelValues = Object.values(labelField.value);
    }

    // 查找匹配的标签
    return labelValues.find(label =>
      label &&
      (label.id === labelId ||
       label.value === labelId ||
       label.name === labelId)
    );
  };

  // 根据分组字段对任务进行分组
  const groupTasks = () => {
    const grouped = {};

    allResources.forEach(resource => {
      const groupValue = resource[groupField];

      // 处理标签对象数组（如 [{id: "...", name: "..."}, ...]）
      if (Array.isArray(groupValue) && groupValue.length > 0 && typeof groupValue[0] === 'object') {
        groupValue.forEach(label => {
          if (label && label.id) {
            const groupKey = label.id;
            if (!grouped[groupKey]) {
              grouped[groupKey] = [];
            }
            grouped[groupKey].push(resource);
          }
        });
      } else if (Array.isArray(groupValue)) {
        // 处理数组类型的值（如多个标签ID）
        groupValue.forEach(value => {
          const groupKey = value;
          if (groupKey) {
            if (!grouped[groupKey]) {
              grouped[groupKey] = [];
            }
            grouped[groupKey].push(resource);
          }
        });
      } else if (groupValue) {
        // 处理单个值
        const groupKey = typeof groupValue === 'object' ? groupValue.id : groupValue;
        if (groupKey) {
          if (!grouped[groupKey]) {
            grouped[groupKey] = [];
          }
          grouped[groupKey].push(resource);
        }
      } else {
        // 没有分组值的任务
        if (!grouped['未分组']) {
          grouped['未分组'] = [];
        }
        grouped['未分组'].push(resource);
      }
    });

    return grouped;
  };

  const groupedTasks = groupTasks();

  // 获取列的顺序
  const getColumnOrder = () => {
    // 处理自定义排序配置
    if (customOrders && customOrders.field === groupField && Array.isArray(customOrders.value)) {
      // 过滤掉空值并确保只包含实际存在的组
      const orderedColumns = customOrders.value.filter(
        value => value && groupedTasks[value]
      );

      // 添加未在自定义排序中但实际存在的组
      const allColumns = Object.keys(groupedTasks);
      const remainingColumns = allColumns.filter(
        column => !orderedColumns.includes(column) && column !== '未分组'
      );

      return [...orderedColumns, ...remainingColumns, '未分组'].filter(Boolean);
    }

    // 默认返回所有组的键，将"未分组"放在最后
    const allColumns = Object.keys(groupedTasks);
    const ungroupedIndex = allColumns.indexOf('未分组');
    if (ungroupedIndex > -1) {
      allColumns.splice(ungroupedIndex, 1);
      allColumns.push('未分组');
    }

    return allColumns;
  };

  const columnOrder = getColumnOrder();

  // 渲染任务卡片
  const renderTaskCard = (task, index) => {
    const priorityColors = {
      '-2P': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      '-1P': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'P0': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'P1': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'P2': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'P3': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      '': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };

    return (
      <div
        key={index}
        className="bg-white dark:bg-slate-700 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600 p-3 mb-1 hover:shadow-md transition-shadow cursor-pointer"
      >
        {/* 标题 */}
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1 line-clamp-2">
          {task.title || `任务 ${index + 1}`}
        </h4>

        {/* 优先级标签 */}
        {task.priority && (
          <span className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mb-1",
            priorityColors[task.priority] || priorityColors['']
          )}>
            {task.priority}
          </span>
        )}

        {/* 描述 */}
        {task.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 mb-1">
            {task.description}
          </p>
        )}

        {/* 元信息 */}
        <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
          <span>#{index + 1}</span>
          {task.created_at && (
            <span>
              {new Date(task.created_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    );
  };

  // 渲染列
  const renderColumn = (groupKey, index) => {
    const tasks = groupedTasks[groupKey] || [];
    const labelInfo = getLabelInfo(groupKey);
    const isVisible = !(
      customVisible.field === groupField &&
      customVisible.value?.some(item => item.value === groupKey && !item.visible)
    );

    if (!isVisible) return null;

    return (
      <div
        key={groupKey}
        className="flex-shrink-0 w-72 bg-gray-50 dark:bg-slate-800 rounded-lg p-3"
      >
        {/* 列标题 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            {labelInfo?.color && (
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: labelInfo.color }}
              />
            )}
            <h3 className="font-medium text-gray-900 dark:text-white">
              {labelInfo?.name || groupKey}
            </h3>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>

        {/* 任务列表 */}
        <div className="space-y-1">
          {tasks.map((task, taskIndex) => renderTaskCard(task, taskIndex))}
        </div>

        {/* 空状态 */}
        {tasks.length === 0 && (
          <div className="text-center text-gray-400 dark:text-gray-500 py-8">
            <div className="text-sm">暂无任务</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* 看板标题和描述 */}
        {config?.description && (
          <p className="text-gray-600 dark:text-gray-300">
            {config.description}
          </p>
        )}

      {/* 水平滚动的列容器 */}
      <div
        ref={ref}
        className="overflow-x-auto mission-board-container"
        style={{ overflowY: 'hidden' }}
      >
        <div className="flex space-x-2 min-w-max">
          {columnOrder.map((groupKey, index) => renderColumn(groupKey, index))}
        </div>
      </div>
    </div>
  );
});

BoardView.displayName = 'BoardView';

export default BoardView;
