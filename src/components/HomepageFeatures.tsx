import React from 'react';
import clsx from 'clsx';
import {translate} from '@docusaurus/Translate';
import styles from './HomepageFeatures.module.css';

const FeatureList = [
  {
    title: translate({
      id: 'homepage.features.generics.title',
      message: 'v2.2.4 同步',
      description: 'Title for generics feature'
    }),
    Svg: require('@site/static/img/performance.svg').default,
    description: translate({
      id: 'homepage.features.generics.description',
      message: '文档已同步到 2.2.4，包括同步路径复用、Metrics 热路径优化与版本说明。',
      description: 'Description for generics feature'
    }),
  },
  {
    title: translate({
      id: 'homepage.features.batch.title',
      message: '运行语义清晰',
      description: 'Title for batch processing feature'
    }),
    Svg: require('@site/static/img/easy-to-use.svg').default,
    description: translate({
      id: 'homepage.features.batch.description',
      message: '统一说明 done、ErrorChan、FinalFlushOnCloseTimeout 与 MaxConcurrentFlushes 的行为。',
      description: 'Description for batch processing feature'
    }),
  },
  {
    title: translate({
      id: 'homepage.features.concurrent.title',
      message: '多语言已同步',
      description: 'Title for concurrency feature'
    }),
    Svg: require('@site/static/img/error-handling.svg').default,
    description: translate({
      id: 'homepage.features.concurrent.description',
      message: '英文、法文、俄文已跟进新版结构与核心语义，避免旧 API 示例残留。',
      description: 'Description for concurrency feature'
    }),
  },
];

function Feature({Svg, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
