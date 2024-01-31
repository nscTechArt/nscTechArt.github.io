---
layout: page
permalink: /blogs/Unity/Unity中的Culling/index.html
title: Unity中的Culling
---

### Unity中的Culling

#### 哪些是需要剔除的内容

**广义上来说**

- 看不见的像素、Mesh、对象
- 重复的、用不到的资源
- 不需要、不执行的代码

**狭义上来说**

- 像素剔除：摄像平截头体剔除、Back-face Culling、Early-Z、Pre-Z Pass
- 网格剔除：Layer Mask、可见距离剔除、Occlusion Culling
- 灯光剔除：Tile-Based Defferd Rendering、Forward+
- 场景剔除：Additive Scene

**开发者拓展剔除**

