import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      type: 'category',
      label: '开始使用',
      items: ['intro'],
    },
    {
      type: 'category',
      label: '管道类型',
      items: ['standard-pipeline', 'deduplication-pipeline'],
    },
    {
      type: 'category',
      label: '配置和API',
      items: ['configuration', 'api-reference'],
    },
  ],
};

export default sidebars;