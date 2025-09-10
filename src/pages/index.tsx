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
              message: '快速开始 - 5分钟 ⏱️',
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
        message: '高性能Go批处理管道框架，支持泛型、并发安全和去重功能',
        description: 'Homepage description'
      })}>
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}