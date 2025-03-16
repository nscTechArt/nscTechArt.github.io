---
title: Introduction to BRDFs
date: 2022-12-30 23:38 +0800
categories: [Graphics, Scratchpixel]
media_subpath: /assets/img/Graphics/Scratchapixel/
math: true
---

### 1 Phong Mode and Concepts of Illumination Models and BRDF

#### 1.1 The Phong Model

在之前的博客中，我们了解了如何模拟镜面/漫反射材质，那光滑表面的着色要如何实现呢？如下图所示，现实中的绝大多数物体同时具备漫反射与镜面反射：

![](shad2-plasticball.png)

材质具有这种双重性质的原因比较复杂。某些材质本身就是多种材质的复合构成物，而有些物质则具有层级结构。但总而言之，对于这种同时具有漫反射部分与镜面反射部分的材质，我们可以用下面这个数学表达式进行说明：


$$
S_P=\text{diffuse()}*K_d+\text{specular()}*K_s
$$


其中$S_P$表示$P$的着色，$\text{diffuse()}$项就是我们在[上一篇博客](https://loveforyou.tech/posts/intro-shading/)中所讨论了漫反射着色，$\text{specular()}$项则是用于模拟物体光滑外观的项。我们通过两个参数$K_d$与$K_s$来分别控制两个项的强弱。我们将在后面深入讨论如何确定这两个参数的值，不过在那之前，我们需要先对$\text{specular()}$项有一个较为清楚的认识。

首先我们可以得出下一两点观察结果：

- 在相同的光源条件下，光滑材质的所观察到的反射相较于镜面材质的反射会弱一些。这是因为，光滑材质的表面只有一部分微表面能将光线反射到观察方向，而镜面材质表面的所有微表面的朝向是一致的，所有反射光线都会到达人眼。

  ![](shad2-roughsurface.png)

- 当观察方向与理想的反射方向之间的夹角变大时，光滑材质的反射亮度会进一步减弱。这是因为能够将光线反射到观察方向的微表面数量进一步减少。

Phong指出，**通过计算理想反射方向与实际观察方向之间的夹角**，能够在某种程度上模拟出这种镜面反射效果。但**通过简单的点积运算，还是会得到一个较大的镜面反射面积**，为了解决这个问题，Phong在点积运算的结果上执行幂运算，从而能够有效地控制镜面反射的面积，即：


$$
\text{Specular} \approx (V \cdot R)^n.
$$


虽然Phong模型可以在一定程度上模拟出漫反射与镜面反射的材质效果，但它仍然是一个经验模型，$n$与$K_s$并没有实际的物理意义。

#### 1.2 Shading/Reflection Models

材质的外观是光线与构成材质的微观结构之间复杂的相互作用的结果。我们只能通过数学模型来模拟这些复杂的相互作用，这些模型在计算机图形学被称为**Shading Model**或**Reflection Model，**我们在上一章节所讨论的Phong模型就是其中一个经典模型。常见的还有**Lafortune**, the **Torrance-Sparrow**, the **Cook-Torrance**, the **Ward anisotropy**, the **Oren-Nayar** model

#### 1.3 Concept of BRDF

正如我们前面所提到的，Phong模型在本质上用于模拟光滑材质外观的是一个函数，该函数包含了一系列参数，通过修改参数，就能够影响最终的着色效果。但最重要的是，函数结果取决于这两个变量：**入射光线的方向**与**观察方向**。

由此，该函数本质上可以用如下数学表达式描述：

$$
f_R(\omega_o, \omega_i)
$$

其中，$\omega_o$与$\omega_i$分别表示观**察方向**与**入射方向**和shading point处**法线向量**的夹角。

在计算机图形学中，我们将这个函数称为**双向反射分布函数**，简称为**BRDF**。BRDF的意义在于，**对于给定的入射方向，BRDF返回在观察方向上反射的光量。**

BRDFs有很多实现方式，而一个差的BRDF无法满足下面的要求中的一项或者多项：

- 在入射方向与反射方向的有效范围内，BRDF始终是一个**正函数**
- 满足**对称性**，当入射方向与观察方向交换时，函数返回的结果不变
- 满足**能量守恒**定律，即反射光线的能量小于等于入射光线的能量

而好的BRDF不仅需要满足上述这些要求，还需要符合物理精准、计算效率高（这里同时包含计算速度与内存友好）。我们前面讨论的Phong模型是一个能量不守恒的模型，但是计算快速精准，所以在过去是一个应用范围很广的模型。

#### 1.4 Specular and Diffuse Lobes

让我们以"镜面反射瓣"这一你可能听说过或读到过的概念来结束本章。当表面粗糙时，它会将光线反射到与完美反射方向略有不同但围绕其中心的方向。你可以通过绘制围绕反射方向的某种延伸形状来描绘或可视化这个过程。这在某种程度上代表了表面可能反射光线的方向集合。这就是我们在计算机图形学中所说的镜面反射瓣。在图7中，我们将其表示为二维形状，但实际上应该是三维的。这个反射瓣的形状会随着入射光方向而变化，这是大多数材料共有的特性——每种入射方向都有独特的反射方式。对于真实材料来说，这种反射瓣的形状可能非常复杂，可以通过测角反射仪来测量。该仪器能记录特定入射光下材料在所有可能方向的反射强度，生成的三维数据形态取决于材料属性：漫反射材料呈半球形，镜面材料则呈现沿反射方向延伸的瓣状结构。这些实测数据既能用于推导模拟材料的数学模型，也能验证BRDF模型的准确性。值得注意的是，实测材料常呈现多个反射瓣，因此在计算机图形学中我们通过组合不同参数和权重的多个瓣来模拟（例如图7下部展示的漫反射+镜面反射组合，类似Phong模型的效果）。更多细节将在后续章节展开。

![](shad2-lobe1.png)

#### 1.5 Should I Tint Specular Reflections with the Objects' Color?

对于绝缘体材质来说，镜面反射只是光源所发出的光线的反射。所以**绝缘体材质的镜面反射的颜色，与光源的颜色一致**。

而某些金属本身是具有颜色的，例如黄金、铜。它们能够改变反射光线的颜色，我们就需要将反射光线乘以物体自身的颜色。









#### 1.5 Radiometry

在计算机图形学中，辐射度量学通常**用于描述和模拟光线的物理行为**，为真实感图形渲染（如全局光照和路径追踪）提供理论基础。在深度理解BRDF之前，我们有必要先了解一些辐射度量学中的术语。

首先，光可以被看作是在空间中传播、携带能量的一系列光子的集合。当我们讨论一个物体所发出的光的总量时，实际上所考虑的是该物体所发出的光子的数量。而在计算机图形学中，有关于光的物理量中，我们最常关注的就是光的能量，具体来说，是物体表面所**接收**的光量与**反射**的光量。

用于表示光的能量的物理量为**Flux光通量**，单位为瓦特，记作$W$。flux光通量定义了单位时间内通过一个给定表面的光子数量。

实际上我们可以将物体的某些材质属性，例如**颜色与亮度，视为反射光通量与入射光通量之间的比例的体现**。在现实世界中，物体材质属性在其表面上通常会有所不同。准确地来说，**物体外观在其表面的空间上是可变的**。大理石板是一个很好的例子：

![](WhatsApp-Image-2019-11-02-at-07.50.06.jpeg)

既然物体外观在其整个表面上是变化的，当我们要计算这样一块大理石所反射与接收的光通量时，我们需要对光通量这一概念建立更**微观**的理解：我们只考虑表面上单一一“点”上的光通量。但在现实世界中，我们无法定义这样一个所谓的“单一的点”，所以不妨转而考虑一个点周围非常小的区域——**小到在该区域的面积上，物体表面具有一致的材质属性**。或者说，在该小区域上，光通量不足以产生变化。我们将这个很小的面积区域称为**differential area**，记作$dA$。如下图所示：

![](lp-da2.png)

当我们以**differential area**为前提进行讨论时，我们就可以引入**irradiance辐照度**这个物理量了，它表示单**位面积上所接收到的光的总能量**，单位为瓦特每平方米（$W/m^2$）。

绝大多数物体的材质都具有与视角相关的这一性质，即给定表面上一点，反射的光量会随着视角的变化而变化。但是我们从irradiance的定义上可以看出，irradiance本身并没有考虑任何与视角相关的行为，所以我们需要引入一个新的物理量，**radiance辐照亮度**，它**表示光在特定方向上通过单位面积的光量**，单位为瓦特每平方米每立体角（$W\cdot m^{-2}\cdot sr^{-1}$）。

现在，我们不妨梳理一下目前所引入的三个物理量各自的表示方式及其单位：

- **Flux光通量**，记作$\phi$，单位为$W$
- **Irradiance辐照度**，记作$E$，单位为$W\cdot m^{-2}$
- **Radiance辐照亮度**，记作$L$，单位为$W\cdot m^{-2}\cdot sr^{-1}$


### Radiometry Equations

我们在前面提到过，点是一个抽象的概念，在现实世界中上并不存在，正因如此，我们将表面上一点定义为该点周围的一个非常小的区域$dA$。类似的，我们将方向描述为围绕该方向的一个角度非常之小的圆锥体，并将这个角度称为**differential solid angle**，记作$d\omega$。如下图所示：

![](lp-solidangle.png)

由此，我们可以重新审视一下irradiance与radiance这两个物理量之间的关系：

**irradiance量化了给定一点处的入射光，而radiance则量化了来自特定方向的给定一点处的入射光。**这意味着，点$x$的irradiance可以通过对点$x$上表面的法向量所形成的单位半球上的所有方向上的radiance进行积分而得出。进而，如果我们只考虑一个特定方向上的的radiance，而非整个半球，那么我们就可以计算出对应的irradiance的比例，被称为**differential irradiance**，记作$dE$。

![](lp-da.png)

如上图所示，对于给定的radiance（图中表示为穿过圆柱的光通量），differential irradiance的值取决于圆柱的入射角度。例如，当圆柱垂直于表面时，所有穿过圆柱的光子都会到达表面。**Lambert Cosine Law**所描述的就是这种关系，对应的数学表达式如下：


$$
dE=cos(\theta)Ld\omega
$$


其中，$\theta$表入射角度，$L$表示入射方向上的radiance，$d\omega$表示入射方向上的差分立体角。

那么给定点所在半球上的irradiance就可以表示为半球上关于$dE$的积分：


$$
E=\int_{\Omega}dE=\int_{\Omega}cos(\theta)Ld\omega
$$


鉴于目前为止所引入的物理量，我们现在可以将**表面的材质属性定义为入射通量与反射通量之间的比率**。这个比率本质上是**量化了物体吸收入射光的属性**。

现在，我们来尝试在数学上表示来自**单一方向的光在到达表面上一点时的这个比率**，并将该比率成为**reflectance反射率**，记作$f_r$：


$$
f_r=\frac{dL(\omega_o)}{dE(\omega_i)}=\frac{dL(\omega_o)}{cos(\theta _i)Ld\omega _i}
$$


这个计算反射率的公式就是我们所说的BRDF，单位为每球面度（$sr^{-1}$）。

最终，为了计算对于给定点在观察方向$\omega_o$上所看到的颜色，即$L(\omega_o)$，我们可以得到这样的数学表达式：


$$
L(\omega_o)=\int_{\Omega}f_rdE(\omega_i)=\int_{\Omega}f_rcos(\theta _i)L(\omega_i)d\omega_i
$$



### A BRDF for a Diffuse Surface

简单起见，我们来考虑一个完全漫反射材质的BRDF。在这里，完全漫反射表示该材质会在shading point所在半球的所有方向上均匀地反射光线。这意味着$f_r$是一个常量，所以我们可以将其从积分中提取出来：


$$
L(\omega_o)=\int_{\Omega}f_rcos(\theta _i)L(\omega_i)d\omega_i=f_r\int_{\Omega}cos(\theta _i)L(\omega_i)d\omega_i
$$


我们假设在整个半球上，入射的radiance都是一致的，则有：


$$
L(\omega_o)=f_rL(\omega_i)\int_{\Omega}cos(\theta _i)d\omega_i
$$


这种情况下，上述数学表达式所包含的积分结果为$\pi$，推导过程如下：


$$
\begin{equation}
\begin{array}{ll}
\displaystyle\int_{\Omega^+} \cos(\theta) d\omega & \quad (1) \\
\displaystyle\int_{\theta=0}^{\frac{\pi}{2}} \int_{\phi=0}^{2\pi} \cos(\theta) \sin(\theta) d\phi d\theta & \quad (2) \\
\displaystyle 2\pi \int_{\theta=0}^{\frac{\pi}{2}} \cos(\theta) \sin(\theta) d\theta & \quad (3) \\
\displaystyle\int_{\theta=0}^{\frac{\pi}{2}} \cos(\theta) \sin(\theta) d\theta = \left[-\frac{1}{2}\cos^2(\theta)\right]_{\theta=0}^{\frac{\pi}{2}} & \quad (4) \\
\displaystyle\int_{a}^{b} f(x) dx = F(b) - F(a) & \quad (5) \\
\displaystyle\frac{1}{2} \left[ \cos^2\left(\frac{\pi}{2}\right) - \cos^2(0) \right] = 0 - \frac{1}{2} - \frac{1}{2} = -\frac{1}{2} & \quad (6) \\
\displaystyle\int_{\Omega} \cos(\theta) d\omega = 2\pi \frac{1}{2} = \pi & \quad (7)
\end{array}
\end{equation}
$$
我们来整理一下我们的结果：对于一个漫反射材质，其BRDF是一个常量$f_r$，被一个常量的radiance辐照亮度$L_{\omega_i}$照射，则在所有方向上的反射radiance为：


$$
L(\omega_o)=f_rL(\omega_i)\pi
$$




基于这个表达式，如果$f_r$与$L(\omega_i)$均为1，则最终得到的反射radiance为$\pi$，这是一个大于1的值，显然与能量守恒定律相悖。由此，对于漫反射表面来说，$f_r$，也就是BRDF需要满足：


$$
\text{BRDF diffuse} = \frac{k}{\pi}
$$


其中，$k$这一项的范围在$[0, 1]$之间，我们通常称其为**albedo反照率**。

代入到反射radiance的表达式中，我们可知：


$$
L(\omega_o)=L(\omega_i)\cdot k
$$


由此，我们可以将反照率理解为材质的**漫反射部分中，物体表面反射光的比率。**
