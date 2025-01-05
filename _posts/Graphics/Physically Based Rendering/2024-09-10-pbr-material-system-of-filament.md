---
title: Material System in Filament
date: 2024-09-10 14:57 +0800
categories: [Graphics, Physical Based Rendering]
media_subpath: /assets/img/Graphics/PhysicallyBasedRendering/
math: true
---

### 1 Standard model

我们所要使用的材质系统在数学上由BSDF双向散射分布函数描述，而BSDF本身又由另外两个函数组成：BRDF双向反射函数与BTDF双向透射函数。由于我们的目标是对常见的表面进行建模，所有我们的标准模型会专注于BRDF，而忽视BTDF，或者在某种程度上近似BTDF，因此，我们的标准模型只能正确地模拟短均自由程的反射性、各向同性的电介质或导电表面。

BRDF可以分为两个部分：

- 漫反射部分，记为$f_d$
- 镜面反射部分，记为$f_r$

如下图所示（暂时忽略次表面散射）：

![](diagram_fr_fd.png)

BRDF的数学表达式如下：


$$
\begin{equation}\label{brdf}
f(v,l)=f_d(v,l)+f_r(v,l)
\end{equation}
$$

需要注意的是，这个公式表示的是来自单一方向的入射光的表面交互，完整的渲染方程需要我们在整个半球方向上进行积分。

现实世界中的表面并不是平整的，我们需要一个能够描述光与不规则表面相互作用的模型。在BRDF中，我们引入微表面的概念，也就是说，**物体的表面在微观上由大量随机排列的微小面microfacet组成**。下图展示了微表面模型的概念：

![](diagram_microfacet.png)

我们从下图中可以看出，只有当微表面的法线方向指向入射方向与观察方向的半程向量时，才能被观察到：

![](diagram_macrosurface.png)

但是这并非是微表面可见的充分条件，在BRDF中，我们同样需要考虑到**遮蔽masking**与**阴影shadowing**，如下图所示：

![](diagram_shadowing_masking.png)



在微表面BRDF模型中，**粗糙度描述了在微观层面上的粗糙或光滑程度**，表面越光滑，则满足微表面可见条件的微表面就会越多，从而让表面更光滑，表面越粗糙，就会导致镜面反射的高亮模糊，这个过程如下图所示：

![](diagram_roughness.png)



下面是用于描述微表面模型的公式：


$$
f_x(v, l)=\frac{1}{|n\cdot v||n \cdot l|}\int_{\Omega}D(m, \alpha)G(v,l,m)f_m(v, l, m)(v\cdot m)(l\cdot m)dm
$$


其中：

- $x$代表镜面或漫反射部分
- $D$表示微表面的分布，又可以称为法线分布函数
- $G$模拟了微表面的可见性，即occlusion或shadow-masking
- $f_m$作为BRDF，对于漫反射部分和镜面反射有不同的实现

需要注意的是，**此方程用于在微观层面上对半球进行积分**，如下图所示：

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

对于镜面反射的部分，我们所使用基于Cook-Torrance的微表面模型，其数学表达式如下：


$$
f_r(v, l)=\frac{D(h,\alpha)G(v, l, \alpha)F(v, h, f0)}{4(n\cdot v)(n \cdot l)}
$$

**Cook-Torrance是一个基于微观几何的反射模型，它考虑了表面的粗糙度、遮挡、阴影以及 Fresnel 效应。**

#### 4.1 D: Normal distribution function

GGX模型使用了一种更接近现实的微表面法线分布函数，能够模拟具有粗糙表面的物体。其分布函数具有较长的尾部（"heavy tail"），这使得它能够更好地表现表面粗糙度较低但仍有高光区域的物体。公式如下：


$$
D_{GGX}(h,\alpha)=\frac{\alpha^2}{\pi((n\cdot h)^2(\alpha^2-1)+1)^2}
$$



其中，$h$表示入射方向与观察方向的半程向量，而$\alpha$则表示表面的粗糙度的平方。

#### 4.2 G: Geometric shadowing

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

#### 4.3 F: Fresnel

菲涅尔效应模拟了这样一个事实：**观察者看到的从表面反射的光量取决于观察角度**。我们以下图为例，当观察者直视水面时，我们可以看穿水面，而当从远处看向水面时，就会发现水面上的反射更为明显：

![](photo_fresnel_lake.jpg)

实际上，反射的光量不仅取决于观察角度，同样会收到材质IOR的影响。我们将垂直入射时反射的光量记为$f_{0}$，又叫做**菲涅尔反射率**，将掠射时反射的光量记为$f_{90}$。

我们可以规范一下对菲涅尔效应的描述：**菲涅尔项定义了在两个不同的介质的相接面上，光的反射与折射情况，或者说反射能量与透射能量之比。**

在Cook-Torrance BRDF模型中，我们所使用的菲涅尔公式如下：


$$
F_{Schlick}(v, h, f_0, f_{90})=f_0+(f_{90}-f_0)(1-v\cdot h)^5
$$

**常数$f_0$表示垂直入射时的镜面反射率，对于电介质是无色的，对于金属是有色的**。具体的值取决于材质的IOR系数。

实际上，我们可以讲这个菲涅尔函数看作在入射镜面反射率与掠射角处的反射率，即$f_{90}$，之间进行插值。观察现实世界，无论材质是否是金属还是非金属的，在掠射角均表现为无色的镜面反射，故我们可以将$f_{90}$设为1，从而得到简化的菲涅尔函数的实现：

```glsl
vec3 F_Schlick(float u, vec3 f0) {
    float f = pow(1.0 - u, 5.0);
    return f + f0 * (1.0 - f);
}
```

---

### 5 Diffuse BRDF

对于BRDF中的漫反射来说，我们会假设在整个微表面半球上，有均匀的漫反射，即：


$$
f_d(v, l)=\frac{\sigma}{\pi}
$$



然而，在理想情况下，漫反射部分应该与镜面反射项保持一致，并且考虑到表面的粗糙度。Disney与Oren-Nayar两个漫反射模型都将粗糙度考虑在内，并且能在掠射角产生一些逆向反射。

Disney漫反射模型的数学表达式如下：


$$
f_d(v, l)=\frac{\sigma}{\pi}F_{Schlick}(n, l, 1, f_{90})F_{Schlick}(n, v, 1, f_{90})
$$


其中：


$$
f_{90}=0.5 + 2\cdot \alpha cos^2(\theta_d)
$$


需要注意的是，我们在这里所介绍的迪士尼模型并不遵守能量守恒定律

---

### 6 Standard model summary

**镜面反射部分**：使用Cook-Torrance镜面微表面模型，包含基于GGX的法线分布函数，基于Smith-GGX的高度矫正的可见性函数，以及基于Schlick的菲涅尔函数

**漫反射部分**：可以使用兰伯特漫反射，也可以使用迪士尼漫反射

完整的代码实现如下：

```glsl
float D_GGX(float NoH, float a) {
    float a2 = a * a;
    float f = (NoH * a2 - NoH) * NoH + 1.0;
    return a2 / (PI * f * f);
}

vec3 F_Schlick(float u, vec3 f0) {
    return f0 + (vec3(1.0) - f0) * pow(1.0 - u, 5.0);
}

float V_SmithGGXCorrelated(float NoV, float NoL, float a) {
    float a2 = a * a;
    float GGXL = NoV * sqrt((-NoL * a2 + NoL) * NoL + a2);
    float GGXV = NoL * sqrt((-NoV * a2 + NoV) * NoV + a2);
    return 0.5 / (GGXV + GGXL);
}

float Fd_Lambert() {
    return 1.0 / PI;
}

void BRDF(...) {
    vec3 h = normalize(v + l);

    float NoV = abs(dot(n, v)) + 1e-5;
    float NoL = clamp(dot(n, l), 0.0, 1.0);
    float NoH = clamp(dot(n, h), 0.0, 1.0);
    float LoH = clamp(dot(l, h), 0.0, 1.0);

    // perceptually linear roughness to roughness (see parameterization)
    float roughness = perceptualRoughness * perceptualRoughness;

    float D = D_GGX(NoH, roughness);
    vec3  F = F_Schlick(LoH, f0);
    float V = V_SmithGGXCorrelated(NoV, NoL, roughness);

    // specular BRDF
    vec3 Fr = (D * V) * F;

    // diffuse BRDF
    vec3 Fd = diffuseColor * Fd_Lambert();

    // apply lighting...
}
```

---

### 7 Improving the BRDFs

正如我们前面所提到的，一个好的BRDF模型应该满足能量守恒定律。然而，我们目前所构建BRDF仍然存在两点问题：

#### 7.1 Energy Gain in Diffuse Reflectance

Lambert漫反射模型没有考虑到表面反射的光，换句话说，兰伯特模型假设光线在进入表面并且在表面内部反射散射后重新从表面反射出来，但是它忽略了表面上可能发生的反射。

实际的表面通常不会完全是漫反射的，很多材质在某些角度下会有明显的反射效果（比如玻璃或金属表面），这些反射的光并不会参与到漫反射事件中，而是直接被反射回去。所以说，Lambert模型并没有考虑这种反射现象，因此它的适用范围是非常简化的，通常用在模拟那些表现出理想漫反射性质的材质上。

#### 7.2 Energy Loss in Specular Reflectance

我们目前所展示的Cook-Torrance BRDF试图在微观层面上对多个事件进行建模，但它是通过考虑光线的单次反弹实现的。对于较高的粗糙度来说，Cook-Torrance BRDF会带来一些能量损失。如下图所示，如果只考虑光线的单次反射，那么图中的光线会由于shadowing与masking项而被丢弃，但如果考虑到光线的多次反射，也存在光线在多次反射后进入观察者视线中的可能：

![](diagram_single_vs_multi_scatter.png)

基于这个简单的解释，我们可以得到这样的结论：**表面越粗糙，则由于没考虑到多次散射而导致的能量损失的可能性就越大。**这种能量损失最终将导致材质变暗，对于金属材质来说，这种现象尤为明显，因为金属材质所有的反射都是高光反射。

Kulla and Conty提出了一种能量补偿方案，

> 这里待补充

---

### 8 Parameterization

标准材质模型使用到了如下的参数：

- **BaseColor**
  - diffuse albedo for non-metallic surfaces
  - specular color for metallic surfaces
- **Metallic**
- **Roughness**
- **Reflectance**
  - 非金属表面在垂直入射时的菲涅尔反射率
  - 这个参数取代了IOR
- **Emissive**
- **Ambient occlusion**

#### 8.1 Remapping

为了让我们的标准材质模型更易于使用，我们必须要对其中的三个参数进行重映射

##### 8.1.1 BaseColor

材质的基础色会收到材质金属度的影响。**非金属材质具有无色的镜面reflectance，但将其基础色保留为漫反射颜色。**另一方面，**金属材质将其基础色用作镜面颜色，并且没有漫反射分量。**

所以对于基础色，我们进行这样的重映射：

```glsl
vec3 diffuseColor = (1.0 - metallic) * baseColor.rgb;
```

##### 8.1.2 Reflectance

在我们的BRDF模型中，菲涅尔项取决于$f_0$，也就是垂直入射时的镜面反射率，并且我们知道，对于非金属材质来说，$f_0$是无色的。对于非金属表面，我们使用下面这个映射函数：


$$
f_0=0.16 \cdot reflectance^2
$$


我们的目标是将$f_0$映射到一个特定的范围，该范围可以表示常见非金属材质（reflectance = 4%）与宝石（reflectance = 8%-16%）的菲涅尔值。比方说，reflectance为0.5时，所对应的菲涅尔反射率为4%。如下图所示：
![](diagram_reflectance.png)

如果材质的IOR已知（例如空气-水的IOR为1.33），那么我们可以利用如下公式计算出菲涅尔反射率：


$$
f_0(n_{ior})=\frac{(n_{ior}-1)^2}{(n_{ior}+1)^2}
$$
金属材质的$f_0$是有色的，即：


$$
f_0=baseColor \cdot metallic
$$


在我们的标准模型中，我们使用以下方式来计算来计算$f_0$

```glsl
vec3 f0 = 0.16 * reflectance * reflectance * (1.0 - metallic) + baseColor * metallic;
```

##### 8.1.3 Roughness

开发者所设置的粗糙度，被称为感知粗糙度，我们使用以下公式重新映射到感知线性范围：


$$
\alpha = perceptualRoughness^2
$$


如下图展示了一个银色的金属材质随着粗糙度提高的外观变化，分别使用了映射值（上面）与非映射值（下面）：

![](material_roughness_remap.png)

很显然，重映射后的粗糙度在美术上是更容易被接受的，如果没有重映射，有光泽的金属表面将不得不被限制在0.0 到 0.05 之间的非常小的范围内。

---

### 9 Clear Coat Model

目前我们所构建的标准模型非常适合于**单层**的非各向异性表面。然而在现实世界中，多层材质是非常常见的，特别是在标准层之上有一层薄的半透明层的材质，例如车漆、上漆的木材、亚克力等。

![](material_clear_coat.png)

通过添加第二个镜面反射lobe的扩展标准材质模型，我们可以模拟clear coat的材质效果。简单起见，**我们将clear coat层定义为非各向异性且非金属的。**

由于入射光会穿过clear coat层，我们还需要考虑到能量损失。此外，我们的模型不会考虑光线在层之间的相互反射与折射行为。

![](diagram_clear_coat.png)

#### 9.1 Clear Coat Specular BRDF

清漆层将使用标准模型中使用的相同的 Cook-Torrance 微面 BRDF 进行建模。由于清漆层始终是各向同性且绝缘的，粗糙度值较低，因此我们可以选择更便宜的 DFG 项而不会明显牺牲视觉质量。

对于D与F，我们仍然适用标准模型中的方案，而对于可见性G，我们使用Kelemen模型：


$$
V(l, h)=\frac{1}{4(l\cdot h)^2}
$$


这个模型并非物理正确，但是在实时渲染中非常合适。

需要注意的是，BRDF中的菲涅尔项需要我们提供$f_0$这个参数，为此，我们假设clear coat层是由聚氨酯这种材料构成的，它与空气的IOR值为1.5，从而我们可以计算出$f_0$为0.04，这也是常见电介质材质的菲涅尔反射率。

#### 9.2 Integration in the Surface Response

我们需要将因clear coat层而导致的能量损失考虑在内，新的BRDF表达式为：


$$
f(v, l)=f_d(v, l)(1-F_c)+f_r(v, l)(1-F_c)+fc(v, l)
$$


其中，$f_c$表示clear coat层的BRDF，$F_c$表示$f_c$的菲涅尔项

#### 9.3 Clear coat Parameterization

清漆材质在标准材质的基础上，多了两个额外的参数：

- **ClearCoat**：清漆层的强弱
- **ClearCoatRoughness**：感知粗糙度

最终，加入清漆层的BRDF实现代码为：

```glsl
void BRDF(...) {
    // compute Fd and Fr from standard model

    // remapping and linearization of clear coat roughness
    clearCoatPerceptualRoughness = clamp(clearCoatPerceptualRoughness, 0.089, 1.0);
    clearCoatRoughness = clearCoatPerceptualRoughness * clearCoatPerceptualRoughness;

    // clear coat BRDF
    float  Dc = D_GGX(clearCoatRoughness, NoH);
    float  Vc = V_Kelemen(clearCoatRoughness, LoH);
    float  Fc = F_Schlick(0.04, LoH) * clearCoat; // clear coat strength
    float Frc = (Dc * Vc) * Fc;

    // account for energy loss in the base layer
    return color * ((Fd + Fr * (1.0 - Fc)) * (1.0 - Fc) + Frc);
}
```

#### 9.4 Base Layer Modification

由于清漆层的存在，标准材质不再与空气相接触，而是与清漆材质相接触，所以我们需要重新计算标准材质的$f_0$。由于清漆材质的$f_0$是已知的，所以这一步不难实现。


$$
f_{0_{base}} = \frac{\left( 1 - 5 \sqrt{f_0} \right) ^2}{\left( 5 - \sqrt{f_0} \right) ^2}
$$

---

### 10 Anisotropic Model

前面描述的标准材质模型只能描述各向同性的表面，即各个方向上的属性都相同的表面。然而，许多现实世界中的材料，如拉丝金属，只能使用各向异性模型来复现。

![](material_anisotropic.png)

#### 10.1 Anisotropic Specular BRDF

我们可以修改此前的各项同性的镜面反射BRDF来匹配各向异性材质，Burley使用了一个各向异性的GGX法线分布函数：


$$
D_{aniso}(h, \alpha)=\frac{1}{\pi\alpha_t \alpha_b}\cdot\frac{1}{((\frac{t\cdot h}{\alpha_t})^2+(\frac{b\cdot h}{\alpha_b})^2+(n\cdot h)^2)}
$$


其中:


$$
\begin{align*}
  \alpha_t &= \alpha \times (1 + anisotropy) \\
  \alpha_b &= \alpha \times (1 - anisotropy)
\end{align*}
$$


对应的代码实现为：

```glsl
float at = max(roughness * (1.0 + anisotropy), 0.001);
float ab = max(roughness * (1.0 - anisotropy), 0.001);

float D_GGX_Anisotropic(float NoH, const vec3 h, const vec3 t, const vec3 b, float at, float ab) {
    float ToH = dot(t, h);
    float BoH = dot(b, h);
    float a2 = at * ab;
    highp vec3 v = vec3(ab * ToH, at * BoH, a2 * NoH);
    highp float v2 = dot(v, v);
    float w2 = a2 / v2;
    return a2 * w2 * w2 * (1.0 / PI);
}
```

此外，Heitz也提出了各向异性的masking-shadowing函数，且能够匹配高度矫正的GGX分布：

![](微信截图_20250105132332.png)

对应的实现为：

```glsl
float at = max(roughness * (1.0 + anisotropy), 0.001);
float ab = max(roughness * (1.0 - anisotropy), 0.001);

float V_SmithGGXCorrelated_Anisotropic(float at, float ab, float ToV, float BoV,
        float ToL, float BoL, float NoV, float NoL) {
    float lambdaV = NoL * length(vec3(at * ToV, ab * BoV, NoV));
    float lambdaL = NoV * length(vec3(at * ToL, ab * BoL, NoL));
    float v = 0.5 / (lambdaV + lambdaL);
    return saturateMediump(v);
}
```

#### 10.2 Anisotropic Parameterization

**Anisotropy**参数的范围在$[-1, 1]$之间，表示材质各向异性的量

---

### 11 Subsurface Model

[TODO]

---

### 12 Cloth Model

前面所描述的所有材质模型都是为了模拟**致密的表面**而设计的，无论是在宏观层面还是微观层面。然而，衣服和织物通常是由松散连接的**threads线**组成的，这些线会吸收和散射入射光。

由于早期提出的微表面双向反射分布函数（BRDF）基于表面由随机凹槽组成且表现为完美镜子的假设，所以在重现布料的性质方面表现不佳。与硬表面相比，布料的特点是具有更柔和的镜面高光区域和较大的衰减，以及由正向 / 反向散射引起的模糊光照。一些织物还呈现出双色镜面颜色（例如天鹅绒）。

天鹅绒是布料材质模型的一个有趣用例。如下图所示，这种类型的织物由于正向和反向散射而呈现出强烈的边缘光。这些散射现象是由垂直于织物表面的纤维引起的。当入射光来自与观察方向相反的方向时，纤维会向前散射光线。类似地，当入射光来自与观察方向相同的方向时，纤维会向后散射光线。

![](screenshot_cloth_velvet.png)

#### 12.1 Cloth Specualr BRDF

