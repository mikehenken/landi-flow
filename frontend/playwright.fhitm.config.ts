import baseConfig from './playwright.config';

/** FHITM matrix runner — expects dev server already running on :3000 */
export default {
  ...baseConfig,
  projects: baseConfig.projects?.map((project) => ({
    ...project,
    webServer: undefined,
  })),
};
