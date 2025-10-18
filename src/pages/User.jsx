import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DialogContent, DialogTitle, Dialog, DialogHeader } from '@/components/ui/dialog';
import UserSettings from '@/components/UserSettings';
import { Search, Code, Cloud, Users, BookOpen, Package, Heart, GitBranch, X, Mail, MapPin, Globe, Calendar, UserCheck, Star, Activity, CheckSquare, PlusSquare, AlertCircle, File, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getUserInfo } from '@/cnbUtils/indexedDB';
import { getUserInfoFromAPI, formatUserInfoFromAPI } from '@/cnbUtils/userInfo';
import { getUserCreatedIssues, formatIssuesForDisplay, formatDisplayDate } from '@/cnbUtils/userCreated';
import { getUserStarredRepos, formatReposForDisplay, getPrimaryLanguage } from '@/cnbUtils/userStarred';
import { getUserTodoIssues, formatIssuesForDisplay as formatTodoIssuesForDisplay } from '@/cnbUtils/userTodo';
import { getUserActivities, formatActivitiesForDisplay, getActivityTypeLabel } from '@/cnbUtils/userActivity';
import { getUserWorkspaces, formatWorkspacesForDisplay, formatDuration, getStatusInfo } from '@/cnbUtils/userWorkspaces';
import { getUserTasks, formatTasksForDisplay, getVisibilityLabel, getAccessLabel } from '@/cnbUtils/userTasks';
import { getUserGroups, formatGroupsForDisplay, getAccessRoleLabel, formatNumber } from '@/cnbUtils/userGroup';
import { getUserRepos, formatReposForDisplay as formatUserReposForDisplay, getPrimaryLanguage as getRepoPrimaryLanguage } from '@/cnbUtils/userRepos';
import { getUserOrganizations, formatOrganizationsForDisplay as formatUserOrganizationsForDisplay } from '@/cnbUtils/userOrganization';
import { getUserMissions, formatMissionsForDisplay } from '@/cnbUtils/userMission.jsx';

const User = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState('all');
  const [searchKey, setSearchKey] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef(null);

  // 我创建的内容相关状态
  const [createdIssues, setCreatedIssues] = useState([]);
  const [createdLoading, setCreatedLoading] = useState(false);
  const [createdError, setCreatedError] = useState(null);

  // 我的关注相关状态
  const [starredRepos, setStarredRepos] = useState([]);
  const [starredLoading, setStarredLoading] = useState(false);
  const [starredError, setStarredError] = useState(null);

  // 待办事项相关状态
  const [todoIssues, setTodoIssues] = useState([]);
  const [todoLoading, setTodoLoading] = useState(false);
  const [todoError, setTodoError] = useState(null);

  // 用户动态相关状态
  const [activities, setActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState(null);

  // 云原生开发工作空间相关状态
  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState(null);

  // 任意用户任务集
  const [userMissions, setUserMissions] = useState([]);
  const [userMissionLoading, setUserMissionLoading] = useState(false);
  const [userMissionError, setUserMissionError] = useState(null);

  // 登录用户任务集
  const [myTasks, setMyTasks] = useState([]);
  const [myTasksLoading, setMyTasksLoading] = useState(false);
  const [myTasksError, setMyTasksError] = useState(null);

  // 用户组织相关状态
  const [groups, setGroups] = useState([]);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupError, setGroupError] = useState(null);

  // 用户组织相关状态（特定用户）
  const [userOrganizations, setUserOrganizations] = useState([]);
  const [userOrganizationsLoading, setUserOrganizationsLoading] = useState(false);
  const [userOrganizationsError, setUserOrganizationsError] = useState(null);

  // 用户仓库相关状态
  const [userRepos, setUserRepos] = useState([]);
  const [userReposLoading, setUserReposLoading] = useState(false);
  const [userReposError, setUserReposError] = useState(null);

  // UserSettings 对话框状态
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 从API获取用户信息
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        if (username) {
          // 有username参数时从API获取用户数据
          const userData = await getUserInfoFromAPI(username);

          if (userData) {
            // 使用实际用户数据
            setUserInfo(formatUserInfoFromAPI(userData));
          } else {
            // 如果没有用户数据，使用默认数据
            setUserInfo({
              username: username || 'currentUser',
              avatar: `https://cnb.cool/users/${username}/avatar/s`,
              name: username || '用户',
              bio: '暂无用户信息',
              followers: 0,
              following: 0,
              repositories: 0,
              stars: 0,
              site: '',
              joined: '',
              missions: 0,
              registries: 0,
              groups: 0
            });
          }
        } else {
          // 没有username参数时从IndexedDB获取当前用户信息
          const userData = await getUserInfo();

          if (userData) {
            // 使用IndexedDB中的用户数据
            setUserInfo({
              username: userData.username || 'currentUser',
              avatar: userData.avatar_url || `https://cnb.cool/users/${userData.username}/avatar/s`,
              name: userData.nickname || userData.username || '用户',
              bio: userData.bio || '暂无用户信息',
              followers: userData.follower_count || 0,
              following: userData.follow_count || 0,
              repositories: userData.repo_count || 0,
              stars: userData.stars_count || 0,
              site: userData.site || '',
              joined: userData.created_at || '',
              missions: userData.mission_count || 0,
              registries: userData.registry_count || 0,
              groups: userData.group_count || 0,
              location: userData.location || '',
              company: userData.company || '',
            });
          } else {
            // 如果没有用户数据，使用默认数据
            setUserInfo({
              username: 'currentUser',
              avatar: 'https://cnb.cool/users/currentUser/avatar/s',
              name: '用户',
              bio: '暂无用户信息',
              followers: 0,
              following: 0,
              repositories: 0,
              stars: 0,
              site: '',
              joined: '',
              missions: 0,
              registries: 0,
              groups: 0
            });
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, [username]);

  // 根据是否有username参数决定使用哪种标签
  const tags = username ? [
    // 有username参数时显示原来的标签
    { id: 'code', label: '代码仓库', icon: <Code size={16} /> },
    { id: 'organization', label: '组织', icon: <Users size={16} /> },
    { id: 'artifacts', label: '制品库', icon: <Package size={16} /> },
    { id: 'mission', label: '任务集', icon: <BookOpen size={16} /> },
    { id: 'following', label: '关注', icon: <Star size={16} /> },
  ] : [
    // 没有username参数时显示新的标签
    { id: 'activity', label: '动态', icon: <Activity size={16} /> },
    { id: 'todo', label: '待办', icon: <CheckSquare size={16} /> },
    { id: 'created', label: '我创建的', icon: <PlusSquare size={16} /> },
    { id: 'cloud', label: '云原生开发', icon: <Cloud size={16} /> },
    { id: 'usertasks', label: '任务集', icon: <BookOpen size={16} /> },
    { id: 'userfollowing', label: '关注', icon: <Star size={16} /> },
    { id: 'usergroups', label: '组织', icon: <Users size={16} /> },
  ];

  const handleSearchClear = () => {
    setSearchKey('');
    setIsSearchExpanded(false);
    setSelectedTag('all');
  };

  const handleSearchIconClick = () => {
    setIsSearchExpanded(true);
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
  };

  // 处理标签点击
  const handleTagClick = async (tagId) => {
    setSelectedTag(tagId === selectedTag ? 'all' : tagId);

    // 如果我创建的标签被点击，发起请求
    if (tagId === 'created') {
      setCreatedLoading(true);
      setCreatedError(null);

      try {
        const issues = await getUserCreatedIssues();
        const formattedIssues = formatIssuesForDisplay(issues);
        setCreatedIssues(formattedIssues);
      } catch (error) {
        setCreatedError(error.message);
        console.error('获取我创建的内容失败:', error);
      } finally {
        setCreatedLoading(false);
      }
    }

    // 如果我的关注标签被点击，发起请求
    if (tagId === 'userfollowing') {
      setStarredLoading(true);
      setStarredError(null);

      try {
        const repos = await getUserStarredRepos();
        const formattedRepos = formatReposForDisplay(repos);
        setStarredRepos(formattedRepos);
      } catch (error) {
        setStarredError(error.message);
        console.error('获取我的关注失败:', error);
      } finally {
        setStarredLoading(false);
      }
    }

    // 如果待办事项标签被点击，发起请求
    if (tagId === 'todo') {
      setTodoLoading(true);
      setTodoError(null);

      try {
        const issues = await getUserTodoIssues();
        const formattedIssues = formatTodoIssuesForDisplay(issues);
        setTodoIssues(formattedIssues);
      } catch (error) {
        setTodoError(error.message);
        console.error('获取待办事项失败:', error);
      } finally {
        setTodoLoading(false);
      }
    }

    // 如果动态标签被点击，发起请求
    if (tagId === 'activity') {
      setActivityLoading(true);
      setActivityError(null);

      try {
        const activities = await getUserActivities();
        const formattedActivities = formatActivitiesForDisplay(activities);
        setActivities(formattedActivities);
      } catch (error) {
        setActivityError(error.message);
        console.error('获取用户动态失败:', error);
      } finally {
        setActivityLoading(false);
      }
    }

    // 如果云原生开发工作空间标签被点击，发起请求
    if (tagId === 'cloud') {
      setWorkspaceLoading(true);
      setWorkspaceError(null);

      try {
        const workspaces = await getUserWorkspaces();
        const formattedWorkspaces = formatWorkspacesForDisplay(workspaces);
        setWorkspaces(formattedWorkspaces);
      } catch (error) {
        setWorkspaceError(error.message);
        console.error('获取云原生开发工作空间失败:', error);
      } finally {
        setWorkspaceLoading(false);
      }
    }

    // 如果任务集标签被点击（有username参数时），发起请求
    if (tagId === 'mission') {
      setUserMissionLoading(true);
      setUserMissionError(null);

      try {
        // 获取用户ID，优先使用userInfo中的id，如果没有则使用username
        const userId = userInfo?.id || username;
        const missions = await getUserMissions({ username, userId });
        const formattedMissions = formatMissionsForDisplay(missions);
        setUserMissions(formattedMissions);
      } catch (error) {
        setUserMissionError(error.message);
        console.error('获取用户任务集失败:', error);
      } finally {
        setUserMissionLoading(false);
      }
    }

    // 如果任务集标签被点击（无username参数时），发起请求
    if (tagId === 'usertasks') {
      setMyTasksLoading(true);
      setMyTasksError(null);

      try {
        const missions = await getUserTasks();
        const formattedTasks = formatTasksForDisplay(missions);
        setMyTasks(formattedTasks);
      } catch (error) {
        setMyTasksError(error.message);
        console.error('获取用户任务集失败:', error);
      } finally {
        setMyTasksLoading(false);
      }
    }

    // 如果用户组织标签被点击，发起请求
    if (tagId === 'usergroups') {
      setGroupLoading(true);
      setGroupError(null);

      try {
        const groups = await getUserGroups();
        const formattedGroups = formatGroupsForDisplay(groups);
        setGroups(formattedGroups);
      } catch (error) {
        setGroupError(error.message);
        console.error('获取用户组织失败:', error);
      } finally {
        setGroupLoading(false);
      }
    }

    // 如果代码仓库标签被点击，发起请求
    if (tagId === 'code') {
      setUserReposLoading(true);
      setUserReposError(null);

      try {
        // 获取用户ID，优先使用userInfo中的id，如果没有则使用username
        const userId = userInfo?.id || username;
        const repos = await getUserRepos({ username, userId });
        const formattedRepos = formatUserReposForDisplay(repos);
        setUserRepos(formattedRepos);
      } catch (error) {
        setUserReposError(error.message);
        console.error('获取用户仓库失败:', error);
      } finally {
        setUserReposLoading(false);
      }
    }

    // 如果组织标签被点击，发起请求
    if (tagId === 'organization') {
      setUserOrganizationsLoading(true);
      setUserOrganizationsError(null);

      try {
        // 获取用户ID，优先使用userInfo中的id，如果没有则使用username
        const userId = userInfo?.id || username;
        const organizations = await getUserOrganizations({ username, userId });
        const formattedOrganizations = formatUserOrganizationsForDisplay(organizations);
        setUserOrganizations(formattedOrganizations);
      } catch (error) {
        setUserOrganizationsError(error.message);
        console.error('获取用户组织失败:', error);
      } finally {
        setUserOrganizationsLoading(false);
      }
    }
  };

  // 格式化日期
  const formatDate = (dateString) => {
    if (!dateString) return '未知';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // 将十六进制颜色转换为HSL并调整亮度
  const getTextColorFromBg = (bgColor) => {
    const r = parseInt(bgColor.slice(1, 3), 16);
    const g = parseInt(bgColor.slice(3, 5), 16);
    const b = parseInt(bgColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#333333' : '#ffffff';
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="text-center">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-2 sm:p-4 pb-10">
      <div className="mx-auto">
        {/* 标签过滤器 - 完全按照TagFilter样式 */}
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
                    placeholder="搜索用户内容..."
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

            {/* 标签按钮 - 完全按照TagFilter样式 */}
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleTagClick(tag.id)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors flex items-center gap-1",
                  selectedTag === tag.id
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
                )}
              >
                {tag.icon}
                {tag.label}
              </button>
            ))}
          </div>
        </div>

        {/* 用户信息头部 */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
                <AvatarImage src={userInfo.avatar} alt={userInfo.username} />
                <AvatarFallback>{userInfo.username?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl font-bold">{userInfo.name}</h1>
                <p className="text-gray-600 dark:text-gray-400">@{userInfo.username}</p>
                <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">{userInfo.bio}</p>

                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                    <UserCheck size={12} />
                    {userInfo.followers} 粉丝
                  </Badge>
                  <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                    <Heart size={12} />
                    {userInfo.following} 关注
                  </Badge>
                  <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                    <GitBranch size={12} />
                    {userInfo.repositories} 仓库
                  </Badge>
                  <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                    <Star size={12} />
                    {userInfo.stars} 星标
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                  {userInfo.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {userInfo.location}
                    </span>
                  )}
                  {userInfo.company && (
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {userInfo.company}
                    </span>
                  )}
                  {userInfo.email && (
                    <span className="flex items-center gap-1">
                      <Mail size={12} />
                      {userInfo.email}
                    </span>
                  )}
                  {userInfo.site && (
                    <span className="flex items-center gap-1">
                      <Globe size={12} />
                      <a href={userInfo.site} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        个人网站
                      </a>
                    </span>
                  )}
                  {userInfo.joined && (
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      加入于 {formatDate(userInfo.joined)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 内容区域 - 根据选中的标签显示不同内容 */}
        {selectedTag === 'created' && (
          <div className="mt-6">
            {createdError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 text-center">
                <p className="text-red-700">加载失败: {createdError}</p>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => setSettingsOpen(true)}
                >
                  登录
                </Button>
              </div>
            )}

            {!createdLoading && !createdError && createdIssues.length > 0 && (
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 sm:gap-4 space-y-4">
                {createdIssues.map((issue) => (
                  <div key={issue.id} className="break-inside-avoid">
                    <Card className="w-full transition-shadow flex flex-col">
                      <CardContent className="p-4 flex flex-col h-full">
                        <h3 className="font-semibold text-base sm:text-lg line-clamp-2 mb-2">
                          {issue.title}
                        </h3>
                        <div className="text-sm text-gray-600 space-y-1 flex-grow">
                          <p className="text-xs text-gray-500">{issue.slug} #{issue.number}</p>
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                            <span>创建者: {issue.creator}</span>
                            <span>{formatDisplayDate(issue.createdTime)}</span>
                          </div>
                          {issue.labels.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {issue.labels.map((label, index) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className="text-xs px-2 py-0.5"
                                  style={{
                                    backgroundColor: label.color,
                                    color: getTextColorFromBg(label.color)
                                  }}
                                >
                                  {label.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}

            {!createdLoading && !createdError && createdIssues.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <PlusSquare size={48} className="mx-auto mb-4 opacity-50" />
                <p>暂无创建的内容</p>
              </div>
            )}
          </div>
        )}

        {/* 我的关注内容区域 */}
        {selectedTag === 'userfollowing' && (
          <div className="mt-6">
            {starredError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 text-center">
                <p className="text-red-700">加载失败: {starredError}</p>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => setSettingsOpen(true)}
                >
                  登录
                </Button>
              </div>
            )}

            {!starredLoading && !starredError && starredRepos.length > 0 && (
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 sm:gap-4 space-y-4">
                {starredRepos.map((repo) => (
                  <div key={repo.id} className="break-inside-avoid">
                    <Card className="w-full transition-shadow flex flex-col">
                      <CardContent className="p-4 flex flex-col">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-base line-clamp-2 flex-1">
                            <button
                              onClick={() => navigate(`/repo/${repo.path}`)}
                              className="transition-colors text-left"
                            >
                              {repo.name}
                            </button>
                          </h3>
                          {repo.pinned && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              置顶
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                          {repo.description}
                        </p>

                        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                          <span className="flex items-center">
                            <span
                              className="w-3 h-3 rounded-full mr-1"
                              style={{ backgroundColor: repo.languageColor || '#3b82f6' }}
                            ></span>
                            {getPrimaryLanguage(repo.languages) || 'Unknown'}
                          </span>
                          <span>{formatDisplayDate(repo.starTime)} 关注</span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-4 text-gray-500">
                            <span className="flex items-center">
                              <Star size={12} className="mr-1" />
                              {repo.starCount}
                            </span>
                            <span className="flex items-center">
                              <GitBranch size={12} className="mr-1" />
                              {repo.forkCount}
                            </span>
                            <span className="flex items-center">
                              <AlertCircle size={12} className="mr-1" />
                              {repo.openIssueCount}
                            </span>
                          </div>

                          <Badge variant="outline" className="text-xs">
                            {repo.visibility}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}

            {!starredLoading && !starredError && starredRepos.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Heart size={48} className="mx-auto mb-4 opacity-50" />
                <p>暂无关注的仓库</p>
              </div>
            )}
          </div>
        )}

        {/* 待办事项内容区域 */}
        {selectedTag === 'todo' && (
          <div className="mt-6">
            {todoError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 text-center">
                <p className="text-red-700">加载失败: {todoError}</p>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => setSettingsOpen(true)}
                >
                  登录
                </Button>
              </div>
            )}

            {!todoLoading && !todoError && todoIssues.length > 0 && (
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 sm:gap-4 space-y-4">
                {todoIssues.map((issue) => (
                  <div key={issue.id} className="break-inside-avoid">
                    <Card className="w-full hover:shadow-md transition-shadow flex flex-col">
                      <CardContent className="p-4 flex flex-col h-full">
                        <h3 className="font-semibold text-base sm:text-lg line-clamp-2 mb-2">
                          {issue.title}
                        </h3>
                        <div className="text-sm text-gray-600 space-y-1 flex-grow">
                          <p className="text-xs text-gray-500">{issue.slug} #{issue.number}</p>
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                            <span>创建者: {issue.creator}</span>
                            <span>{formatDisplayDate(issue.createdTime)}</span>
                          </div>
                          {issue.labels.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {issue.labels.map((label, index) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className="text-xs px-2 py-0.5"
                                  style={{
                                    backgroundColor: label.color,
                                    color: getTextColorFromBg(label.color)
                                  }}
                                >
                                  {label.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}

            {!todoLoading && !todoError && todoIssues.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <CheckSquare size={48} className="mx-auto mb-4 opacity-50" />
                <p>暂无待办事项</p>
              </div>
            )}
          </div>
        )}

        {/* 用户动态内容区域 */}
        {selectedTag === 'activity' && (
          <div className="mt-6">
            {activityError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 text-center">
                <p className="text-red-700">加载失败: {activityError}</p>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => setSettingsOpen(true)}
                >
                  登录
                </Button>
              </div>
            )}

            {!activityLoading && !activityError && activities.length > 0 && (
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 sm:gap-4 space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="break-inside-avoid">
                    <Card className="w-full hover:shadow-md transition-shadow flex flex-col">
                      <CardContent className="p-4 flex flex-col">
                        {/* 用户信息 */}
                        <div className="flex items-center mb-3">
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarImage src={activity.user?.avatar} alt={activity.user?.username} />
                            <AvatarFallback>{activity.user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{activity.user?.nickname}</p>
                            <p className="text-xs text-gray-500">@{activity.user?.username}</p>
                          </div>
                        </div>

                        {/* 动态内容 */}
                        <div className="mb-3">
                          <Badge variant="secondary" className="mb-2">
                            {getActivityTypeLabel(activity.activityType)}
                          </Badge>

                          {activity.repo && (
                            <div>
                              <h3 className="font-semibold text-base line-clamp-2">
                                <button
                                  onClick={() => navigate(`/repo/${activity.repo.path}`)}
                                  className="hover:text-blue-600 transition-colors"
                                >
                                  {activity.repo.name}
                                </button>
                              </h3>
                              {activity.repo.description && (
                                <p className="text-sm text-gray-600 line-clamp-3 mt-1">
                                  {activity.repo.description}
                                </p>
                              )}
                            </div>
                          )}

                          {activity.release && (
                            <div>
                              <h4 className="font-medium text-sm">发布: {activity.release.title}</h4>
                              <p className="text-xs text-gray-500">标签: {activity.release.tag}</p>
                            </div>
                          )}
                        </div>

                        {/* 元信息 */}
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{formatDisplayDate(activity.createdAt)}</span>

                          {activity.repo && (
                            <div className="flex items-center space-x-2">
                              {getPrimaryLanguage(activity.repo.languages) && (
                                <span className="flex items-center">
                                  <span className="w-2 h-2 rounded-full bg-blue-500 mr-1"></span>
                                  {getPrimaryLanguage(activity.repo.languages)}
                                </span>
                              )}
                              {activity.repo.visibility && (
                                <Badge variant="outline" className="text-xs">
                                  {activity.repo.visibility}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}

            {!activityLoading && !activityError && activities.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Activity size={48} className="mx-auto mb-4 opacity-50" />
                <p>暂无用户动态</p>
              </div>
            )}
          </div>
        )}

        {/* 云原生开发工作空间内容区域 */}
        {selectedTag === 'cloud' && (
          <div className="mt-6">
            {workspaceError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 text-center">
                <p className="text-red-700">加载失败: {workspaceError}</p>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => setSettingsOpen(true)}
                >
                  登录
                </Button>
              </div>
            )}

            {!workspaceLoading && !workspaceError && workspaces.length > 0 && (
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 sm:gap-4 space-y-4">
                {workspaces.map((workspace) => {
                  const statusInfo = getStatusInfo(workspace.status);
                  return (
                    <div key={workspace.id} className="break-inside-avoid">
                      <Card className="w-full transition-shadow flex flex-col">
                        <CardContent className="p-4 flex flex-col">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-base line-clamp-2 flex-1">
                              <a
                                href={workspace.repoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="transition-colors"
                              >
                                {workspace.slug}
                              </a>
                            </h3>
                            <Badge className={`text-xs ${statusInfo.color} hover:bg-transparent hover:shadow-none hover:no-underline`}>
                              {statusInfo.label}
                            </Badge>
                          </div>

                          <div className="text-sm text-gray-600 space-y-2 mb-3">
                            <div className="flex items-center justify-between text-xs">
                              <span>分支: {workspace.branch}</span>
                              <span>SN: {workspace.sn}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span>创建: {formatDisplayDate(workspace.createTime)}</span>
                              <span>运行: {formatDuration(workspace.duration)}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center space-x-3">
                              <span className="flex items-center">
                                <File size={12} className="mr-1" />
                                {workspace.fileCount} 文件
                              </span>
                              <span className="flex items-center">
                                <Archive size={12} className="mr-1" />
                                {workspace.stashCount} 暂存
                              </span>
                            </div>
                            {workspace.ssh && (
                              <div className="flex items-center space-x-2">
                                <Badge
                                  variant="outline"
                                  className="text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600"
                                  onClick={() => window.open(`https://cnb.cool/${workspace.slug}/-/build/console/${workspace.id}`, '_blank')}
                                >
                                  SSH
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  vsocde
                                </Badge>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            )}

            {!workspaceLoading && !workspaceError && workspaces.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Cloud size={48} className="mx-auto mb-4 opacity-50" />
                <p>暂无云原生开发工作空间</p>
              </div>
            )}
          </div>
        )}

        {/* 用户任务集内容区域（有username参数时） */}
        {selectedTag === 'mission' && (
          <div className="mt-6">
            {userMissionError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 text-center">
                <p className="text-red-700">加载失败: {userMissionError}</p>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => setSettingsOpen(true)}
                >
                  登录
                </Button>
              </div>
            )}

            {!userMissionLoading && !userMissionError && userMissions.length > 0 && (
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 sm:gap-4 space-y-4">
                {userMissions.map((mission) => (
                  <div key={mission.id} className="break-inside-avoid">
                    <Card className="w-full transition-shadow flex flex-col">
                      <CardContent className="p-4 flex flex-col">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-base line-clamp-2 flex-1">
                            <a
                              href={`https://cnb.cool/${mission.path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="transition-colors"
                            >
                              {mission.name}
                            </a>
                          </h3>
                          {mission.pinned && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              置顶
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                          {mission.description}
                        </p>

                        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                          <span className="flex items-center">
                            <span className="w-3 h-3 rounded-full bg-blue-500 mr-1"></span>
                            {getVisibilityLabel(mission.visibilityLevel)}
                          </span>
                          <span>{formatDisplayDate(mission.createdAt)} 创建</span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-4 text-gray-500">
                            <span className="flex items-center">
                              <Star size={12} className="mr-1" />
                              {mission.stared ? '已关注' : '未关注'}
                            </span>
                            <span className="flex items-center">
                              <Users size={12} className="mr-1" />
                              {getAccessLabel(mission.access)}
                            </span>
                          </div>

                          <Badge variant="outline" className="text-xs">
                            {mission.freeze ? '已冻结' : '活跃'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}

            {!userMissionLoading && !userMissionError && userMissions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
                <p>暂无任务集</p>
              </div>
            )}
          </div>
        )}

        {/* 用户任务集内容区域（无username参数时） */}
        {selectedTag === 'usertasks' && (
          <div className="mt-6">
            {myTasksError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 text-center">
                <p className="text-red-700">加载失败: {myTasksError}</p>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => setSettingsOpen(true)}
                >
                  登录
                </Button>
              </div>
            )}

            {!myTasksLoading && !myTasksError && myTasks.length > 0 && (
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 sm:gap-4 space-y-4">
                {myTasks.map((mission) => (
                  <div key={mission.id} className="break-inside-avoid">
                    <Card className="w-full transition-shadow flex flex-col">
                      <CardContent className="p-4 flex flex-col">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-base line-clamp-2 flex-1">
                            <a
                              href={`https://cnb.cool/${mission.path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="transition-colors"
                            >
                              {mission.name}
                            </a>
                          </h3>
                          {mission.pinned && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              置顶
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                          {mission.description}
                        </p>

                        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                          <span className="flex items-center">
                            <span className="w-3 h-3 rounded-full bg-blue-500 mr-1"></span>
                            {getVisibilityLabel(mission.visibilityLevel)}
                          </span>
                          <span>{formatDisplayDate(mission.createdAt)} 创建</span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-4 text-gray-500">
                            <span className="flex items-center">
                              <Star size={12} className="mr-1" />
                              {mission.stared ? '已关注' : '未关注'}
                            </span>
                            <span className="flex items-center">
                              <Users size={12} className="mr-1" />
                              {getAccessLabel(mission.access)}
                            </span>
                          </div>

                          <Badge variant="outline" className="text-xs">
                            {mission.freeze ? '已冻结' : '活跃'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}

            {!myTasksLoading && !myTasksError && myTasks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
                <p>暂无任务集</p>
              </div>
            )}
          </div>
        )}

        {/* 用户组织内容区域 */}
        {selectedTag === 'usergroups' && (
          <div className="mt-6">
            {groupError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 text-center">
                <p className="text-red-700">加载失败: {groupError}</p>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => setSettingsOpen(true)}
                >
                  登录
                </Button>
              </div>
            )}

            {!groupLoading && !groupError && groups.length > 0 && (
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 sm:gap-4 space-y-4">
                {groups.map((group) => (
                  <div key={group.id} className="break-inside-avoid">
                    <Card className="w-full transition-shadow flex flex-col">
                      <CardContent className="p-4 flex flex-col">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-base line-clamp-2 flex-1">
                            <a
                              href={`https://cnb.cool/${group.path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="transition-colors"
                            >
                              {group.name}
                            </a>
                          </h3>
                          {group.pinned && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              置顶
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                          {group.description}
                        </p>

                        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                          <span className="flex items-center">
                            <span className="w-3 h-3 rounded-full bg-blue-500 mr-1"></span>
                            {getAccessRoleLabel(group.accessRole)}
                          </span>
                          <span>{formatDisplayDate(group.createdAt)} 创建</span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-4 text-gray-500">
                            <span className="flex items-center">
                              <Star size={12} className="mr-1" />
                              {group.stared ? '已关注' : '未关注'}
                            </span>
                            <span className="flex items-center">
                              <Users size={12} className="mr-1" />
                              {getAccessLabel(group.access)}
                            </span>
                          </div>

                          <Badge variant="outline" className="text-xs">
                            {group.freeze ? '已冻结' : '活跃'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}

            {!groupLoading && !groupError && groups.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users size={48} className="mx-auto mb-4 opacity-50" />
                <p>暂无组织</p>
              </div>
            )}
          </div>
        )}

        {/* 用户仓库内容区域 */}
        {selectedTag === 'code' && (
          <div className="mt-6">
            {userReposError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 text-center">
                <p className="text-red-700">加载失败: {userReposError}</p>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => setSettingsOpen(true)}
                >
                  登录
                </Button>
              </div>
            )}

            {!userReposLoading && !userReposError && userRepos.length > 0 && (
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 sm:gap-4 space-y-4">
                {userRepos.map((repo) => (
                  <div key={repo.id} className="break-inside-avoid">
                    <Card className="w-full transition-shadow flex flex-col">
                      <CardContent className="p-4 flex flex-col">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-base line-clamp-2 flex-1">
                            <button
                              onClick={() => navigate(`/repo/${repo.path}`)}
                              className="transition-colors text-left"
                            >
                              {repo.name}
                            </button>
                          </h3>
                          {repo.pinned && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              置顶
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                          {repo.description}
                        </p>

                        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                          <span className="flex items-center">
                            <span
                              className="w-3 h-3 rounded-full mr-1"
                              style={{ backgroundColor: repo.languageColor || '#3b82f6' }}
                            ></span>
                            {getRepoPrimaryLanguage(repo.languages) || 'Unknown'}
                          </span>
                          <span>{formatDisplayDate(repo.updatedAt)} 更新</span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-4 text-gray-500">
                            <span className="flex items-center">
                              <Star size={12} className="mr-1" />
                              {repo.starCount}
                            </span>
                            <span className="flex items-center">
                              <GitBranch size={12} className="mr-1" />
                              {repo.forkCount}
                            </span>
                            <span className="flex items-center">
                              <AlertCircle size={12} className="mr-1" />
                              {repo.openIssueCount}
                            </span>
                          </div>

                          <Badge variant="outline" className="text-xs">
                            {repo.visibility}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}

            {!userReposLoading && !userReposError && userRepos.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <GitBranch size={48} className="mx-auto mb-4 opacity-50" />
                <p>暂无仓库</p>
              </div>
            )}
          </div>
        )}

        {/* 用户组织内容区域 */}
        {selectedTag === 'organization' && (
          <div className="mt-6">
            {userOrganizationsError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 text-center">
                <p className="text-red-700">加载失败: {userOrganizationsError}</p>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => setSettingsOpen(true)}
                >
                  登录
                </Button>
              </div>
            )}

            {!userOrganizationsLoading && !userOrganizationsError && userOrganizations.length > 0 && (
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 sm:gap-4 space-y-4">
                {userOrganizations.map((organization) => (
                  <div key={organization.id} className="break-inside-avoid">
                    <Card className="w-full transition-shadow flex flex-col">
                      <CardContent className="p-4 flex flex-col">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-base line-clamp-2 flex-1">
                            <a
                              href={`https://cnb.cool/${organization.path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="transition-colors"
                            >
                              {organization.name}
                            </a>
                          </h3>
                          {organization.pinned && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              置顶
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                          {organization.description}
                        </p>

                        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                          <span className="flex items-center">
                            {getAccessRoleLabel(organization.accessRole)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-4 text-gray-500">
                            <span className="flex items-center">
                              <Star size={12} className="mr-1" />
                              {organization.stared ? '已关注' : '未关注'}
                            </span>
                            <span className="flex items-center">
                              <Users size={12} className="mr-1" />
                              {getAccessLabel(organization.access)}
                            </span>
                          </div>

                          <div className="flex items-center space-x-4 text-gray-500">
                            <span>{formatDisplayDate(organization.createdAt)} 创建</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}

            {!userOrganizationsLoading && !userOrganizationsError && userOrganizations.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users size={48} className="mx-auto mb-4 opacity-50" />
                <p>暂无组织</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* UserSettings 对话框 */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-2xl max-h-[90vh] overflow-y-auto w-[90vw] sm:w-auto sm:min-w-[500px] rounded-lg [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>设置</DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-4">
            <UserSettings onClose={() => setSettingsOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default User;
