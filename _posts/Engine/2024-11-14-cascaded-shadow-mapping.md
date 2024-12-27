---
title: Cascade Shadow Mapping
date: 2024-11-14 11:09 +0800
categories: [Graphics, Shadows]
media_subpath: /assets/img/Graphics/24-11-14/
math: true
---

传统的shadow mapping技术存在一些缺点：

- shadow map始终围绕光源创建，而非相机看向的位置
- shadow map的正交投影矩阵与相机视锥体没有很好的契合
- 如果阴影渲染距离较大，则阴影会显得模糊

对此，级联阴影给出的解决方法是对于不同距离范围的物体，使用不同的shadow map，在片段着色器中，根据片段的深度值选择对应的shadow map进行采样。**通过这样的做法，每个shadow map都能够对较小范围的区域进行采样，从而更好地匹配view space与纹理空间中的采样频率，降低shadow mapping的锯齿。**

级联阴影的算法可以概括为如下步骤：

1. 将视锥体划分为数个子视锥体
2. 为每个子视锥体计算紧密贴合的正交矩阵
3. 为每个子视锥体渲染平行光的shadow map
4. 将所有的shadow map传递给片段着色器
5. 根据片段的深度值，选择正确的shadow map进行采样

---

在级联阴影技术中，较为重要的是关于视锥体的划分。我们用`PSSM(m, res)`来表示我们的划分方案，其中：

- `PSSM`是parallel-split shadow maps的缩写
- `m`表示切分视锥体的数量
- `res`表示每个shadow map的分辨率

PSSM(m, res)的具体方案如下图所示：

![](10fig02.jpg)

我们将遵循下面这几个步骤：

1. 根据在$\{C_i\}$处的平面，将视锥体$V$分割为$m$个子视锥体，记作$\{V_i\}$
2. 为每个子视锥体$\{V_i\}$计算出光源的view-proje变换矩阵
3. 为每个子视锥体$\{V_i\}$生成分辨率为`res`的shadow map
4. 完成shadow mapping计算

#### Step 1: Splitting the View Frustum

首先，我们需要判断split plane的放置位置。在这里，我们有必要简单回顾一下shadow mapping中的锯齿产生的原因。如下图所示，$ds$表示shadow map的纹素大小，$dp$表示物体在屏幕投影的长度，我们可得：


$$
\frac{dp}{ds}=n\frac{dz}{zds}\frac{cos\phi}{cos\theta}
$$


我们希望$\frac{dp}{ds}$作为shadow map aliasing error能够保持不变，从而使得不同深度的物体的每个像素在shadow map上的覆盖区域保持不变，也就是锯齿在场景不同深度下保持恒定。
