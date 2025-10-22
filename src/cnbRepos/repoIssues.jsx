import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CardContent, CardHeader, Card, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const RepoIssues = () => {
  const params = useParams();
  const repopath = params['*'] || ''; // 从URL获取仓库路径

  const [issues, setIssues] = useState([]);
  const [closedIssues, setClosedIssues] = useState([]);
  const [allIssues, setAllIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [displayIssues, setDisplayIssues] = useState([]);

  // 从本地存储获取设置
  const getSettings = () => {
    const savedSettings = localStorage.getItem('settingsData');
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      return {
        apiUrl: parsedSettings.apiUrl || import.meta.env.VITE_API_URL || '',
        cnbToken: parsedSettings.cnbToken || import.meta.env.VITE_CNB_TOKEN || '',
        pageNum: parsedSettings.pageNum || 1,
        sizeNum: parsedSettings.sizeNum || 20,
        hideIssueNumbers: parsedSettings.hideIssueNumbers !== undefined ? parsedSettings.hideIssueNumbers : true,
        hideStateLabels: parsedSettings.hideStateLabels !== undefined ? parsedSettings.hideStateLabels : true
      };
    }
    return {
      apiUrl: import.meta.env.VITE_API_URL || '',
      cnbToken: import.meta.env.VITE_CNB_TOKEN || '',
      pageNum: 1,
      sizeNum: 20,
      hideIssueNumbers: true,
      hideStateLabels: true
    };
  };

  // 获取issue数据
  const fetchIssues = async () => {
    try {
      setLoading(true);
      setError(null);

      const settings = getSettings();

      if (!settings.apiUrl || !settings.cnbToken) {
        throw new Error('请先配置API设置');
      }

      if (!repopath) {
        throw new Error('仓库路径不能为空');
      }

      // 获取开启状态的问题
      const openResponse = await fetch(
        `${settings.apiUrl}/${repopath}/-/issues?page=${settings.pageNum}&page_size=${settings.sizeNum}`,
        {
          headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${settings.cnbToken}`
          }
        }
      );

      // 获取关闭状态的问题
      const closedResponse = await fetch(
        `${settings.apiUrl}/${repopath}/-/issues?page=${settings.pageNum}&page_size=${settings.sizeNum}&state=closed`,
        {
          headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${settings.cnbToken}`
          }
        }
      );

      if (!openResponse.ok) {
        throw new Error(`获取开启issue失败: ${openResponse.status} ${openResponse.statusText}`);
      }

      if (!closedResponse.ok) {
        throw new Error(`获取关闭issue失败: ${closedResponse.status} ${closedResponse.statusText}`);
      }

      const openData = await openResponse.json();
      const closedData = await closedResponse.json();

      setIssues(openData);
      setClosedIssues(closedData);
      setAllIssues([...openData, ...closedData]);
      setDisplayIssues([...openData, ...closedData]);

    } catch (err) {
      setError(err.message);
      console.error('获取issue失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时获取issue数据
  useEffect(() => {
    if (repopath) {
      fetchIssues();
    }
  }, [repopath]);

  // 格式化日期
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 将十六进制颜色转换为HSL并调整亮度
  const getTextColorFromBg = (bgColor) => {
    const r = parseInt(bgColor.slice(1, 3), 16);
    const g = parseInt(bgColor.slice(3, 5), 16);
    const b = parseInt(bgColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#333333' : '#ffffff';
  };

  // 渲染标签
  const renderLabels = (labels, state, hideStateLabels) => {
    // 准备标签列表，根据设置决定是否添加状态标签
    let allLabels = [...(labels || [])];

    // 只有当不需要隐藏状态标签时，才添加状态标签到最前面
    if (!hideStateLabels) {
      const stateLabel = {
        name: state === 'open' ? '开启' : '关闭',
        color: state === 'open' ? '#dcfce7' : '#fee2e2'
      };
      allLabels = [stateLabel, ...allLabels];
    }

    if (allLabels.length === 0) return null;
    const isSingleLine = allLabels.length <= 3;

    return (
      <div className={`overflow-x-auto pb-2 -mx-2 px-2 overflow-y-hidden ${isSingleLine ? 'h-6' : ''}`}>
        <div className="flex flex-nowrap gap-0.5 min-w-max">
          {allLabels.map((label, index) => (
            <div
              key={index}
              className="px-2 py-0.5 text-xs rounded font-medium mr-1 cnb-label-item light shrink-0"
              style={{
                backgroundColor: label.color,
                color: getTextColorFromBg(label.color)
              }}
            >
              <span title={label.name}>{label.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="ml-2 text-muted-foreground">加载issue信息中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive text-center">
          <p>加载issue信息失败</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const settings = getSettings();

  return (
    <div>
      <div>
        {displayIssues.length > 0 ? (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 sm:gap-4 space-y-4">
            {displayIssues.map((issue) => (
              <div key={issue.number} className="break-inside-avoid">
                <Card className="w-full hover:shadow-md transition-shadow flex flex-col">
                  <Link to={`/info/${issue.number}/${repopath}`} className="flex flex-col h-full">
                    <CardHeader className="pb-3 flex-shrink-0">
                      <CardTitle className="text-base sm:text-lg line-clamp-2">
                        {settings.hideIssueNumbers ? null : `#${issue.number} `}{issue.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow flex flex-col">
                      <div className="flex items-center justify-between mb-3 flex-shrink-0">
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          更新于 {formatDate(issue.updated_at)}
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          评论: {issue.comment_count}
                        </div>
                      </div>
                      <div className="mb-3 flex-grow">
                        {/* 传入状态和隐藏设置 */}
                        {renderLabels(issue.labels, issue.state, settings.hideStateLabels)}
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            该仓库暂无问题
          </div>
        )}
      </div>
    </div>
  );
};

export default RepoIssues;
