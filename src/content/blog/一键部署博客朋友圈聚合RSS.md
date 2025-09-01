---
title: 一键部署博客朋友圈聚合RSS-API
date: 2025-09-01 11:33:00
categories: code
tags:
  - RSS
  - 博客

id: RSS
cover: 一键部署博客朋友圈聚合RSS
recommend: true
---

:::note
一键部署博客朋友圈聚合RSS
:::

之前就看到博客主题有一个朋友圈的功能，很想在自己博客实现，但因为部署不了FreeshRSS就放弃了，昨天逛别人博客看到别人的朋友圈刚好想起来这个事，于是就想着自己搞一个依旧白嫖大善人来实现博客RSS聚合API,再通过这个API构建前端页面，想到就开干！！！

## 一键部署（超简单）

[项目地址](https://github.com/gdydg/cf-rss-aggregator)

- 创建KV数据库，名字随便，复制KV数据库的id，粘贴到`wrangler.toml`里面id那里

[![KfzmGat.th.png](https://iili.io/KfzmGat.th.png)](https://freeimage.host/i/KfzmGat)


- 到workers连接Git仓库，什么都不用设置，一键部署。

- 设置自定义域，访问https://<你的域名>/api/friends,这个就是你的api了。（有时候没刷新出来可以访问`https://<你的域名>/api/friends?fresh=1`强制刷新数据）

[![KfxAGIf.md.png](https://iili.io/KfxAGIf.md.png)](https://freeimage.host/i/KfxAGIf)

## 自定义选项

自定义都可以在`wrangler.toml`文件里面自己设置。比如RSS源，定时刷新时间等等，还有就是api默认返回文章数量可以在`index.ts`里面修改。自己可以根据api返回格式适应前端显示，ok完了没内容了，该项目和cursor一起完成，在这里不得不感慨实在是太强了，哈哈。
