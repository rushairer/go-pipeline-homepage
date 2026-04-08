import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {translate} from '@docusaurus/Translate';
import HomepageFeatures from '../components/HomepageFeatures';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className="hero hero--primary">
      <div className="container">
        <h1 className="hero__title">{siteConfig.title}</h1>
        <p className="hero__subtitle">{translate({
          id: 'homepage.tagline',
          message: siteConfig.tagline,
          description: 'Homepage tagline'
        })}</p>
        <div className="buttons">
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro">
            {translate({
              id: 'homepage.quickStart',
              message: '阅读 v2.2.4 文档',
              description: 'Quick start button text'
            })}
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={translate({
        id: 'homepage.title',
        message: `首页 - ${siteConfig.title}`,
        description: 'Homepage title'
      })}
      description={translate({
        id: 'homepage.description',
        message: 'Go Pipeline v2.2.4 文档站，覆盖标准管道、去重管道、配置调优与 API 参考',
        description: 'Homepage description'
      })}>
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
