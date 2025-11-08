import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CheckCircle, Circle, Trash2 } from 'lucide-react';
import aiSummary from '@/cnbAipvp/aiSummary';

const DEFAULT_PROMPT_TEMPLATE = `你是任务拆解专家，聚焦于零阻力任务启动与执行，致力于解决「当下启动困难」和「任务拆解执行」问题。

技能 1：零阻力任务拆解。能优先拆出 5 分钟内可完成且无需复杂准备的「最小启动步骤」，后续步骤按「可量化、可即时验收」拆分，明确动作和「即时成果标志」。

技能 2：即时激励引导。在额外建议中包含「启动后即时奖励方案」和「步骤验收小技巧」。

输出形式：拆解步骤用Markdown表格呈现，左列"具体步骤"，右列"详细说明"；额外建议单独一行置底，明确包含激励方案。

限制：仅输出任务拆解表格、步骤说明和含激励的额外建议，无多余铺垫或解释。

现在用户当下启动困难的事：「{userInput}」`;

const JobPlan = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [taskPlan, setTaskPlan] = useState(null);
  const [error, setError] = useState(null);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [refreshTrigger, setRefreshTrigger] = useState(0); 
  const [viewingCompletedTask, setViewingCompletedTask] = useState(null);

  const parseMarkdownTable = (content) => {
    const lines = content.split('\n');
    const tableStart = lines.findIndex(line => line.trim().startsWith('|'));

    if (tableStart === -1) return null;

    const tableLines = lines.slice(tableStart);
    const tableEnd = tableLines.findIndex((line, index) =>
      index > 0 && !line.trim().startsWith('|')
    );

    const relevantLines = tableEnd === -1 ? tableLines : tableLines.slice(0, tableEnd);

    // 提取表头（第一行）
    const headerLine = relevantLines.find(line =>
      line.trim().startsWith('|') && !line.includes('---')
    );

    let headers = ['具体步骤', '说明'];
    if (headerLine) {
      headers = headerLine
        .split('|')
        .filter(cell => cell.trim() !== '')
        .map(cell => cell.trim());
    }

    // 提取表格数据（跳过表头和分隔线）
    const rows = relevantLines
      .filter(line =>
        line.trim().startsWith('|') &&
        !line.includes('---') &&
        line !== headerLine
      )
      .map(line => {
        const cells = line
          .split('|')
          .filter(cell => cell.trim() !== '')
          .map(cell => cell.trim());

        // 创建动态对象，使用表头作为键
        const rowData = {};
        headers.forEach((header, index) => {
          rowData[header] = cells[index] || '';
        });

        return rowData;
      });

    // 提取额外建议
    const suggestionLine = lines.find(line =>
      line.includes('额外建议') || line.includes('激励方案') ||
      (line.includes('建议') && !line.includes('|'))
    );

    return {
      headers,
      steps: rows,
      suggestion: suggestionLine ? suggestionLine.trim() : ''
    };
  };

  // 检查所有步骤是否完成
  const isAllStepsCompleted = () => {
    return taskPlan && taskPlan.steps &&
           completedSteps.size === taskPlan.steps.length;
  };

  // 标记任务为已完成
  const markTaskAsCompleted = () => {
    if (!taskPlan || !userInput) return;

    // 更新当前计划，标记为已完成
    const plans = JSON.parse(localStorage.getItem('taskPlans') || '[]');
    if (plans.length > 0) {
      plans[0].completedAll = true;
      plans[0].completedAt = new Date().toISOString();
      localStorage.setItem('taskPlans', JSON.stringify(plans));
    }

    // 清除当前任务
    setTaskPlan(null);
    setUserInput('');
    setCompletedSteps(new Set());
  };

  // 组件挂载时只加载保存的计划
  React.useEffect(() => {
    loadSavedPlans();
  }, []);

  // 切换任务完成状态
  const toggleStepCompletion = (index) => {
    const newCompletedSteps = new Set(completedSteps);
    if (newCompletedSteps.has(index)) {
      newCompletedSteps.delete(index);
    } else {
      newCompletedSteps.add(index);
    }
    setCompletedSteps(newCompletedSteps);

    // 保存完成状态到localStorage
    const plans = JSON.parse(localStorage.getItem('taskPlans') || '[]');
    if (plans.length > 0) {
      plans[0].completedSteps = Array.from(newCompletedSteps);
      localStorage.setItem('taskPlans', JSON.stringify(plans));
    }

    // 检查是否所有步骤都完成
    if (newCompletedSteps.size === taskPlan.steps.length) {
      // 自动标记任务为已完成
      markTaskAsCompleted();
    }
  };

  const handleCreatePlan = async () => {
    if (!userInput.trim()) {
      setError('请输入您拖延的事情');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const prompt = DEFAULT_PROMPT_TEMPLATE.replace('{userInput}', userInput.trim());
      const result = await aiSummary(prompt);

      const parsedPlan = parseMarkdownTable(result.content);

      if (parsedPlan) {
        setTaskPlan(parsedPlan);
        // 保存到localStorage
        const plans = JSON.parse(localStorage.getItem('taskPlans') || '[]');
        plans.unshift({
          id: Date.now(),
          userInput: userInput.trim(),
          plan: parsedPlan,
          createdAt: new Date().toISOString()
        });
        localStorage.setItem('taskPlans', JSON.stringify(plans));
      }

      setIsDialogOpen(false);
    } catch (err) {
      setError('生成计划失败：' + err.message);
      console.error('AI Summary Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSavedPlans = () => {
    try {
      const plans = JSON.parse(localStorage.getItem('taskPlans') || '[]');
      // 只加载未完成的任务（completedAll不为true）
      const incompletePlans = plans.filter(plan => plan.completedAll !== true);
      if (incompletePlans.length > 0) {
        setTaskPlan(incompletePlans[0].plan);
        setUserInput(incompletePlans[0].userInput);
        setCompletedSteps(new Set(incompletePlans[0].completedSteps || []));
      }
    } catch (err) {
      console.error('加载保存的计划失败:', err);
    }
  };

  // 获取已完成的任务（completedAll为true）
  const getCompletedTasks = () => {
    try {
      const plans = JSON.parse(localStorage.getItem('taskPlans') || '[]');
      return plans.filter(plan => plan.completedAll === true);
    } catch (err) {
      console.error('获取已完成任务失败:', err);
      return [];
    }
  };

  // 组件挂载时加载保存的计划
  React.useEffect(() => {
    loadSavedPlans();
  }, [refreshTrigger]);

  // 删除已完成任务
  const deleteCompletedTask = (taskId) => {
    try {
      const plans = JSON.parse(localStorage.getItem('taskPlans') || '[]');
      const updatedPlans = plans.filter(plan => plan.id !== taskId);
      localStorage.setItem('taskPlans', JSON.stringify(updatedPlans));
      // 触发重新渲染
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('删除任务失败:', err);
    }
  };

  // 查看已完成任务的详情
  const viewCompletedTaskDetail = (task) => {
    setViewingCompletedTask(task);
  };

  // 关闭任务详情查看
  const closeTaskDetail = () => {
    setViewingCompletedTask(null);
  };

  return (
    <div className="">
      <div className="min-h-screen p-2 sm:p-4 pb-10">
        {!taskPlan && (
          <>
            <Card className="mb-4">
              <CardHeader className="text-center">
                <CardTitle>有什么事情你一直在拖延？AI将为您生成零阻力启动计划</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">

                <Textarea
                  placeholder="例如：写周报、整理房间、学习新技能..."
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  rows={4}
                />

                {error && (
                  <p className="text-sm text-destructive text-center">{error}</p>
                )}

                <div className="flex justify-center space-x-2">
                  <Button
                    onClick={handleCreatePlan}
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    创建专属计划
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {taskPlan && taskPlan.headers && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-between">
                  <span>当前任务：{userInput}</span>
                  {isAllStepsCompleted() && (
                    <Button
                      onClick={markTaskAsCompleted}
                      variant="default"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      标记为已完成
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center  text-sm text-muted-foreground">
                  <span>
                    完成进度：{completedSteps.size}/{taskPlan.steps.length}
                  </span>
                  {isAllStepsCompleted() && (
                    <span className="ml-4 text-green-600 font-medium">
                      ✓ 所有步骤已完成！
                    </span>
                  )}
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      {taskPlan.headers.map((header, index) => (
                        <TableHead key={index} className="text-center">{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taskPlan.steps.map((step, index) => (
                      <TableRow
                        key={index}
                        className={`transition-colors ${
                          completedSteps.has(index)
                            ? 'bg-muted/50 line-through text-muted-foreground'
                            : 'hover:bg-muted/30'
                        }`}
                      >
                        <TableCell className="text-center">
                          <div
                            className="cursor-pointer p-1 flex justify-center"
                            onClick={() => toggleStepCompletion(index)}
                          >
                            {completedSteps.has(index) ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                        {taskPlan.headers.map((header, cellIndex) => (
                          <TableCell
                            key={cellIndex}
                            className={cellIndex === 0 ? "font-medium" : ""}
                            onClick={() => toggleStepCompletion(index)}
                          >
                            {step[header] || ''}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {taskPlan.suggestion && (
                  <div className="mt-6 p-4 bg-muted rounded-lg text-left">
                    <h4 className="font-semibold mb-2">额外建议</h4>
                    <p className="text-sm">{taskPlan.suggestion}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader className="text-center">
              <DialogTitle>任务拆解</DialogTitle>
              <DialogDescription className="text-center">
                有什么事情你一直在拖延？AI将为您生成零阻力启动计划
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Textarea
                placeholder="例如：写周报、整理房间、学习新技能..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                rows={4}
              />

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <div className="flex justify-center space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  取消
                </Button>
                <Button
                  onClick={handleCreatePlan}
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  创建计划
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 已完成任务列表 - 只在没有当前任务时显示 */}
        {!taskPlan && getCompletedTasks().length > 0 && (
          <Card className="mt-2">
            <CardHeader className="text-center">
              <CardTitle>已完成的任务</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getCompletedTasks().map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50"
                    onClick={() => viewCompletedTaskDetail(task)}
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">{task.userInput}</p>
                        <p className="text-sm text-muted-foreground">
                          完成于 {new Date(task.completedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {task.plan?.steps?.length || 0} 个步骤
                      </span>
                      <Trash2
                        className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-destructive"
                        onClick={() => deleteCompletedTask(task.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 查看已完成任务详情的对话框 */}
        <Dialog open={!!viewingCompletedTask} onOpenChange={(open) => !open && closeTaskDetail()}>
          <DialogContent className="max-w-[95vw] sm:max-w-[600px] max-h-[80vh] overflow-y-auto rounded-lg">
            {viewingCompletedTask && (
              <>
                <DialogHeader className="text-center">
                  <DialogTitle>任务回顾：{viewingCompletedTask.userInput}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  {viewingCompletedTask.plan && viewingCompletedTask.plan.headers && (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {viewingCompletedTask.plan.headers.map((header, index) => (
                              <TableHead key={index} className="text-center">{header}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {viewingCompletedTask.plan.steps.map((step, index) => (
                            <TableRow key={index}>
                              {viewingCompletedTask.plan.headers.map((header, cellIndex) => (
                                <TableCell
                                  key={cellIndex}
                                  className={cellIndex === 0 ? "font-medium" : ""}
                                >
                                  {step[header] || ''}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {viewingCompletedTask.plan?.suggestion && (
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-semibold mb-2">额外建议</h4>
                      <p className="text-sm">{viewingCompletedTask.plan.suggestion}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default JobPlan;
