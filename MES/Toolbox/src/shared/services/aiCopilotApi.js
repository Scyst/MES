import axios from 'axios';

/**
 * Global AI Copilot Service for MES Toolbox OS
 * Communicates with the Gemini Function-Calling Agent backend.
 */
export const aiCopilotApi = {
  /**
   * Ask the MES AI Assistant
   * @param {Object} params
   * @param {string} params.prompt - Current user question
   * @param {Array} [params.history] - Array of past messages [{role: 'user'|'model', text: '...'}]
   * @param {string} [params.pageContext] - Current route or module title
   * @param {string} [params.summaryStyle] - 'concise' | 'formal'
   * @param {string} [params.team] - 'ALL' | 'TEAM 1' | 'TEAM 2'
   * @param {Object} [params.briefData] - Optional current brief data
   * @returns {Promise<{success: boolean, data: Object, message: string}>}
   */
  ask: async ({ prompt, history = [], pageContext = '', summaryStyle = 'concise', team = 'ALL', briefData = null }) => {
    const url = `${import.meta.env.BASE_URL}api/ai/morningBriefAi.php`;
    const response = await axios.post(url, {
      custom_prompt: prompt,
      history,
      page_context: pageContext,
      summary_style: summaryStyle,
      team,
      brief_data: briefData
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });
    return response.data;
  },

  /**
   * Fetch Proactive Red-Flags for morning executive awareness
   * @returns {Promise<{success: boolean, data: {evaluated_at: string, total_red_flags: number, flags: Array}, message: string}>}
   */
  getRedFlags: async () => {
    const url = `${import.meta.env.BASE_URL}api/ai/morningBriefAi.php?action=get_red_flags`;
    const response = await axios.get(url, { withCredentials: true });
    return response.data;
  }
};
