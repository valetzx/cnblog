export const getAllSchema = async (workspace, pipelineId) => {
  try {
    // 从 localStorage 获取 CNBSESSION
    const session = localStorage.getItem('CNBSESSION');

    if (!session) {
      throw new Error('CNBSESSION not found in localStorage');
    }

    if (!pipelineId) {
      throw new Error('pipeline_id not found');
    }

    const response = await fetch(`${import.meta.env.VITE_CNBCOOKIE_API_URL}/${workspace.slug}/-/workspace/all-schema?pipelineId=${pipelineId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_CNBCOOKIE}`,
        'session': session
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching all schema:', error);
    throw error;
  }
};
