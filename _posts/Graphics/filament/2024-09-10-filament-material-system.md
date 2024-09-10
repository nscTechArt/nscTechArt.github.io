---
title: Filament -- Material System
date: 2024-09-10 14:57 +0800
categories: [Graphics, Filament]
media_subpath: /assets/img/Graphics/filament/
math: true
---

### Standard model

我们将实现一个由BSDF双向散射分布函数描述的材质，其中BSDF本身由另外两个函数组成：BRDF双向反射函数与BTDF双向透射函数。由于我们要模拟常见的表面，所以我们在本系列博客中会侧重于BRDF。

BRDF可以分为两个部分：

- 漫反射部分，记为$f_d$
- 镜面反射部分，记为$f_r$

我们可以用下图来表示入射光线、表面法线与表面之间的关系（暂时忽略次表面散射）：

![](diagram_fr_fd.png)

我们也可以通过公式表示：


$$
\begin{equation}\label{brdf}
f(v,l)=f_d(v,l)+f_r(v,l)
\end{equation}
$$


需要注意的是，这个公式表示的是来自单一方向的入射光的表面交互，完整的渲染方程需要我们在整个半球方向上进行积分。

现实世界中的表面并不是平整的，我们需要一个能够描述光与不规则表面相互作用的模型。在BRDF中，我们引入微表面的概念，也就是说，物体的表面在微观上由大量随机排列的微小面microfacet组成。下图展示了微表面模型的概念：

![](diagram_microfacet.png)

我们从下图中可以看出，只有当微表面的法线方向指向入射方向与观察方向的半程向量时，才能被观察到：

![](diagram_macrosurface.png)

但是这并非是微表面可见的充分条件，在BRDF中，我们同样需要考虑到遮蔽masking与阴影shadowing，如下图所示：

![](diagram_shadowing_masking.png)

在微表面BRDF模型中，粗糙度描述了在微观层面上的粗糙或光滑程度，表面越光滑，则满足微表面可见条件的微表面就会越多，从而让表面更光滑，表面越粗糙，就会导致镜面反射的高亮模糊，这个过程如下图所示：

![](diagram_roughness.png)

下面是用于描述微表面模型的公式：


$$
f_x(v, l)=\frac{1}{|n\cdot v||n \cdot l|}\int_{\Omega}D(m, \alpha)G(v,l,m)f_m(v, l, m)(v\cdot m)(l\cdot m)dm
$$


其中：

- $x$代表镜面或漫反射部分
- $D$表示微表面分布模型
- $G$模拟了微表面的可见度，即occlusion或shadow-masking
- $f_m$对于漫反射部分和镜面反射部分的实现不同

需要注意的是，此方程用于在微观层面上对半球进行积分，如下图所示：

![](diagram_micro_vs_macro.png)

---

### Dielectrics and conductors

在深入BRDF的实现之前，我们还需要了解一下金属与非金属之间的区别。

我们已经知道，在BRDF中，入射光线与表面的交互会分为两部分，漫反射与镜面反射，如下图所示：

![](diagram_fr_fd.png)

但实际上，这是对二者交互作用的简化，部分入射光会穿透表面，然后在物体内部散射，部分散射的光线还会以漫反射的形式再次从表面散射出，如下图所示：

![](diagram_scattering.png)

这就是金属与非金属材质的区别所在，纯金属材质不会发生次表面反射，也就是说在BRDF模型中，没有漫反射的部分。而散射会发生在非金属材质上，也就是说，非金属材质同时有漫反射与镜面反射。二者之间的区别如下图所示：

![](diagram_brdf_dielectric_conductor.png)

---

### Energy conservation

在PBR渲染中，能量守恒是一个关键的概念。在能量守恒的BRDF模型中，镜面反射与漫反射的能量之和要小于入射能量的总和。

---

### Specular BRDF

对于镜面反射的部分，我们所使用基于Cook-Torrance的微表面模型，公式如下：


$$
f_r(v, l)=\frac{D(h,\alpha)G(v, l, \alpha)F(v, h, f0)}{4(n\cdot v)(n \cdot l)}
$$


> Cook-Torrance是一个基于微观几何的反射模型，它考虑了表面的粗糙度、遮挡、阴影以及 Fresnel 效应。

由于我们需要在实时渲染中实现这个模型，所以我们会使用$D$，$G$，$F$的近似公式进行计算

#### D: Normal distribution function 

