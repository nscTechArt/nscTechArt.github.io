---
layout: page
permalink: /blogs/Unity/SRP中的Shadows/index.html
title: SPR中的Shadows
---

### SRP中的Shadows

ShadowMap的原理是：从光线的角度渲染场景，只存储深度信息，得到的结果代表着光线在照射到场景中的物体之前，经过了多远的距离。

#### 平行光

但是在unity中，平行光被假定为距离无限远，并没有一个真实且确定的位置。为了计算平行光的ShadowMap，我们需要做的是：

- 计算出与平行光方向所匹配的view projection矩阵
- 提供一个clip space的立方体，这个立方体和包含可见光阴影的摄像机的可见区域重叠

<br>Unity为把这些步骤封装成了cullingResults中的一个方法`ComputeDirectionalShadowMatricesAndCullingPrimitives()`,它包含了九个参数

1. activeLightIndex：当前可见光在数组中的索引
2. splitIndex：级联阴影的索引
3. splitCount：级联的数量
4. splitRatio：级联的比率
5. shadowResolution：shadowMap的分辨率
6. shadowNearPlaneOffset：灯光的near plane偏移
7. viewMatrix：计算出的view矩阵
8. projMatrix：计算出的projection矩阵
9. shadowSplitData：计算出的[级联阴影数据](https://docs.unity3d.com/ScriptReference/Rendering.ShadowSplitData.html)，包含了给定级联阴影的剔除信息

