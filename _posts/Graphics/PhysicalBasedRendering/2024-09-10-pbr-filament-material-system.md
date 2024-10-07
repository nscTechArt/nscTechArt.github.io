---
title: Filament -- Material System
date: 2024-09-10 14:57 +0800
categories: [Graphics, Filament]
media_subpath: /assets/img/Graphics/filament/
math: true
---

### 1 Standard model

我们所要使用的材质系统在数学上由BSDF双向散射分布函数描述，而BSDF本身又由另外两个函数组成：BRDF双向反射函数与BTDF双向透射函数。由于我们的目标是对常见的表面进行建模，所有我们的标准模型会专注于BRDF，而忽视BTDF，或者在某种程度上近似BTDF，因此，我们的标准模型只能正确地模拟短均自由程的反射性、各向同性的电介质或导电表面。

BRDF可以分为两个部分：

- 漫反射部分，记为$f_d$
- 镜面反射部分，记为$f_r$

如下图所示（暂时忽略次表面散射）：

![](diagram_fr_fd.png)

BRDF模型通过公式表示为：


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

从图中我们可以看出，在宏观层面上，我们可以认为表面是平坦的，我们可以假设光照计算发生在单一方向的光源照射的表面上一点，这样能够有助于简化渲染方程。

而在微观层面上，表面是不平坦的，我们也不能再认为只有一条单一的光线，而是应该假设存在一束方向平行的光线。在微表面理论中，这束光线会被散射到各个方向上，由此我们必须在半球上对表面的交互进行积分，也就是图中所标注的$\Omega_m$。

但是为每个片段都进行半球上的积分显然是不可行的，所以不管是漫反射还是镜面反射，我们都需要使用积分的近似。

---

### 2 Dielectrics and conductors

在深入BRDF的实现之前，我们还需要了解一下金属与非金属之间的区别。

我们已经知道，在BRDF中，入射光线与表面的交互会分为两部分，漫反射与镜面反射，如下图所示：

![](diagram_fr_fd.png)

但实际上，这是对二者交互作用的简化。在真实的物理世界中，部分入射光会穿透表面，然后在物体内部散射，而其中部分散射的光线还会以漫反射的形式再次从表面散射出，如下图所示：

![](diagram_scattering.png)

这就是金属与非金属材质的区别所在，纯金属材质不会发生次表面反射，也就是说在BRDF模型中，没有漫反射的部分。而散射会发生在非金属材质上，也就是说，非金属材质同时有漫反射与镜面反射。二者之间的区别如下图所示：

![](diagram_brdf_dielectric_conductor.png)

---

### 3 Energy conservation

在PBR渲染中，能量守恒是一个关键的概念。在能量守恒的BRDF模型中，镜面反射与漫反射的能量之和要小于入射能量的总和。

---

### 4 Specular BRDF

对于镜面反射的部分，我们所使用基于Cook-Torrance的微表面模型，公式如下：


$$
f_r(v, l)=\frac{D(h,\alpha)G(v, l, \alpha)F(v, h, f0)}{4(n\cdot v)(n \cdot l)}
$$


> Cook-Torrance是一个基于微观几何的反射模型，它考虑了表面的粗糙度、遮挡、阴影以及 Fresnel 效应。

由于我们需要在实时渲染中实现这个模型，所以我们会使用$D$，$G$，$F$的近似公式进行计算

#### 4.1 D: Normal distribution function

GGX/Trowbridge-Reitz模型使用了一种更接近现实的微表面法线分布函数，能够模拟具有粗糙表面的物体。其分布函数具有较长的尾部（"heavy tail"），这使得它能够更好地表现表面粗糙度较低但仍有高光区域的物体。公式如下：


$$
D_{GGX}(h,\alpha)=\frac{\alpha^2}{\pi((n\cdot h)^2(\alpha^2-1)+1)^2}
$$



其中，$h$表示入射方向与观察方向的半程向量，而$\alpha$则表示表面的粗糙度的平方。

#### G: Geometric shadowing

首先，我们给出模拟几何阴影的Smith公式：


$$
G(v,l,\alpha)=G_1(l,\alpha)G_1(v,\alpha)
$$


其中，$G_1$由多个可选的模型，我们通常会使用GGX公式（以$v$为例）：


$$
G_1(v,\alpha)=G_{GGX}(v,\alpha)=\frac{2(n\cdot v)}{n\cdot v + \sqrt{\alpha^2+(1-\alpha^2)(n\cdot v)^2}}
$$


这样的话，我们就可以给出完整的Smith公式：


$$
G(v,l,\alpha)=\frac{2(n\cdot l)}{n\cdot l + \sqrt{\alpha^2+(1-\alpha^2)(n\cdot l)^2}} \frac{2(n\cdot v)}{n\cdot v + \sqrt{\alpha^2+(1-\alpha^2)(n\cdot v)^2}}
$$


我们可以注意到，此公式的分子刚好可以与BRDF公式中的分母约去，即我们定义一个新的公式取代$G$：


$$
V(v, l, \alpha)=\frac{G(v,l,\alpha)}{4(n\cdot v)(n \cdot l)}
$$


此外，Heitz提出，将微表面的高度纳入到计算中，以关联masking和shadowing能够带来更精准的结果，公式如下：


$$
G(v,l,h,\alpha)=\frac{\chi^+(v \cdot h)\chi^+(l \cdot h)}{1+\Lambda(v)+\Lambda(l)}
$$


其中，$\Lambda$为：


$$
\Lambda(v)=\frac{1}{2}\Big( \frac{\sqrt{\alpha^2+(1-\alpha^2)(n\cdot v)^2}}{n\cdot v} -1 \Big)
$$


整理，可得：


$$
G(l, v, h, a)= \frac{2\cdot(n\cdot v)(n\cdot l)}{(n\cdot v)\sqrt{a^2+(1-a^2)(n\cdot l)^2}+(n\cdot l)\sqrt{a^2+(1-a^2)(n\cdot v)^2}}
$$


可得：


$$
V(l, v, a)= \frac{0.5}{(n\cdot v)\sqrt{a^2+(1-a^2)(n\cdot l)^2}+(n\cdot l)\sqrt{a^2+(1-a^2)(n\cdot v)^2}}
$$


需要注意的是，虽然我们使用了高度相关的几何遮蔽函数，但是公式中并没有显式地使用变量$h$，这是因为在计算中已经通过两个方面反映了高度分布的影响：

- **粗糙度 $\alpha$**：粗糙度代表了微表面倾斜的程度，也可以视为表面高度变化的一个统计表达。粗糙度越大，意味着微表面的高度差异越大，这会影响光线和视线方向的遮挡和阴影效果
- **视线与法线、光线与法线的点积值**：这些点积值实际上是在反映微表面倾斜角度与光线或视线的关系。不同的角度意味着微表面与光线或视线方向的高度差异，也就影响了几何遮蔽。

#### F: Fresnel

菲涅尔效应模拟这样一个事实：观察者看到的从表面反射的光量取决于观察角度。我们以下图为例，当观察者直视水面时，我们可以看穿水面，而当从远处看向水面时，就会发现水面上的反射更为明显：

![](photo_fresnel_lake.jpg)

我们可以规范一下对菲涅尔效应的描述：菲涅尔项定义了在两个不同的介质的相接面上，光的反射与折射情况，或者说反射能量与透射能量之比。

在Cook-Torrance BRDF模型中，我们所使用的菲涅尔公式如下：


$$
F_{Schlick}(v, h, f_0, f_{90})=f_0+(f_{90}-f_0)(1-v\cdot h)^5
$$


其中，$f_0$表示光线垂直入射时的反射率，同时，反射率对于金属和非金属有不同的解释：

- 对于金属，反射率是物体本身固有的反射率
- 对于非金属，反射率通常较小

通常来说，我们会取$f_90$为$1$

---

### Diffuse BRDF

对于BRDF中的漫反射来说，我们会假设在整个微表面半球上，有均匀的漫反射，即：


$$
f_d(v, l)=\frac{\sigma}{\pi}
$$


而在实践中，我们通常会将漫反射率$\sigma$的计算延后。

但是，漫反射在理想上来说，应该与镜面反射部分匹配，也就是将表面的粗糙度考虑在内，迪士尼漫反射模型的公式如下：


$$
f_d(v,l)=\frac{\sigma}{\pi}F_{Schlick}(n, l, 1, f_{90})F_{Schlick}(n, v, 1, f_{90})
$$


其中：


$$
f_{90}=0.5+2*acos^2(\theta_d)
$$


下图演示了在完全粗糙的非金属材质下，分别使用兰伯特漫反射BRDF与迪士尼漫反射BRDF的区别，可以看出，后者在掠过角处的表现要更好一些。

---

### Standard model summary

**镜面反射部分**：使用Cook-Torrance镜面微表面模型，包含基于GGX的法线分布函数，基于Smith-GGX的高度相关可视函数，以及基于Schlick的菲涅尔函数

**漫反射部分**：可以使用兰伯特漫反射，也可以使用迪士尼漫反射额

---

