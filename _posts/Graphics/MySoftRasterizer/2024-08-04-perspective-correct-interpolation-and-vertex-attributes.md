---
title: Perspective Correct Interpolation and Vertex Attributes
date: 2024-08-04 23:30 +0800
categories: [Graphics, Build A Soft Rasterizer]
media_subpath: /assets/img/Graphics/MySoftRasterizer/
math: true
---

### 为什么需要透视矫正

对于顶点属性来说，如果我们直接使用重心坐标，在投影三角形的表面上进行线性插值，会造成渲染结果的失真。这是因为，**重心坐标是在二维空间中进行计算的，如果直接用重心坐标进行线性插值，实际上就忽略掉了透视投影引入的深度变化。**

### 透视矫正的实现方法

要实现透视矫正，我们可以首先将顶点属性除以对应顶点的Z坐标，之后再进行线性插值。
