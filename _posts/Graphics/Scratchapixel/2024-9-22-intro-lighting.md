---
title: Introduction to Lighting
date: 2024-09-22 23:38 +0800
categories: [Graphics, Scratchpixel]
media_subpath: /assets/img/Graphics/Scratchapixel/
math: true
---

> 本篇博客所讨论的光源及其实现以光线追踪为前提

### Introduction to Lighting in 3D Rendering

在计算机图形学中，想要模拟光线与场景中物体的交互，我们需要考虑以下几个方面：

- 对于光源来说，采样点是否在阴影中，即采样点是否可见
- 如果采样点可见，如何计算光源对于采样点的贡献值

我们来依次讨论

#### Determining Whether the Point is in Shadow

在光线追踪算法中，我们首先构建出从相机到场景的中光线，当光线与场景中的物体相交时，我们想知道相交点处接收到了多少光。为此，我们需要构建从该交点到光源的射线。如果该射线与场景中的物体发生相交，则该交点位于阴影中，对光源来说是不可见的，否则，该交点就能够被照亮。如下图所示：

![](intro-lighting-shadowrays.png)

#### Calculate Contribution of Light to Point P

