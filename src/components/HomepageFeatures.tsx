import React from 'react';
import clsx from 'clsx';
import styles from './HomepageFeatures.module.css';

const FeatureList = [
  {
    title: '泛型支持',
    Svg: require('@site/static/img/performance.svg').default,
    description: (
      <>
        基于 Go 1.18+ 泛型的类型安全实现，支持任意数据类型，提供编译时类型检查。
      </>
    ),
  },
  {
    title: '批处理',
    Svg: require('@site/static/img/easy-to-use.svg').default,
    description: (
      <>
        支持按大小和时间间隔自动批处理，优化数据处理效率，减少系统调用开销。
      </>
    ),
  },
  {
    title: '并发安全',
    Svg: require('@site/static/img/error-handling.svg').default,
    description: (
      <>
        内置 goroutine 安全机制，支持高并发场景，确保数据处理的线程安全性。
      </>
    ),
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