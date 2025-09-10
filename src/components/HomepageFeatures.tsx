import React from 'react';
import clsx from 'clsx';
import {translate} from '@docusaurus/Translate';
import styles from './HomepageFeatures.module.css';

const FeatureList = [
  {
    title: translate({
      id: 'homepage.features.generics.title',
      message: '泛型支持',
      description: 'Title for generics feature'
    }),
    Svg: require('@site/static/img/performance.svg').default,
    description: translate({
      id: 'homepage.features.generics.description',
      message: '基于 Go 1.18+ 泛型的类型安全实现，支持任意数据类型，提供编译时类型检查。',
      description: 'Description for generics feature'
    }),
  },
  {
    title: translate({
      id: 'homepage.features.batch.title',
      message: '批处理',
      description: 'Title for batch processing feature'
    }),
    Svg: require('@site/static/img/easy-to-use.svg').default,
    description: translate({
      id: 'homepage.features.batch.description',
      message: '支持按大小和时间间隔自动批处理，优化数据处理效率，减少系统调用开销。',
      description: 'Description for batch processing feature'
    }),
  },
  {
    title: translate({
      id: 'homepage.features.concurrent.title',
      message: '并发安全',
      description: 'Title for concurrency feature'
    }),
    Svg: require('@site/static/img/error-handling.svg').default,
    description: translate({
      id: 'homepage.features.concurrent.description',
      message: '内置 goroutine 安全机制，支持高并发场景，确保数据处理的线程安全性。',
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