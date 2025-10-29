import React, { useState, useRef, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Code, AlertCircle, Search, X, GitBranch, Tag, Loader2, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/fetchPage/LoadingSpinner';
import UserRepo from '@/cnbRepos/userRepo';
import { getRepoBranchesFromCache, getCacheMetadata, saveRepoBranches } from '@/cnbRepos/indexedDB';
import RepoIssues from '@/cnbRepos/repoIssues';
import { toast } from '@/components/ui/sonner';

const Repo = () => {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const repopath = params['*'] || '';
  const [selectedTag, setSelectedTag] = useState('coderepo');
  const [searchKey, setSearchKey] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const searchInputRef = useRef(null);

  // 标签定义
  const tags = [
    { id: 'coderepo', label: '代码', icon: <Code size={16} /> },
    { id: 'codeissue', label: 'ISSUE', icon: <AlertCircle size={16} /> },
    { id: 'codewiki', label: 'WIKI', icon: <BookOpen size={16} /> },
  ];

  // 解析查询参数
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tagParam = searchParams.get('tag');

    if (tagParam) {
      // 检查标签是否存在
      const tagExists = tags.some(tag => tag.id === tagParam);
      if (tagExists) {
        setSelectedTag(tagParam);
      }
    }
  }, [location.search]);

  // 获取仓库分支
  const fetchBranches = async () => {
    try {
      setLoading(true);
      setError(null);

      // 首先检查缓存
      const cachedBranches = await getRepoBranchesFromCache(repopath);
      const metadata = await getCacheMetadata(`repo_branches_${repopath.replace(/[\/]/g, '_')}`);

      // 如果缓存存在且未过期（比如1小时内），使用缓存
      if (cachedBranches.length > 0 && metadata) {
        const cacheAge = new Date() - new Date(metadata.last_updated);
        if (cacheAge < 3600000) { // 1小时
          setBranches(cachedBranches);
          // 自动选择默认分支
          const defaultBranch = cachedBranches.find(b => b.is_head) || cachedBranches[0];
          if (defaultBranch) {
            setSelectedBranch(defaultBranch);
          }
          setLoading(false);
          return;
        }
      }

      // 从API获取分支
      const response = await fetch(
        `${import.meta.env.VITE_CNBCOOKIE_API_URL}/${repopath}/-/git/refs?page=1&page_size=5000&prefix=branch&q=`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_CNBCOOKIE}`,
            'Accept': 'application/vnd.cnb.web+json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`获取分支失败: ${response.status} ${response.statusText}`);
      }

      const branchesData = await response.json();
      // 将API返回的对象格式转换为数组格式
      const branchesArray = Object.keys(branchesData)
        .filter(key => key !== '_cookies' && !isNaN(key))
        .map(key => branchesData[key]);

      setBranches(branchesArray);

      // 保存到缓存
      await saveRepoBranches(repopath, branchesArray);

      // 自动选择默认分支
      const defaultBranch = branchesArray.find(b => b.is_head) || branchesArray[0];
      if (defaultBranch) {
        setSelectedBranch(defaultBranch);
      }
    } catch (err) {
      setError(err.message);
      console.error('获取分支失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 处理搜索清除
  const handleSearchClear = () => {
    setSearchKey('');
    setIsSearchExpanded(false);
  };

  // 处理搜索图标点击
  const handleSearchIconClick = () => {
    setIsSearchExpanded(true);
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
  };

  // 处理标签点击
  const handleTagClick = (tagId) => {
    const newSelectedTag = tagId === selectedTag ? 'coderepo' : tagId;
    setSelectedTag(newSelectedTag);

    // 更新URL查询参数
    const searchParams = new URLSearchParams(location.search);
    if (newSelectedTag === 'coderepo') {
      searchParams.delete('tag');
    } else {
      searchParams.set('tag', newSelectedTag);
    }

    const newSearch = searchParams.toString();
    navigate({
      pathname: location.pathname,
      search: newSearch ? `?${newSearch}` : ''
    }, { replace: true });
  };

  // 处理分支选择
  const handleBranchChange = (branchName) => {
    const branch = branches.find(b => b.ref === `refs/heads/${branchName}`);
    if (branch) {
      setSelectedBranch(branch);
    }
  };

  // 组件挂载时获取分支
  useEffect(() => {
    if (repopath) {
      fetchBranches();
    }
  }, [repopath]);

  // 获取分支显示名称
  const getBranchDisplayName = (branchRef) => {
    return branchRef.replace('refs/heads/', '');
  };

  // 处理云原生开发按钮点击
  const handleCloudNativeDev = async () => {
    if (!selectedBranch) {
      toast.error('请先选择分支');
      return;
    }

    setWorkspaceLoading(true);

    try {
      const session = localStorage.getItem('CNBSESSION'); // 获取session
      const branchName = getBranchDisplayName(selectedBranch.ref);

      const response = await fetch(`${import.meta.env.VITE_CNBCOOKIE_API_URL}/${repopath}/-/workspace/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_CNBCOOKIE}`,
          'Content-Type': 'application/json',
          'session': session || ''
        },
        body: JSON.stringify({
          ref: selectedBranch.ref,
          branch: branchName,
          language: 'zh-CN'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        // 处理错误情况
        if (result.errcode === 16) {
          toast.error('由于用户未登录，该任务将不会运行。');
        } else if (result.errcode === 403) {
          toast.warning('当前用户没有权限，请尝试fork后启动');
        } else {
          toast.error(result.errmsg || '启动云原生开发失败');
        }
        return;
      }

      // 成功情况
      if (result.url) {
        // 在url末尾添加&webIDE=false
        const workspaceUrl = result.url + '&webIDE=false';
        window.open(workspaceUrl, '_blank');
        toast.success('云原生开发环境启动成功');
      }
    } catch (err) {
      console.error('启动云原生开发失败:', err);
      toast.error('启动云原生开发失败，请稍后重试');
    } finally {
      setWorkspaceLoading(false);
    }
  };

  if (loading && !branches.length) {
    return (
      <LoadingSpinner />
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500 text-center">
          <p>加载分支信息失败</p>
          <p className="text-sm text-gray-600 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-2 sm:p-4 pb-10">
      <div className="mx-auto">
        {/* 标签过滤器 */}
        <div className="mb-4 w-full overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          <div className="flex space-x-2 min-w-max">
            {/* 搜索按钮 */}
            {isSearchExpanded ? (
              <form className="flex items-center">
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchKey}
                    onChange={(e) => setSearchKey(e.target.value)}
                    placeholder="搜索仓库内容..."
                    className="px-3 py-1.5 text-sm rounded-full border border-gray-300 dark:border-gray-600 focus:outline-none pr-8"
                    style={{ width: '200px' }}
                  />
                  <button
                    type="button"
                    onClick={handleSearchClear}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    <X size={16} />
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={handleSearchIconClick}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors flex items-center",
                  "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
                )}
              >
                <Search size={16} className="mr-1" />
                搜索
              </button>
            )}

            {/* 标签按钮 */}
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleTagClick(tag.id)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors flex items-center gap-1",
                  selectedTag === tag.id
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
                )}
              >
                {tag.icon}
                {tag.label}
              </button>
            ))}
          </div>
        </div>

        {/* 仓库信息头部 */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl font-bold">{repopath}</h1>
                <p className="text-muted-foreground dark:text-gray-400">仓库路径</p>

                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {/* 分支选择器 */}
                  <div className="flex items-center gap-2">
                    <GitBranch size={16} className="text-muted-foreground" />
                    <Select
                      value={selectedBranch ? getBranchDisplayName(selectedBranch.ref) : ''}
                      onValueChange={handleBranchChange}
                      disabled={branches.length === 0}
                    >
                      <SelectTrigger className="w-32 h-6 text-xs">
                        <SelectValue placeholder="选择分支" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem
                            key={branch.ref}
                            value={getBranchDisplayName(branch.ref)}
                          >
                            {getBranchDisplayName(branch.ref)}
                            {branch.is_head && (
                              <span className="ml-1 text-xs bg-green-100 text-green-700 px-1 rounded">
                                default
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                    <Tag size={16} />
                    Tag
                  </Badge>

                  {/* 右侧按钮组 */}
                  <div className="flex items-center gap-2 ml-auto">
                    {/* 执行选择器按钮 */}
                    <Select>
                      <SelectTrigger className="h-6 text-xs w-15 [&>svg]:hidden flex items-center justify-center">
                        <SelectValue placeholder="执行" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="option1">启动开发</SelectItem>
                        <SelectItem value="option2">构建发布</SelectItem>
                        <SelectItem value="option3">知识库</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* 云原生开发按钮 */}
                    <Button
                      className="h-6 text-xs px-2"
                      style={{ backgroundColor: '#EB5A00', color: 'white' }}
                      onClick={handleCloudNativeDev}
                      disabled={workspaceLoading}
                    >
                      {workspaceLoading ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          启动中...
                        </>
                      ) : (
                        '云原生开发'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 内容区域 - 根据选中的标签显示不同内容 */}
        {selectedTag === 'coderepo' && selectedBranch && (
          <UserRepo
            repoPath={repopath}
            initialBranchHash={selectedBranch.target_hash}
            key={selectedBranch.target_hash} // 使用key强制重新渲染
          />
        )}

        {selectedTag === 'codeissue' && (
          <RepoIssues /> // 使用新的RepoIssues组件替换原有占位内容
        )}
      </div>
    </div>
  );
};

export default Repo;
