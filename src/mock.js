/**
 * Mock responses for development mode (no native host).
 * These allow the React UI to work without Python/Android running.
 */

export const MOCK_HANDLERS = {
  add: (params) => ({
    success: true,
    result: (params[0] || 0) + (params[1] || 0),
    method: 'add',
  }),
  subtract: (params) => ({
    success: true,
    result: (params[0] || 0) - (params[1] || 0),
    method: 'subtract',
  }),
  multiply: (params) => ({
    success: true,
    result: (params[0] || 0) * (params[1] || 0),
    method: 'multiply',
  }),
  process_data: (params) => ({
    success: true,
    result: {
      original: params[0] || '',
      uppercase: (params[0] || '').toUpperCase(),
      word_count: (params[0] || '').split(/\s+/).filter(Boolean).length,
      char_count: (params[0] || '').replace(/\s/g, '').length,
      reversed: (params[0] || '').split('').reverse().join(''),
      timestamp: new Date().toISOString(),
    },
    method: 'process_data',
  }),
  get_system_info: () => ({
    success: true,
    result: {
      platform: 'Browser (Dev Mode)',
      platform_release: navigator.userAgent,
      platform_version: 'N/A',
      architecture: 'N/A',
      processor: 'N/A',
      python_version: 'Mock — no Python runtime',
      hostname: window.location.hostname || 'localhost',
      timestamp: new Date().toISOString(),
    },
    method: 'get_system_info',
  }),
  fibonacci: (params) => {
    const n = params[0] || 0;
    if (n <= 0) return { success: true, result: [], method: 'fibonacci' };
    const seq = [0, 1];
    for (let i = 2; i < n; i++) seq.push(seq[i - 1] + seq[i - 2]);
    return { success: true, result: seq.slice(0, n), method: 'fibonacci' };
  },
  async_heavy_task: (params) => ({
    success: true,
    result: {
      status: 'completed',
      requested_duration: params[0] || 2,
      actual_duration: params[0] || 2,
      message: `Mock heavy task finished in ${params[0] || 2}s`,
      timestamp: new Date().toISOString(),
    },
    method: 'async_heavy_task',
  }),
  process_file_demo: (params) => ({
    success: true,
    result: {
      message: `Mock: File '${params[0]}' processed with content: '${params[1]}'`,
      path: '/mock/path/to/file.txt',
      timestamp: new Date().toISOString()
    },
    method: 'process_file_demo'
  })
};
