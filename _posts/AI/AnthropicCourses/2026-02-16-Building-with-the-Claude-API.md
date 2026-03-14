---
title: Building with the Claude API
date: 2026-02-16 21:45 +0800
categories: [AI, Anthropic Courses]
media_subpath: /assets/img/AI/AnthropicCourses
---

> 本文翻译自[Building with the Claude API](https://anthropic.skilljar.com/claude-with-the-anthropic-api)

# About this course

这个课程主要集中在如何使用Anthropic API将Claude AI集成到应用程序中。课程内容涵盖基础API操作、高级提示技术、工具集成以及构建AI驱动系统的架构模式。通过实践练习和实际案例，参与者将学习如何实现对话式AI、检索增强生成、自动化工作流，并利用Claude的多模态功能处理文本、图像和文档。

---

# Accessing Claude with the API

## Accessing the API

在使用Claude构建应用程序时，我们有必要理解完整的request lifecycle，从而帮助我们更好地做出架构决策与高效地调试问题。我们将会逐步了解从聊天界面点击“发送”到Claude响应消息的屏幕上的完整的过程。

### The Five-Step Request Flow

与Claude的每次交互都遵循一个固定的模式，可以分为五个不同的阶段：

请求服务器 -> 请求Anthropic API -> 模型处理 -> 回应到服务器 -> 回应到客户端

![](instructor_a46l9irobhg0f5webscixp0bs_public_1748623275_03_-_001_-_Accessing_the_API_03.1748623275310.png)

### Why You Need a Server

为什么不能直接请求到Anthropic API，而是需要经由服务器呢？原因如下：

- API请求需要一个API key作为验证手段
- 将API key暴露在客户端代码中存在严重的安全隐患
- 拿到API key的任何人都可以直接发送未经你授权的请求

所以，通过客户端将请求发送到自己的服务器，该服务器然后使用安全存储的密钥与Anthropic API进行通信是更合理的方案。

### Making API Requests

