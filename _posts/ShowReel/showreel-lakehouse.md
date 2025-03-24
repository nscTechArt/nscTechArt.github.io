---
title: Lake House场景总结
date: 2025-02-28 09:40 +0800
categories: [ShowReel]
media_subpath: /assets/img/ShowReel
tag: [ShowReel, Unity]
math: true
pin: true
image:
  path: /LakeHouse_PreviewImage.png
---

### Overview

本工程包含了两个场景，分别参考了[School Ghost的走廊场景](https://www.artstation.com/artwork/Yanxgb)与[Alan Wake2中的LakeHouse场景](https://www.artstation.com/artwork/EzYry4)。两个场景均在Blender中搭建，其中部分模型、贴图资产自制。

本工程主要涉及的技术点如下：

- [x] 基于视锥体对齐的体积纹理的Volumetric Fog
- [x] 基于LTC的纹理支持的实时面光源
- [x] 基于Dual Kawase Blur的眨眼后处理效果
- [x] VHS风格的综合后处理效果
- [x] 体素化材质效果
- [ ] 使用*Substance Designer*创建弹孔材质

---

### Volumetric Fog

 使用视锥体对齐的体积纹理来渲染真实感体积雾，包含了以下feature：

- [x] Constant/Height Based Fog
- [x] Directional/Point/Spot/Area Light Supported
- [x] Variable Fog Density / Speed/ Direction
- [x] Variable Fog Ambient 
- [x] Anisotropy and Multiple Phase Mode
- [x] Temporal Filtering

#### 体积雾原理

在体积渲染中，我们所研究的对象是光线与构成参与介质的粒子的交互行为。我们以能量为划分依据，将交互行为分为两类：

- 光线在参与介质中发生**能量损耗**：

  - **Absorption**：光线的一部分能量被组成volume的粒子吸收
  - **Out-scattering**：光线在到达眼睛的途中因散射而偏离了既定方向

- 光线在参与介质中发生**能量增益**：

  - **Ambient**：Volume能够自发光、或者从环境中获得的“全局光照”

  - **In-scattering**：一些最初并非朝着眼睛传播的光由于散射而被重新定向朝着眼睛传播

计算光线的透射率，我们可以使用**Beer-Lambert定律**以计算光线在传播过程中的能量损失。而雾通常由较大的粒子构成，遵循所谓的**米氏散射模型**，这样的volume通常**倾向于在一个受限的方向范围内散光线**，这种性质被称为**各向异性**，我们可以使用**相位函数**来描述。

#### 实现思路

核心思路在于，**使用3D纹理来存储计算数据，从而对雾效的散射计算与光线步进进行一定程度的解耦，并使用compute shader实现高效的RayMarching与数据写入**。

本工程在URP管线下实现，其中Render Feature所负责的主要任务包括：

- 创建并维护相关的纹理资源
- 更新Compute Buffer，向GPU传递体积雾与场景中光源的数据
- 调用Compute Shader

两个Compute Shader分别负责计算体素的颜色贡献/透射率与计算积分，最后通过一个后处理Shader将雾效应用与场景中。整个流程如下图所示：

![](LakeHouse_XMind.png)

#### 实现细节

##### Frustum-Aligned Volume Texture

##### Constant/Height Based Fog

**Constant Fog**：具有全局“均一”密度的体积雾

**Height Based Fog**：根据体素对应的世界空间坐标，对应到指数分布作为密度值

此外，通过噪音函数或采样3D噪声纹理，我们获取一个空间上连续的噪声值，作为两种雾密度的乘数，以实现空间中密度分布不均匀的效果。

```glsl
// generate noise
// --------------
float noise = GetNoise(pos) * FogData.density;

// constant fog
// ------------
float constantFog = FogData.constantFog;

// height fog
// ----------
float height = -pos.y + FogData.heightFogOffset;
float heightFog = max(exp(FogData.heightFogExponent * height) * FogData.heightFog, 0.0);

// apply noise and global density multiplier
// -----------------------------------------
constantFog *= noise;
heightFog *= noise;

return max(0.0, constantFog + heightFog);
```
{: file="Froxel.compute"}