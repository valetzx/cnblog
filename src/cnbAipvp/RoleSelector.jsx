import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRoleAssignment } from './assignRoles';
import { LoadingSpinner } from '@/fetchPage/LoadingSpinner';

/**
 * 角色选择器组件
 * @param {Object} props - 组件属性
 * @param {Function} props.onSelectionComplete - 选择完成回调
 * @param {string} props.repopath - 知识库路径
 * @param {Function} props.onRepopathChange - 知识库路径变更回调
 * @param {string} props.userTopic - 辩论主题
 * @param {Function} props.onUserTopicChange - 辩论主题变更回调
 * @param {number} props.maxRounds - 最大轮次限制
 * @param {Function} props.onMaxRoundsChange - 最大轮次变更回调
 * @param {string} props.rolePool - 角色池路径
 */
export function RoleSelector({
  onSelectionComplete,
  repopath = '',
  onRepopathChange,
  userTopic = '',
  onUserTopicChange,
  maxRounds = 3,
  onMaxRoundsChange,
  rolePool = 'wss/knowledge/battle'
}) {
  const { roles, loading, error } = useRoleAssignment(rolePool);
  const [selectedRoles, setSelectedRoles] = useState([]);

  // 切换角色选择状态
  const toggleRoleSelection = (roleId) => {
    setSelectedRoles(prev => {
      if (prev.includes(roleId)) {
        return prev.filter(id => id !== roleId);
      } else if (prev.length < 10) {
        return [...prev, roleId];
      }
      return prev;
    });
  };

  // 清空选择
  const clearSelection = () => {
    setSelectedRoles([]);
  };

  // 随机选择10个角色
  const randomSelect = () => {
    if (roles.length >= 10) {
      const shuffled = [...roles]
        .sort(() => Math.random() - 0.5)
        .slice(0, 10)
        .map(role => role.id);
      setSelectedRoles(shuffled);
    }
  };

  return (
    <div className="space-y-4">
      {/* 角色选择器部分 - 受角色加载状态影响 */}
      {loading ? (
        <Card>
          <CardContent className="p-6 text-center">
            <LoadingSpinner message="加载角色中..." />
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-center text-destructive">
            加载角色失败: {error}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>角色选择器</CardTitle>
            <CardDescription>
              请选择10个角色进行分配（前5个为正方，后5个为反方）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant={selectedRoles.length === 10 ? 'default' : 'secondary'}>
                已选择: {selectedRoles.length}/10
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
                disabled={selectedRoles.length === 0}
              >
                清空选择
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={randomSelect}
                disabled={roles.length < 10}
              >
                随机选择
              </Button>
              <Button
                size="sm"
                onClick={() => onSelectionComplete(selectedRoles)}
                disabled={selectedRoles.length !== 10}
              >
                确认分配
              </Button>
            </div>

            {/* 角色选择网格 */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {roles.map((role) => (
                <Card
                  key={role.id}
                  className={`cursor-pointer transition-all ${
                    selectedRoles.includes(role.id)
                      ? 'border-primary shadow-md'
                      : 'hover:shadow-sm'
                  }`}
                  onClick={() => toggleRoleSelection(role.id)}
                >
                  <CardContent className="p-3 flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={role.avatar} alt={role.name} />
                      <AvatarFallback>{role.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{role.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {role.prompt || '暂无描述'}
                      </p>
                    </div>
                    {selectedRoles.includes(role.id) && (
                      <Badge
                        variant="default"
                        className="ml-2"
                        style={{
                          backgroundColor: selectedRoles.indexOf(role.id) < 5 ? '#FF6200' : '#6366F1',
                          borderColor: selectedRoles.indexOf(role.id) < 5 ? '#FF6200' : '#6366F1'
                        }}
                      >
                        {selectedRoles.indexOf(role.id) + 1}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            <CardDescription style={{ marginTop: '12px' }}>
              <a 
                href="https://cnb.cool/wss/knowledge/battle" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  textDecoration: 'none', 
                  color: 'inherit', 
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                英雄池仓库：wss/knowledge/battle，大家可以PR新英雄和数值调整！
              </a>
            </CardDescription>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default RoleSelector;
