---
title: Unity中的法线混合
date: 2021-12-07 09:40 +0800
categories: [Unity, Rendering]
media_subpath: /assets/img/Unity/rendering
tag: [Unity]
math: false
---

> [Blending in Detail](https://blog.selfshadow.com/publications/blending-in-detail/)

### 1. 法线贴图

在了解法线混合之前，我们首先需要了解法线贴图自身的含义：法线贴图通过 **RGB 通道的三个分量**存储表面法线的方向信息，这些分量直接决定了光照计算的细节表现。

#### 1.1 切线空间

法线贴图通常基于 **切线空间（Tangent Space）**，而非模型或世界空间。也就是说，**RGB通道分别表示切线空间中的三个轴向的向量**：

- **R通道** → **切线方向（Tangent 方向，X 轴）**
- **G通道** → **副切线方向（Bitangent 方向，Y 轴）**
- **B通道** → **法线方向（Normal 方向，Z 轴）**

至于为什么将法线信息存储在切线空间中，主要可以总结出以下三点原因：

1. **相对方向**：存储法线相对于模型表面的偏移方向，而非绝对世界坐标。
2. **旋转不变性**：模型旋转时，切线空间法线无需重新计算，适合动画和动态物体。
3. **复用性**：同一张法线贴图可应用于不同姿态或位置的模型。

#### 1.2 物理意义

那么法线贴图是如何影响光照计算的呢，换句话说，法线贴图所存储的向量的物理意义是什么？

- **R通道** → **控制左右倾斜**
  - R 值 > 0.5：法线向右偏移，光照在右侧更亮，左侧更暗。
  - R 值 < 0.5：法线向左偏移，效果相反。
- **G通道** → **控制前后倾斜**
  - G 值 > 0.5：法线向前（沿副切线方向）偏移，顶部更亮，底部更暗。
  - G 值 < 0.5：法线向后偏移，效果相反。
  - **注意**：OpenGL 与 DirectX 的 Y 轴方向相反，本篇博客以DirectX为前提进行讨论
- **B通道** → **控制垂直高度**
  - B 值接近 1（Z ≈ 1）：表面平坦，无倾斜。
  - B 值降低（Z 减小）：法线向外或向内倾斜，模拟凸起或凹陷。
  - 可以说B通道主导了法线强度

#### 1.3 压缩格式

我会在单独的一篇博客中讨论纹理压缩的相关内容

#### 1.4 着色计算

我们通常在片段着色其中计算法线，流程如下：

- 从法线贴图读取RGB值并解包到[-1,1]范围。
- 构建TBN矩阵将法线转换到世界/视图空间。
- 使用变换后的法线进行光照计算。

以GLSL为实例：

```glsl
vec3 normal = texture(normalMap, uv).rgb;
normal = normalize(normal * 2.0 - 1.0); // [0,1] → [-1,1]
mat3 TBN = mat3(tangent, bitangent, normal);
vec3 worldNormal = normalize(TBN * normal);
```

---

### 2 法线混合

法线混合通过**为基础法线添加高频细节来实现真实细腻的材质效果**，但由于法线贴图实际存储的是方向信息，我们不能像处理颜色贴图那样简单地通过线性插值来实现法线贴图之间的混合。

具体来说，法线混合的要求如下：

- 混合后保持法线方向的物理正确性（归一化向量）
- 避免细节冲突（如交叉法线导致的光照错误）

下面我们将探讨法线混合的常见做法。

#### 2.1 Linear Blending

![](113015.png)

这种做法类似于对两张法线贴图求平均值，即将法线数据简单相加，再做归一化处理：

```glsl
float3 blend_linear(float4 n1, float4 n2)
{
    float3 r = (n1 + n2)*2 - 2;
    return normalize(r);
}
```

这是一种简单高效的实现方式，但是在某些情况下会导致法线信息的严重失真：

1. **方向冲突**

   当法线方向恰好相反时，混合结果为0，必然会导致光照异常

2. **丢失高频特征**

   直接对法线向量做加权平均，进而导致高频细节（如岩石的尖锐棱角）会被低频区域（如沙地的平滑起伏）**“稀释”**。

3. **物理错误**

   线性混合本质是向量空间的**线性叠加**，但法线贴图描述的是**表面曲率**，**曲率的变化是非线性的**。直接叠加会破坏曲率连续性，导致光照计算偏离物理真实。

#### 2.2 Overlay Blending

![](152901.png)

Overlay混合模式与Photoshop中的**叠加模式相同**，其目标是**增强对比度**，核心原理为**根据基础法线的亮度动态调整混合效果**：

- **暗区（n1 < 0.5）**：使用乘法混合（类似正片叠底），强化暗部细节。
- **亮区（n1 ≥ 0.5）**：使用屏幕混合（Screen），强化亮部细节。

```glsl
float3 blend_overlay(float4 n1, float4 n2)
{
    n1 = n1*4 - 2;
    float4 a = n1 >= 0 ? -1 : 1;
    float4 b = n1 >= 0 ?  1 : 0;
    n1 =  2*a + n1;
    n2 = n2*a + b;
    float3 r = n1*n2 - a;
    return normalize(r);
}
```

但考虑到**Overlay混合依然是逐通道操作**，**有可能改变法线向量各分量之间的比例**，进而导致最终的法线失真。

#### 2.3 Partial Derivative Blending

![](154605.png)

在Substance Designer中，我们可以从高度图中生成法线贴图，具体来说，是**通过计算高度图的梯度来推导表面法线的方向**。而在偏导数混合方案中，我们将法线贴图是为法线向量的梯度，即高度场的偏导数，通过混合偏导数而非直接混合法线向量，重新构造出新的法线贴图：

```glsl
float3 blend_pd(float4 n1, float4 n2)
{
    n1 = n1*2 - 1;
    n2 = n2.xyzz*float4(2, 2, 2, 0) + float4(-1, -1, -1, 0);
    float3 r = n1.xyz*n2.z + n2.xyw*n1.z;
    return normalize(r);
}
```

通过直接混合表面曲率（偏导数），混合后的法线更符合物理规律，避免传统线性混合导致的光照失真。同时混合权重可以实时动态调整，适合需要渐变过渡的场景。

但是，偏导数混合方法通常假设法线贴图是由高度场生成。如果原始法线贴图非高度场导出（如手绘法线），混合后可能出现误差。

#### 2.4 Whiteout Blending

![](160205.png)

```glsl
float3 blend_whiteout(float4 n1, float4 n2)
{
    n1 = n1*2 - 1;
    n2 = n2*2 - 1;
    float3 r = float3(n1.xy + n2.xy, n1.z*n2.z);
    return normalize(r);
}
```

#### 2.5 UDN Blending

![](160434.png)

```glsl
float3 blend_udn(float4 n1, float4 n2)
{
    float3 c = float3(2, 1, 0);
    float3 r;
    r = n2*c.yyz + n1.xyz;
    r =  r*c.xxx -  c.xxy;
    return normalize(r);
}
```

#### 2.6 RNM

RNM（**Reoriented Normal Mapping**）的核心思想是重定向次法线到主法线空间：

```glsl
float3 blend_rnm(float4 n1, float4 n2)
{
    float3 t = n1.xyz*float3( 2,  2, 2) + float3(-1, -1,  0);
    float3 u = n2.xyz*float3(-2, -2, 2) + float3( 1,  1, -1);
    float3 r = t*dot(t, u) - u*t.z;
    return normalize(r);
}

float3 blend_unity(float4 n1, float4 n2)
{
    n1 = n1.xyzz*float4(2, 2, 2, -2) + float4(-1, -1, -1, 1);
    n2 = n2*2 - 1;
    float3 r;
    r.x = dot(n1.zxx,  n2.xyz);
    r.y = dot(n1.yzy,  n2.xyz);
    r.z = dot(n1.xyw, -n2.xyz);
    return normalize(r);
}
```

