---
title: PBR From Learn OpenGL
date: 2024-10-05 15:23 +0800
categories: [Graphics, Physical Based Rendering]
media_subpath: /assets/img/Graphics/pbr/
math: true
---

### Theory

PBR光照模型需要满足三个条件，我们才可以称之为是“基于物理的”：

- 基于微表面模型
- 满足能量守恒
- 使用基于物理的BRDF

#### 微表面模型

所有的PBR技术都基于微表面理论，该理论描述了在微观层面上，任何表面都可以用一种完美反射的微小平面来描述，我们将这个微小的平面称为microfacets。粗糙度描述了表面上的微表面的排列方式，表面越粗糙，则这些微表面在表面上的排列越混乱，如下图所示：

![](microfacets.png)

在微观尺度上，没有表面是完全光滑的，但是由于这些微表面足够小，我们可以在给定一个粗糙度参数的情况下，通过统计方法来近似地估计表面的微表面粗糙程度。具体来说，当给定表面的粗糙度时，我们可以计算出与半程向量$h$大致对齐的微表面占所有微表面的比值。其中，半程向量$h$由光线方向与观察方向计算得到。

与$h$对齐的微表面越多，则在宏观上，表面的镜面反射就会更强烈且清晰。最终，结合一个范围在0到1之间的粗糙度参数，我们可以近似出微表面的对齐情况，如下图所示

![](ndf.png)

#### 能量守恒

在PBR中，我们需要遵循能量守恒定律，即出射光的能量不应超过入射光的能量。

为了实现这一定律，我们通常需要明确区分漫反射与镜面反射。当光线照射到物体表面时，会分为折射部分与反射部分，后者所指的是光线直接被反射而不会进入到表面内部，也就是我们所说的镜面反射。而折射则表示进入表面进而被表面吸收的剩余的光量，也就是漫反射。

通常来说，进入表面的光线的能量并非完全被表面吸收，存在一部分光线会在能量耗尽之间重新离开表面，如下图所示。但是，在PBR中这一部分被散射出来表面的光线会被忽略掉。

![](surface_reaction.png)

关于折射与反射，我们还有一点需要注意的是金属材质与非金属材质之间的区别。金属材质同样遵循我们上述的反射与折射原理，但是对于金属来说，所有的折射光线都会直接被吸收，而不会由任何散射。这意味着金属表面只有镜面反射，而没有漫反射。由于金属和非金属的这点区别，我们在PBR中会对二者使用不同的计算方法。

由于能量守恒定律的存在，我们知道，任何被反射的光能都不会被表面吸收，因此，我们可以先计算镜面反射的部分，也就是入射光线的能量被反射的百分比，然后再直接计算出折射的部分

```c++
float kS = calculateSpecularComponent(...); // reflection/specular fraction
float kD = 1.0 - kS;                        // refraction/diffuse  fraction
```

#### 反射率方程

在PBR中，我们会使用到一种更专业版本的渲染方程，我们称之为反射率方程reflectance equation


$$
L_o(p,w_o)=\int_{\Omega}f_r(p,w_i,w_o)L_i(p,w_i)n\cdot w_idw_i
$$


想要理解反射率方程，需要我们了解几个辐射测量学中的概念。首先是**radiance**，在方程中用$L$表示，用于量化来自单一方向光的大小或强度。它是多个物理量的组合，包括

- **Radiant flux**：辐射通量，记为$\Phi$，指的是单位时间内通过某一面积的辐射能量

- Solid angle：立体角，记为$\Omega$，表示投影到单位球面上的形状的面积

  ![](solid_angle.png)

- Radiant intensity：辐射强度，记作$I$，表示单位立体角上的辐射通量，也就是光线投射到单位球面上的特定区域上的能量。我们可以用公式表示：


$$
I = \frac{d\Phi}{d\omega}
$$


有了辐射通量、辐射强度和立体角的知识，我们终于可以描述辐射亮度的方程。辐射亮度被描述为在立体角 ω 下、面积为 A 的区域中，辐射强度为 Φ 的光所观测到的总能量。


$$
L=\frac{d^2\Phi}{dAd\omega cos\theta}
$$


