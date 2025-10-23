import React, { useState, useEffect } from 'react';
import { File, Folder, GitBranch, Code, Loader2 } from 'lucide-react';
import { saveRepoBranches, saveRepoFiles, getRepoBranchesFromCache, getRepoFilesFromCache, getCacheMetadata } from './indexedDB';

const UserRepo = ({ repoPath, initialBranchHash }) => {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 获取仓库分支
  const fetchBranches = async () => {
    try {
      setLoading(true);
      setError(null);

      // 首先检查缓存
      const cachedBranches = await getRepoBranchesFromCache(repoPath);
      const metadata = await getCacheMetadata(`repo_branches_${repoPath.replace(/[\/]/g, '_')}`);

      // 如果缓存存在且未过期（比如1小时内），使用缓存
      if (cachedBranches.length > 0 && metadata) {
        const cacheAge = new Date() - new Date(metadata.last_updated);
        if (cacheAge < 3600000) { // 1小时
          setBranches(cachedBranches);
          // 自动选择默认分支或初始分支
          let targetBranch = cachedBranches.find(b => b.is_head) || cachedBranches[0];
          if (initialBranchHash) {
            targetBranch = cachedBranches.find(b => b.target_hash === initialBranchHash) || targetBranch;
          }
          if (targetBranch) {
            setSelectedBranch(targetBranch);
            await fetchFiles(targetBranch.target_hash);
          }
          setLoading(false);
          return;
        }
      }

      // 从API获取分支
      const response = await fetch(
        `${import.meta.env.VITE_CNBCOOKIE_API_URL}/${repoPath}/-/git/refs?page=1&page_size=5000&prefix=branch&q=`,
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
      await saveRepoBranches(repoPath, branchesArray);

      // 自动选择默认分支或初始分支
      let targetBranch = branchesArray.find(b => b.is_head) || branchesArray[0];
      if (initialBranchHash) {
        targetBranch = branchesArray.find(b => b.target_hash === initialBranchHash) || targetBranch;
      }
      if (targetBranch) {
        setSelectedBranch(targetBranch);
        await fetchFiles(targetBranch.target_hash);
      }
    } catch (err) {
      setError(err.message);
      console.error('获取分支失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 获取文件列表
  const fetchFiles = async (branchHash) => {
    try {
      setLoading(true);
      setError(null);

      // 首先检查缓存
      const cachedFiles = await getRepoFilesFromCache(repoPath, branchHash);
      const metadata = await getCacheMetadata(`repo_files_${repoPath.replace(/[\/]/g, '_')}_${branchHash}`);

      // 如果缓存存在且未过期，使用缓存
      if (cachedFiles.length > 0 && metadata) {
        const cacheAge = new Date() - new Date(metadata.last_updated);
        if (cacheAge < 3600000) { // 1小时
          setFiles(cachedFiles);
          setLoading(false);
          return;
        }
      }

      // 从API获取文件列表
      const response = await fetch(
        `${import.meta.env.VITE_CNBCOOKIE_API_URL}/${repoPath}/-/git/tree-info/${branchHash}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_CNBCOOKIE}`,
            'Accept': 'application/vnd.cnb.web+json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`获取文件列表失败: ${response.status} ${response.statusText}`);
      }

      const filesData = await response.json();
      const fileEntries = filesData.entries || [];
      setFiles(fileEntries);

      // 保存到缓存
      await saveRepoFiles(repoPath, branchHash, fileEntries);
    } catch (err) {
      setError(err.message);
      console.error('获取文件列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 处理分支选择
  const handleBranchSelect = async (branch) => {
    setSelectedBranch(branch);
    await fetchFiles(branch.target_hash);
  };

  // 组件挂载时获取分支
  useEffect(() => {
    if (repoPath) {
      fetchBranches();
    }
  }, [repoPath, initialBranchHash]);

  // 格式化文件大小
  const formatFileSize = (size) => {
    if (!size) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (size >= 1024 && i < units.length - 1) {
      size /= 1024;
      i++;
    }
    return `${size.toFixed(1)} ${units[i]}`;
  };

  // 格式化提交时间
  const formatCommitTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN');
  };

  if (loading && !branches.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="ml-2 text-gray-600">加载中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500 text-center">
          <p>加载失败</p>
          <p className="text-sm text-gray-600 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2">
      {/* 文件列表 */}
      {selectedBranch && (
        <div>
          <div className="flex items-center mb-4">
            <Code className="w-5 h-5 mr-2 text-muted-foreground" />
            <h2 className="text-lg font-semibold">
              文件列表 ({files.length} 个项目)
            </h2>
            {loading && (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-2" />
            )}
          </div>

          {files.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无文件
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium">名称</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">最后提交</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">提交者</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {files.map((file) => (
                    <tr key={file.path} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          {file.entries ? (
                            <Folder className="w-4 h-4 mr-2 text-indigo-500" />
                          ) : (
                            <File className="w-4 h-4 mr-2 text-muted-foreground" />
                          )}
                          <span className="font-medium">{file.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {file.last_commit?.commit?.message?.split('\n')[0] || '无提交信息'}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {file.last_commit?.author?.nickname || file.last_commit?.author?.username || file.last_commit?.author?.name || '未知'}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatCommitTime(file.last_commit?.commit?.author?.date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserRepo;
