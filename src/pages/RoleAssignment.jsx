import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { useRoleAssignment, formatAssignment } from '../cnbAipvp/assignRoles';
import RoleSelector from '../cnbAipvp/RoleSelector';
import { useNavigate } from 'react-router-dom';

/**
 * 角色分配页面
 */
export default function RoleAssignment() {
  const { assignedRoles, loading, error, assign, reset } = useRoleAssignment();
  const [activeTab, setActiveTab] = useState('select');
  const [repopath, setRepopath] = useState('');
  const [userTopic, setUserTopic] = useState('');
  const navigate = useNavigate();

  // 处理用户选择完成
  const handleSelectionComplete = async (selectedRoles) => {
    try {
      await assign('select', selectedRoles);
    } catch (err) {
      console.error('选择分配失败:', err);
    }
  };

  // 重置分配
  const handleReset = () => {
    reset();
  };

  // 处理开始对战
  const handleStartBattle = () => {
    if (repopath && userTopic && assignedRoles) {
      // 跳转到AiBattle页面，携带参数
      navigate('/aibattle', {
        state: {
          repopath,
          userTopic
        }
      });
    } else {
      alert('请填写知识库路径和问题，并完成角色分配');
    }
  };

  return (
    <div className="min-h-screen p-4 bg-background">
      <div className="max-w-6xl mx-auto space-y-6">

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="select">
            <RoleSelector
              onSelectionComplete={handleSelectionComplete}
              repopath={repopath}
              onRepopathChange={setRepopath}
              userTopic={userTopic}
              onUserTopicChange={setUserTopic}
            />
          </TabsContent>
        </Tabs>

        {/* 分配结果显示 */}
        {assignedRoles && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>分配结果</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                  >
                    重新分配
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleStartBattle}
                    disabled={!repopath || !userTopic}
                  >
                    开始对战
                  </Button>
                </div>
              </div>
              <CardDescription>
                角色分配完成，前5个为正方，后5个为反方
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 正方角色 */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center" style={{ color: '#FF6200' }}>
                    <Badge className="mr-2" style={{ backgroundColor: '#FF6200' }}>正方</Badge>
                    5个角色
                  </h3>
                  <div className="space-y-3">
                    {assignedRoles.proSide.map((role, index) => (
                      <div key={role.id} className="flex items-center p-3 border rounded-lg">
                        <Avatar className="h-10 w-10 mr-3">
                          <AvatarImage src={role.avatar} alt={role.name} />
                          <AvatarFallback>{role.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{role.name}</p>
                        </div>
                        <Badge variant="outline">{index + 1}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 反方角色 */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center" style={{ color: '#6366F1' }}>
                    <Badge className="mr-2" style={{ backgroundColor: '#6366F1' }}>反方</Badge>
                    5个角色
                  </h3>
                  <div className="space-y-3">
                    {assignedRoles.conSide.map((role, index) => (
                      <div key={role.id} className="flex items-center p-3 border rounded-lg">
                        <Avatar className="h-10 w-10 mr-3">
                          <AvatarImage src={role.avatar} alt={role.name} />
                          <AvatarFallback>{role.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{role.name}</p>
                        </div>
                        <Badge variant="outline">{index + 1}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
