---
title: Introduction to Shading
date: 2022-12-30 23:38 +0800
categories: [Graphics, Scratchpixel]
media_subpath: /assets/img/Graphics/Scratchapixel/
math: true
---

> [Introduction to Shading](https://www.scratchapixel.com/lessons/3d-basic-rendering/introduction-to-shading/what-is-shading-light-matter-interaction.html)

### 1 What is Shading: Light-Matter Interaction

在本篇博客中，我们会首次了解到“shading”的含义，以及影响物体外观的因素，例如**光线强度**、**光线方向**、**物体表面相对于光源的朝向**、**物体的颜色**等等。当我们理解了这些基础概念后，我们将会探讨一些用于计算着色的基本技巧，并在后续探讨更深层次的东西，例如反射与折射。

#### 1.1 Intro to Shading

正如我们在之前的章节中所提到的，渲染本质上可以划分为两个阶段**：可见性**与**着色**。解决可见性问题上，我们介绍了两种技巧，分别是**光栅化**与**光线追踪**。从本篇博客开始，我们将专注于渲染过程的第二阶段，也就是着色。这个话题涵盖了众多方面，所以，我们不妨先从最基础的着色知识开始。

#### 1.2 What is Shading?

首先，我们了解到渲**染是从给定视角在计算机中重新还原场景中物体的形状、可见性以及外观的过程**。前两个方面我们可以通过光栅化/光线追踪解决，那么**着色就是计算场景中物体颜色的过程**。给定视角在着色过程中起着重要的作用，因为物体的外观在不同视角下可能是不同的。同时，外观还会受到很多其他因素的影响，简单来说，**外观很大程度上取决于光与物质之间的交互**。

#### 1.3 Setting Up Terminology

在Photorealistic Rendering中，物体的外观在本质上是两个主要因素的副产物：**光照**与**物体的属性**。光线在可见性过程中就扮演着重要的角色；没有光，物体就不可见。并且通常情况下，光线越强，物体就越明亮。而物体的属性可以大致分为两类：

- **表面的几何属性**（例如朝向性）
- **影响光线与物体交互过程的属性**（例如物体的颜色）

当我们看到“某个物体”时，我们实际上看到是物体表面所反射的光线：光线被光源发出，到达物体表面，此时物体会将部分光线反射到观察者所在的方向。在着色中，我们称这种光线为**直接光照**，如下图所示：

![](shad-reflected-light1.png)

当然，物体所反射的光线也可以到达其他物体的表面，经过若干次反射后，最终进入人眼，我们将这种现象称为**间接光照**。

![](shad-reflected-light3.png)

#### 1.4 Light-Matter Interaction and the Essential Components Of Shading

上一小节中，我们了解到：**我们所感知的并非物体本身，而是物体表面所反射的光线** 。我们在前面也提到过，**表面相对于光源的朝向对于反射的光量有着重要的影响**。在生活中我们不难观察到，能将光线反射回光源的表面是最明亮的部分。

由此我们在着色中引入以下重要的量：**着色点$P$**，**表面法向量$N$**，从$P$指向光源位置的**光线方向$L$**，以及观察方向$V$。

在我们深入研究光线是如何被反射之前，我们首先来考虑光线反射的方向。我们通常使用$\omega_i$来表示入射角，用$\omega_o$表示反射角度。对于完美镜面反射的物体来说，反射定律告诉我们这样一个结论：**反射角等于入射角**。并且利用几何知识，我们可以轻松根据$N$与$L$计算出反射角度。

然而，现实中的绝大多数物体都并非是完美镜面反射的。在CG中，我们用**diffuse**或**Lambertian**来描述不光滑表面的这种性质。diffuse表面与光泽表面区别在于，粗糙表面类似于“破损”的镜面。它们的表面类似于很多朝向随机的微小完美镜面所构成的集合，如下图所示：

![](shad-rough.png)

结果就是，光线会被散射到各个不同的方向上，而反射方向则取决于这些微小表面朝向的差异性。进而，反射的图像就会呈现出模糊的效果。换句话说，**如果一个物体表面上的反射是模糊的，那就意味着该表面是粗糙的，它倾向于将光线反射到各个不同的方向上，而非镜面条件下一个单一的反射方向**。

![](shad-roughness1.gif)

漫反射材质通常会被认为是完美镜面的对立面，并且我们会自然而然地将材质的漫反射性与粗糙度相关联，**但实际上，漫反射性质的本质原因并非来自粗糙度**。漫反射材质通常具有复杂的内部结构，**这种结构会将入射光线“困”在材质内部，光线在离开物体表面之前，会在其内部多次反射**。**这种多次内反射最终会导致光线离开的角度与入射方向毫无关联**。在CG中，我们认为**光线离开的方向是随机**的。比方说，如果有100束光线以相同的入射角度到达着色点$P$周围的一小部分区域，那么最终的结果是小于100束的光线会以随机的方向离开表面，因为部分光线会因多次内反射而被材质吸收。

由于我们上述的这种性质，**漫反射物体会被视为在以$P$为圆心，$N$为朝向的半球的所有方向上均匀地反射入射光线**。如下图所示：

![](shad-light-beam5.png)

**由于漫反射物体向所有方向均匀地反射光线，表面的亮度是与观察方向无关的，光滑表面的反射是view-dependent**。

最后，我们还需要讨论一下着色的另一个方面：为什么物体具有各种各样的颜色，以及我们如何模拟不同的颜色。“白色”的光线是由可见光谱中的所有颜色组成的，而**当白光到达物体表面时，部分颜色会被吸收，部分颜色会被反射**。例如，橙色的水果会吸收绝大部分蓝光，而反射红光与绿光，经过混合就呈现出了橙色。**这种现象可以量化为不同颜色的反射光与入射光的比率，我们将这种概念称为albedo反照率。在我们例子中，以RGB颜色系统表示的话，红绿蓝的反照率分别为0.9，0.6，0.1。**

---

###  2 Normals, Vertex Normals and Facing Ratio

#### 2.1 Normals

法线在着色中是一个很重要的概念，因为物体表面的朝向能够影响表面所反射的光量。那么问题来了，如何计算法线呢？解决方法的复杂性在很大程度上取决于要渲染的几何体。以三角形为例，每个三角形都定义了一个平面，那么与这个平面向垂直的向量就可以作为三角形上任意一点的法线。我们可以通过对三角形任意两边做叉积计算出这个向量。

通过这种方式计算出来的法线，我们称之为**face normal**。因为法线对于整个面来说都是一致的。我们当然也可以在网格体的顶点上定义法线，这样的法线就是vertex normal，这也是在smooth shading中所需要的法线数据。

#### 2.2 Flat Shading vs. Smooth Shading

三角形网格体并不能完美地表示平滑的表面，除非构成网格体的三角形很小很小。如果我们使用三角形的face normal进行着色渲染，那我们得到的渲染效果就被称为**flat shading**：

![](shad-face-normals.png)

为了解决这种faceted appearance，Henri Gouraud提出了一种方法，不再计算每个面的法线，而是使用每个顶点上的法线，并通过线性插值来计算三角表面上任意着色点的法线。

![](shad-face-normals2.png)

下面的这段代码可以在已知顶点法线、着色点的重心坐标以及三角形索引的前提下计算出插值的法线：

```c++
void getSurfaceProperties( 
    const Vec3f &hitPoint, 
    const Vec3f &viewDirection, 
    const uint32_t &triIndex, 
    const Vec2f &uv, 
    Vec3f &hitNormal, 
    Vec2f &hitTextureCoordinates) const 
{
    // compute "smooth" normal using Gouraud's technique (interpolate vertex normals)
    const Vec3f &n0 = N[trisIndex[triIndex * 3]]; 
    const Vec3f &n1 = N[trisIndex[triIndex * 3 + 1]]; 
    const Vec3f &n2 = N[trisIndex[triIndex * 3 + 2]]; 
    hitNormal = (1 - uv.x - uv.y) * n0 + uv.x * n1 + uv.y * n2; 
    hitNormal.normalize();  // normalize for safety, although N's are already normalized
} 
```

---

### 3 Lights

> 这一章节没有太多有价值的内容，是一个简单的介绍，所以

[略]

---

### 4 Diffuse and Lambertian Shading

在计算机图形学中，我们可以轻易地实现漫反射物体的渲染，但是想要了解其中的原理，我们首先需要认识光线与表面交互的方式，这也是为什么我们需要讨论一点辐射度量学的内容。

我们将着色点视为一个很小很小的表面，即**differential area**，记作$dA$。也就是说，我们不能将着色点视为一个纯粹的点，而是**实际拥有面积的一个较小区域**。因此，我们也不能将到达着色点$P$的光线视为简单的单束光，**而是一个横截面与$dA$面积相同的“光束”**，如下图所示：

![](shad-light-beam2.png)

在任意给定时间下，我们可以假设达到$dA$的光量是一个常数。我们从图中可以看出，随着光束与法线之间的夹角变大，光束的横截面也在变大，那么光束中的只有部分能量是达到$dA$的。

![](shad-light-beam4.png)

我们将以上现象总结为一句话：表面所接受的光量与表面法线与光线方向之间的夹角成正比，也就是**Lambertian's Cosine Law**。我们可以用数学表达式来描述夹角：


$$
cos\theta = N\cdot L
$$


现在，**我们已经知道了如何计算漫反射表面上所接收的光量，但这只是漫反射着色问题的一个方面，我们还需要知道漫反射表面向环境中，特别是观察方向上所反射的光量**。我们前面提到过，当光能到达$P$时，部分光线被吸收，部分光线会被反射，这就是表面的反照率参数，它定义了反射光线在全部入射光线中的比例：


$$
\text{albedo} = \frac{\text{reflected light}}{\text{incident light}}
$$


我们在本篇博客的第一个章节中提到，漫反射表面有一个特殊的性质，那就是它们会在入射点上方的每个方向上均匀地反射照射在其表面的光。也就是说，漫反射材质所反射的能量会被重新分配到$P$所在的半球表面上。所以，我们可以使用积分来表示漫反射材质所反射的光量：


$$
\text{Amount of Reflected Light (P)}=\int_{\Omega}\rho_d \cdot \text{Light Energy}\cdot cos\theta d\omega
$$


最终我们推导可以得到：


$$
\rho_d \cdot \pi \leq 1
$$


理论上来说，表面的反照率参数是一个范围在$[0, 1]$之间的 值，但这样显然无法满足不等式成立的要求。唯一的解决办法是，将反照率除以$\pi$，从而确保表面反射的光量不会超出接收的光量。所以，最终我们得到的公式为：


$$
\text{Diffuse Surface Color}=\frac{\rho_d}{\pi} \cdot L_i \cdot cos\theta
$$

在这里，**我们可以将反照率除以$\pi$视为将积分结果进行归一化**

---

### 5 Lights & Shadows

在本章节中，我们将了解阴影是如何添加到图像中的。

阴影的存在使得渲染效果更加真实。在CG中，如何渲染阴影取决于解决可见性问题的算法：

- 在光栅化中，我们无法在单个pass中就完成阴影的绘制，而是需要先从光源的视角来预计算物体的可见性，将结果存储在shadow map中。
- 在光线追踪中，从primary ray与物体的交点位置，构建shadow ray，如果shadow ray上存在其他物体，那么交点就在阴影中。

下面是在光线追踪算法中对应的伪代码：

```c++
Vec3f castRay( 
    const Vec3f &orig, const Vec3f &dir, 
    const std::vector<std::unique_ptr<Object>> &objects, 
    const std::unique_ptr<DistantLight> &light, 
    const Options &options) 
{ 
    Vec3f hitColor = options.backgroundColor; 
    IsectInfo isect; 
    if (trace(orig, dir, objects, isect)) { 
        Vec3f hitPoint = orig + dir * isect.tNear; 
        Vec3f hitNormal; 
        Vec2f hitTexCoordinates; 
        isect.hitObject->getSurfaceProperties(hitPoint, dir, isect.index, isect.uv, hitNormal, hitTexCoordinates); 
        Vec3f L = -light->dir; 
        IsectInfo isectShad; 
        bool vis = !trace(hitPoint + hitNormal * options.bias, L, objects, isectShad, kShadowRay); 
        hitColor = vis * isect.hitObject->albedo * light->intensity * light->color * std::max(0.f, hitNormal.dotProduct(L)); 
    } 
 
    return hitColor; 
} 
```

当然这段代码只是示意，存在着一定的优化空间

#### 5.1 Shadow-Acne: Avoiding Self-Intersection

计算阴影有一个很普遍的问题就是**shadow-acne**。它出现的原因是3D引擎中有限的数字精度，进而导致导致primary ray与物体的交点位于表面下方。在这种情况下，**指向光源的shadow ray就会与该物体自身的表面相交**，即所谓的"self-intersection"，进而导致错误的阴影出现。如下图所示：

![](shad-shadows3.png)

有若干种解决减少shadow-acne的方法，最直接的思路是使用double精度。或者，我们使用上图中所展示的技巧，也就是将shadow ray的原点朝着表面法线的方向移动“恰当”的距离。而具体要如何界定这个距离，则需要视情况而考虑，我们将这个距离称为shadow bias。

---

### 6 Spherical Light

> 我们会在其他博客中更详细讨论有关内容

[略]

---

### 7 Multile Lights

[略]

---

### 8 Reflection, Refraction and Fresnel

我们在本章节中要讨论的问题是，对于透明物体，如何计算有多少光被折射，同时有多少光被反射。为了回答这个问题，我们还需要对菲涅尔效应有一定的了解。

#### 8.1 Reflection

我们先讨论反射吧，这基本上是最简单光线-物质之间的交互形式了。**反射定律告诉我们，反射角度等于入射角度**。当我们一直入射角度与法线向量时，可以轻易地计算出反射方向：


$$
R=I-2(N\cdot L)N
$$


反射的光线只有在其方向与观察方向相同时才能观察到，也就是说反射是**view-dependent**

在光线追踪算法中，模拟反射是比较简单的。如果camera ray所相交的对象具有反射的材质，那么我们就可以根据入射方向与法线计算出反射方向，接着我们递归地调用`castRay()`，将反射关系的颜色值赋予camera ray。当然，这种方法只能产生完美且清晰的反射。我们会在后续的博客中探讨如何创建出模糊的反射。

我们可以使用下面这段代码来实现反射，需要注意的是，为了便于从背景中识别出场景中的平面，我们对反射进行一定程度的衰减。这并非是错误的计算，实际上类似于镜子的表面也无法百分百反射入射光线，此外菲涅尔效应同样会影响反射的光量。

```c++
Vec3f reflect(const Vec3f &I, const Vec3f &N) 
{ 
    return I - 2 * dotProduct(I, N) * N; 
} 
 
Vec3f castRay( 
    const Vec3f &orig, const Vec3f &dir, 
    const std::vector<std::unique_ptr<Object>> &objects, 
    const std::vector<std::unique_ptr<Light>> &lights, 
    const Options &options, 
    const uint32_t & depth = 0) 
{ 
    if (depth > options.maxDepth) return options.backgroundColor; 
    ... 
    if (trace(orig, dir, objects, isect)) { 
        ... 
        switch (isect.hitObject->type) { 
            case kDiffuse: 
            ... 
            case kReflection: 
            { 
                Vec3f R = reflect(dir, hitNormal); 
                hitColor += 0.8 * castRay(hitPoint + hitNormal * options.bias, R, objects, lights, options, depth + 1); 
                break; 
            } 
            ... 
        } 
    } 
    ... 
 
    return hitColor; 
} 
```

为了避免无限递归，同时也为了减少一定的渲染成本，我们通常会限制递归的次数，称为ray depth。

---

#### 8.2 Refraction

> 在本小节中，我们只讨论clear transparent objects，例如水、玻璃等，因为很多透明物体会对穿过其中的光产生衰减作用。

光线从一个透明介质到达另一个透明介质时，其方向会发生改变。新的光线方向取决于两个因素，**入射角度**与**新介质的IOR**。

我们知道光线在真空中的速度是一个常数，记为$c$。当光线在任意其他介质中时，速度会所降低，我们记为$v$。那么IOR可以简单定义为：


$$
\eta = \frac{c}{v}
$$


折射现象有Snell's Law描述：给定两个介质，则入射角度与折射角度的sin值的比值与两个介质的IOR的反比相等。用数学表达式描述为：


$$
\frac{sin\theta_1}{sin\theta_2}=\frac{\eta_2}{\eta_1}
$$


现在我们的问题是，如何根据已知条件，推导出折射方向$T$呢？

![](shad-refraction7.png)

> 这里省略掉推导过程


$$
T=\eta I + (\eta c_1 - c_2)N
$$


其中：


$$
\begin{array}{l}
\eta = \dfrac{\eta_1}{\eta_2},\\
c_1 = \cos(\theta_1) = N \cdot I,\\
c_2 = \sqrt{1 - \left( \dfrac{n_1}{n_2} \right) ^2 \sin^2(\theta_1)} \rightarrow \sqrt{1 - \left( \dfrac{n_1}{n_2} \right) ^2 (1 - \cos^2(\theta_1))}
\end{array}
$$


折射现象中还有一个需要我们注意的细节。在光线从IOR相对较低的介质到达IOR相对较高的介质的情况下，当入射角度大于某个被称为**critical angle**的临界值时，全部入射光线都会被反射，不存在任何折射。这种现象被称为**total internal reflection**。

![](shad-refraction9.png)

#### 8.3 Fresnel

我们前面提到过，诸如玻璃、水这种透明物体，具有具有反射性与折射性。对于这类透明物体，反射的光量与折射的光量取决于入射光线的角度：角度越大，反射光线所占的比例就越大。同时我们根据能量守恒定律，我们知道反射光量与折射光量之和就等于入射光量。

菲涅尔公式用于计算反射光线与折射光线之间的比值。公式背后的原理及其推导过程不是本小节的重点，我们只需要了解，我们需要使用两个不同的等式分别计算光线的两个组成部分（平行与垂直的偏振光）的折射所占的比例：


$$
\begin{array}{l}
F_{R\parallel} = \left( \dfrac{\eta_2 \cos\theta_1 - \eta_1 \cos \theta_2}{\eta_2 \cos\theta_1 + \eta_1 \cos \theta_2} \right)^2,\\
F_{R\perp} = \left( \dfrac{\eta_1 \cos\theta_2 - \eta_2 \cos \theta_1}{\eta_1 \cos\theta_2 + \eta_2 \cos \theta_1} \right)^2.
\end{array}
$$


而最终的反射比例是以上两个值的平均数：


$$
F_R = \dfrac{1}{2}(F_{R\parallel} + F_{R\perp}).
$$
