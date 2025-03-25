---
title: PBR Chapter in LearnOpenGL
date: 2020-05-13 14:57 +0800
categories: [Graphics, Physical Based Rendering]
media_subpath: /assets/img/Graphics/pbr/
math: true
---

### 1 Theory

一个PBR光照模型需要满足下面三个条件才能被认为是“基于物理”的：

- 基于微表面模型
- 满足能量守恒
- 使用基于物理的BRDF

#### 1.1 Microfacet Model

在微表面理论中，所有的表面在微观层面上都可以通过一些“微小”、“完美镜面反射”的微表面进行描述。根据表面的粗糙度不同，这些微表面的朝向也会有所区别：

![](microfacets.png)

如上图所示，表面越粗糙，那么微表面在排列方向上就越“嘈杂”，进而导致入射光线更倾向于被散射到完全不同的方向上，最终让表面呈现出模糊的镜面反射效果。而光滑表面与之相反，微表面排列较为整齐，能够将入射光线大致反射到一个相同的方向上，从而呈现出清晰、尖锐的反射效果。

所以，在微表面理论中，我们可以通过**粗糙度这个参数来衡量微表面的整体排列朝向**。更严谨地来说，是通过粗糙度参数，**来衡量所有微表面中与半程向量$H$对其的微表面的比例**。如下图所示：

![](ndf.png)

#### 1.2 Energy Conservation

我们将能量守恒理论表述为：对于非自发光表面，反射能量不能大于入射能量。

为了构建一个满足能量守恒的PBR模型，我们需要了解漫反射与镜面反射之间的区别。当光线击中物体表面时，会产生两种交互行为：反射与折射。其中，反射光线不会进入物体表面，而是根据反射定律，直接以特定的角度离开表面，构成我们所谓的“镜面光照”。而折射则发生于进入表面并被吸收的光线，这构成了我们所谓的“漫反射光照”。

需要注意的是，折射的光线并不是在接触表面的瞬间就直接被吸收，而是会光线在材质内部行进，在与构成材质的粒子碰撞过程中损失能量，如下图所示：

![](surface_reaction.png)

从图中我们也可以看出，并非所有的能量都会被吸收：光线在与粒子发生碰撞后，依然会被散射到任意方向，而其中就有部分光线会再次离开表面。这部分离开表面的光线，会继续对材质外观做出贡献。然而，在PBR中，我们需要对整个折射的过程进行一定程度的简化：**假设折射光线的吸收与散射都发生在入射点附近很小的范围之内，不考虑光线在材质内部的行进距离**。

现在我们可以引入**金属**与**非金属**的概念了。二者之间的区别在于，金属的折射光线会被直接吸收，不会有任何反射。这意味着金属表面只存在镜面光照，而没有漫反射颜色。

此外，在能量守恒的前提下，我们可以得到这样一个结论：被反射的光线就不能再被材质吸收。为此，我们给出这样的代码：

```glsl
float kS = calculateSpecularComponent(...); // reflection/specular fraction
float kD = 1.0 - kS;                        // refraction/diffuse  fraction
```

#### 1.3 Reflectance Equation

想要正确地理解PBR，我们需要对反射方程建立坚实的认知。方程的数学表达式如下：


$$
L_o(p,\omega_o)=\int_{\Omega}f_r(p,\omega_i, \omega_o)L_i(p, \omega_i)n\cdot \omega_id\omega_i
$$


我们在这里有必要学习一点辐射度量学相关的知识，这是一个有关于测量包含可见光在内的电磁辐射的学科。与渲染方程相关的物理量为radiance，记为$L$，它表示来自单一方向上的光线强度。我们可以通过一些其他物理量来更深入的理解radiance。

**Radiant flux**：记作$\Phi$，单位为*Watts*，表示光源所传播的能量

**Solid Angle**：记作$\omega$，表示单个方向上单位球体上的投影面积

**Radiant Intensity**：记为$I$，表示单位立体角上的光线的radiant flux总量，即$I=\frac{d\Phi}{d\omega}$

有了这些物理量作为铺垫，我们可以终于可以引入radiance的概念了：**radiance**表示从单位立体角$\omega$所观察到的单位面积$A$上的radiant intensity：


$$
L=\frac{d^2\Phi}{dAd\omega cos\theta}
$$


![](radiance.png)

在radiance的数学表达式中，我们引入了余弦定理：表面接受的光量与入射角度和表面法线之间的夹角的余弦值成正比。

当radiance定义中的“单位立体角”与“单位面积”无限趋近于$0$时，那么**radiance所测量的就是单一方向与单一着色点上的flux**。这符合我们在计算机图形学中的着色计算要求。

实际上，当计算radiance时，我们需要考虑的是着色点$p$所接受的全部入射光线，即来自于所有方向的radiance之和，我么可以将其称为irradiance。现在我们回到反射方程中：


$$
L_o(p,\omega_o)=\int_{\Omega}f_r(p,\omega_i, \omega_o)L_i(p, \omega_i)n\cdot \omega_id\omega_i
$$


在上述表达式中，我们已经知道$L$表示表示某个着色点$p$与表示入射方向的某个立体角$\omega_i$上的radiance。$n\cdot \omega_i$表示余弦定律。反射方程所计算的**$L_o$则表示从$\omega_o$方向上所观察到的$p$所对应的irradiance**。

此外，反射方程中的$\int$表示我们需要在半球上进行积分，实际上，我们只能通过离散近似的方式来计算积分。

反射方程中的入射radiance可以来自于场景中的光源，也可以来自于存储所有入射方向radiance的环境贴图，我们将会在后续中章节中深入讨论。

现在，反射方程中唯一的未知项就是$f_r$了。这将是我们接下来讨论的重点，**BRDF，它会根据材质属性来入射radiance进行权重衡量**。

#### 1.4 BRDF

当给定入射方向$\omega_i$时，BRDF能够计算处反射的光量。

BRDF建立在微表面理论上，衡量了材质的反射与折射属性。

在实时渲染中，最常见的BRDF是Cook-Torrance BRDF，它包含了漫反射与镜面反射两个部分：


$$
f_r=k_df_{lambert}+k_sf_{cook-torrance}
$$


其中$k_d$与$k_s$是我们之前所讨论的折射与反射各自的比例，而$f_{lambert}$表示用于漫反射着色的Lambertian Diffuse，其数学表达式为：


$$
f_{lambert}=\frac{albedo}{\pi}
$$


分母上的$\pi$用于归一化漫反射光照。

Cook-Torrance模型的镜面反射部分是我们讨论的重点，其数学表达式为：


$$
f_{cook-torrance}=\frac{DFG}{4(\omega_o\cdot n)(\omega_i\cdot n)}
$$


其中，分子上的三个项分别用于近似材质反射属性的某个特定方向：

- D：根据表面粗糙度，计算朝向半程向量的微表面的比例
- F：描述表面在不同角度下的反射比例
- G：描述微表面的self-shadowing属性

**Normal Distribution Function**

我们使用Trowbridge-Reitz GGX模型：


$$
NDF_{GGXTR}(h, h, \alpha)=\frac{\alpha^2}{\pi((n\cdot h)^2(\alpha^2-1)+1)^2}
$$


在GLSL对应的实现为：

```glsl
float DistributionGGX(vec3 N, vec3 H, float a)
{
    float a2     = a*a;
    float NdotH  = max(dot(N, H), 0.0);
    float NdotH2 = NdotH*NdotH;
	
    float nom    = a2;
    float denom  = (NdotH2 * (a2 - 1.0) + 1.0);
    denom        = PI * denom * denom;
	
    return nom / denom;
}
```

**Geometry Function**

微表面之间存在相互遮蔽的情况，进而导致光线被遮蔽，如下图所示：

![](geometry_shadowing.png)

我们使用Schlick-GGX模型：


$$
G_{SchlickGGX}(n, v, k)=\frac{n\cdot v}{(n\cdot v)(1-k)+k}
$$


其中，$k$是关于$\alpha$的重映射，而映射关系依据直接光照与IBL有所区别：


$$
\begin{aligned}
k_{direct}=\frac{(\alpha+1)^2}{8}\\
k_{IBL}=\frac{\alpha^2}{2}
\end{aligned}
$$


由于微表面之间的几何结构，入射光线与反射光线都有被遮蔽的可能，所以我们需要分别衡量这两方面的因素：


$$
G(n,v,l,k)=G_{sub}(n, v,k)G_{sub}(n,l, k)
$$


在GLSL中对应的代码实现为：

```glsl
float GeometrySchlickGGX(float NdotV, float k)
{
    float nom   = NdotV;
    float denom = NdotV * (1.0 - k) + k;
	
    return nom / denom;
}
  
float GeometrySmith(vec3 N, vec3 V, vec3 L, float k)
{
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float ggx1 = GeometrySchlickGGX(NdotV, k);
    float ggx2 = GeometrySchlickGGX(NdotL, k);
	
    return ggx1 * ggx2;
}
```

**Fresnel Equation**

菲涅尔方程用于从给定观察方向上计算反射光线比例，并且在能量守恒的基础上，我们能够进一步得到折射光线的比例。

在实时渲染中，我们使用基于Fresnel-Schlick近似的菲涅尔方程：


$$
F_{Schlick}(h,v,F_0)= F_0+(1-F_0)(1-(h\cdot v))^5
$$


其中，$F_0$表示表面的基础反射率，我们可以通过IOR进行换算。

需要注意的是，**菲涅尔近似是用于衡量非金属材质的**。对于金属材质，我们不能简单地通过IOR来获取对应的$F_0$。

```glsl
vec3 F0 = vec3(0.04);
F0      = mix(F0, surfaceColor.rgb, metalness);
```

**Cook-Torrance Reflection Equation**

现在，我们对BRDF已经有了一定的了解，我们可以给出完整的反射方程表达式了：


$$
L_o(p,\omega_o)=\int_{\Omega}(k_d\frac{albedo}{\pi}+k_s\frac{DFG}{4(\omega_o\cdot n)(\omega_i\cdot n)})L_i(p, \omega_i)n\cdot \omega_id\omega_i
$$


但实际上，这个表达式在数学上并不完全正确，菲涅尔项$F$表示表面反射光的比例，实质上等于上述表达式中的$k_s$，也就是说，**反射方程中BRDF镜面反射的部分已经隐式地包含了$k_s$**，所以，最终的反射方程表达式为：


$$
L_o(p,\omega_o)=\int_{\Omega}(k_d\frac{albedo}{\pi}+\frac{DFG}{4(\omega_o\cdot n)(\omega_i\cdot n)})L_i(p, \omega_i)n\cdot \omega_id\omega_i
$$

#### 1.5 Authoring PBR Materials

在PBR-Metallic工作流中，美术开发者可以控制的材质属性为：

- Albedo：不包含任何光照信息的漫反射贴图，反应了表面的折射吸收率。对于金属材质来说，表示基础反射率。
- Normal
- Metallic：指定texel的金属度
- Roughness：指定texel的粗糙度
- AO：指定额外的遮蔽信息，作为对于Albedo贴图关于光照信息的补充

---

### 2 Direct Lighting

在前一个章节中，我们了解了PBR的理论基础，在本章节中，我们将专注于将理论落地到代码实现中。

首先，我们来回顾一下完整的反射方程：


$$
L_o(p,\omega_o)=\int_{\Omega}(k_d\frac{albedo}{\pi}+\frac{DFG}{4(\omega_o\cdot n)(\omega_i\cdot n)})L_i(p, \omega_i)n\cdot \omega_id\omega_i
$$


我们现在需要解决的问题是：如何描述场景的irradiance，也就是所有radiance之和。我们现在已知$L$表示给定立体角$\omega$下的光源的radiant flux。同时，我们假设立体角无限趋近于0，那我们所测定的就是光源在单一方向上的radiance。

假设场景中存在一个点光源，其radiant flux为$[23.47, 21.31, 20.79]$，那么该光源的radiant intensity就等于所有出射方向的radiant flux之和。然而，对于某个特定的着色点$p$，只有一个单一方向$\omega_i$能够接受到来自于该光源的光线。如果场景中只存在着一个光源，那么所有来自于其他方向的radiance均为0。

那么我们要如何理解反射方程中关于表面半球的积分呢？对于已知的光源，我们实际上没有必要求积分，而是可以分别求出每个光源对于当前着色点的radiance，最后求和即可。

---

### 3 IBL

在IBL中，我们**不再有一系列可解析的直接光源，还是会将环绕场景的环境作为一个整体的大型光源**。

与直接光照不同，IBL需要我们通过某种手段来计算积分。而计算该积分需要满足两点要求：

- 我们需要能够获取任意方向$\omega_i$所对应的场景radiance。
- 计算需要快速，能够满足实时渲染的要求

第一个要求相对简单，通过采样cubemap，我们可以获取特定方向的radiance：

```glsl
vec3 radiance = texture(_cubemapEnvironment, w_i).rgb; 
```

但是，计算积分就意味着：我们需要对每个片段都采样在整个半球所有可能的方向上采样环境贴图，而非单一方向。这种计算量在实时渲染中是无法接受的。所以，我们需要引入预计算技巧。想要理解这一点，我们需要深入拆解一下反射方程：
$$
L_o(p,\omega_o)=\int_{\Omega}(k_d\frac{albedo}{\pi}+\frac{DFG}{4(\omega_o\cdot n)(\omega_i\cdot n)})L_i(p, \omega_i)n\cdot \omega_id\omega_i
$$


事实上，我们可以将积分拆分为两个部分，分别是漫反射与镜面反射：


$$
L_o(p,\omega_o)=\int_{\Omega}(k_d\frac{albedo}{\pi})L_i(p, \omega_i)n\cdot \omega_id\omega_i+\int_{\Omega}(\frac{DFG}{4(\omega_o\cdot n)(\omega_i\cdot n)})L_i(p, \omega_i)n\cdot \omega_id\omega_i
$$


#### 3.1 Diffuse Irradiance

我们先来看漫反射积分。首先，我们可以将积分中的常数提取到积分以外：


$$
L_o(p,\omega_o)=k_d\frac{albedo}{\pi}\int_{\Omega}L_i(p, \omega_i)n\cdot \omega_id\omega_i
$$


也就是说，积分只取决于$\omega_i$，基于此，我们可以通过卷积计算或预计算一个新的立方体贴图，该贴图在每个采样方向$\omega_o$中存储漫反射积分的结果。

**卷积是指对数据集中的每个元素施加某种计算时需考虑数据集内的所有其他元素**；该数据集即场景的辐射度或环境贴图。因此，对于立方体贴图中的每个采样方向，我们需要综合考虑半球Ω内的所有其他采样方向。

要对环境贴图进行卷积处理，我们需要针对每个输出$\omega_o$采样方向求解积分。具体做法是：在半球Ω上对大量方向$\omega_i$进行离散采样，并对它们的辐射度取加权平均。我们构建采样方向$\omega_i$所用的半球会朝向当前正在卷积处理的输出$\omega_o$采样方向。

这个预计算的立方体贴图（每个采样方向$\omega_o$存储着积分结果），可视为场景中所有沿$\omega_o$方向对齐的表面所接收的间接漫反射光的总和预计算结果。这样的立方体贴图被称为irradiance map，因为经过卷积处理的立方体贴图实际上允许我们从任意方向$\omega_o$直接采样场景的（预计算）辐照度。

下图展示了一个环境贴图所计算得到的irradiance map：

![](ibl_irradiance.png)

通过将卷积结果存储在每个立方体贴图像素中（沿$\omega_o$方向），irradiance map呈现出类似环境平均颜色或光照分布的效果。**从该环境贴图中采样任意方向，都能获取该特定方向的场景辐照度数据**。

**Cubemap Convolution**



