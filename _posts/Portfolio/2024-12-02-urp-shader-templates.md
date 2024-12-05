---
title: URP Shader Templates
date: 2024-12-02 16:48 +0800
categories: [Portfolio, Unity]
media_subpath: /assets/img/Portfolio/Unity/
math: false
---

我想实现一个最简单的Metallic Workflow的PBR材质，不包含任何贴图，使用最基础的材质属性，包括

- baseColor
- metallic
- smoothness
- normal scale

---

我们需要根据材质属性，构建两个用于PBR计算的结构体：

```glsl
struct SurfaceData
{
    half3 albedo;
    half3 specular;
    half  metallic;
    half  smoothness;
    half3 normalTS;
    half  occlusion;
    half  alpha;
};
```

```glsl
struct SimpleInputData
{
    float3  positionWS;
    float3  normalWS;
    half3   viewDirectionWS;
};
```

PBR算法的步骤如下：

- 根据`SurfaceData`，初始化`BRDFData`

---

