---
name: shw-lib-docs
description: 公司 lib 组件库文档指路。在项目里用到或排查公司组件（会话、错误处理、后台任务、权限、分布式锁、验证码、加密、附件、短信、快递、企微、行政区划、序列号等）时触发。先检测项目是否依赖公司 lib（PHP 查 composer.json、Go 查 go.mod），依赖确认后引导读取 lib 仓库自己的 README 与 docs 目录获取设计规范与使用指南。本 skill 不含任何组件知识，只做指路。
---

# 公司 lib 文档指路

## 概述

公司组件库（lib）的设计规范与使用指南由 **lib 仓库自己的文档承载**——README 与 docs 目录是唯一知识源头。本 skill 不复制任何组件知识（表结构、Redis key 设计、加密参数、算法细节一律不在此），只做两件事：**确认项目用了 lib → 告诉你去哪里读文档**。

## 1. 依赖检测：项目是否使用公司 lib

动手查组件文档前，先确认项目确实依赖公司 lib：

- **PHP 项目**：查 `composer.json` 的 `require` 是否含 `shw/hyperf-lib`（公司 Hyperf 组件库）
- **Go 项目**：查 `go.mod` 的 require 是否含公司 lib module（gf-lib 系；真实 module 地址以公司私有仓库为准，以 go.mod 实际条目判断）

未命中 → 本项目未使用公司 lib，不进入文档定位；命中 → 进入下节。

## 2. 文档定位：去 lib 仓库读 README 与 docs

项目依赖确认后，所有组件问题——**怎么引入、怎么配置、怎么调用、表结构怎么设计、为什么这样设计**——答案都在 lib 仓库：

1. **先读 lib 包/仓库的 README**：组件总览、快速上手、各组件入口索引
2. **再按需读 docs 目录**：按组件名找对应文档，读该组件的设计规范与使用指南

## 3. 组件指路示例

用到下列任一组件时，走上面两步去 lib 文档里查该组件的章节：

会话（session）、错误处理（error handling）、后台任务（task）、权限（rbac）、分布式锁（redis lock）、序列号生成（seqnum）、验证码（otp）、字段加密（crypto）、附件（attachment）、短信（sms）、快递物流（express）、企业微信（wecom）、行政区划（region）

## 何时调用本 skill

- 用户提到某个公司组件怎么用、怎么配、报错怎么排查
- 代码里出现公司 lib 的包引入（composer / go import），需要理解其用法
- 新项目要集成公司组件库，需要知道引入方式与配置项
