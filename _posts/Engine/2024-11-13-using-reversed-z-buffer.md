---
title: Using Reversed Z Buffer
date: 2024-11-13 16:21 +0800
categories: [Engine, Evnia Engine Developing]
media_subpath: /assets/img/Engine/evnia/
math: false
---

记录一下将渲染器切换到Reversed Z Buffer的过程

![](zbuffer.png)

切换到Reversed Z Buffer需要完成下面几个步骤

- 交换远近裁截面的值
- 将深度比较函数改为`VK_COMPARE_OP_GREATER_OR_EQUAL` 
- 将深度的`VkClearVaule`从`1.0f`改为`0.0f`
- 确保使用浮点精度的depth buffer

