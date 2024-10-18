---
title: Implement GPU-Driven Rendering
date: 2024-10-17 08:25 +0800
categories: [Graphics, Modern Vulkan Cookbook]
media_subpath: /assets/img/Graphics/LearnVulkan/
math: false
---

### Implementing GPU-driven line rendering

我们将会使用GPU-driven直接从shader中绘制线条，同时最小化CPU的参与。

为了实现这个效果，我们需要创建一个device-local buffer，它负责存储下列信息：

- 线段本身的参数
- 间接绘制调用线段的相关变量与参数，如最大线段数量

实现的步骤如下：

1. 首先我们定义出buffer的结构

   ```
   
   ```

   