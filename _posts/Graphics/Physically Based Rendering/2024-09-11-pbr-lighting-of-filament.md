---
title: Lighting in Filament
date: 2024-09-11 14:57 +0800
categories: [Graphics, Physical Based Rendering]
media_subpath: /assets/img/Graphics/PhysicallyBasedRendering/
math: true
---

Filament中的光照分为两部分：

- **Direct Lighting**：punctual lights, photometric lights, area lights
- **Indirect Lighting**：IBL

---

### 1 Units

在本篇博客中，我们会使用到如下符号与单位：

| Photometric term    | Notation | Unit                             |
| ------------------- | -------- | -------------------------------- |
| Luminous power      | $\Phi$   | Lumen($lm$)                      |
| Luminous intensity  | $I$      | Candela($cd$) or $\frac{lm}{sr}$ |
| Illuminance         | $E$      | Lux($lx$) or $\frac{lm}{m^2}$    |
| Luminance           | $L$      | Nit($nt$) or $\frac{cd}{m^2}$    |
| Radiant power       | $\Phi_e$ | Watt ($W$)                       |
| Luminous efficacy   | $\eta$   | Lumens per watt($\frac{lm}{W}$)  |
| Luminous efficiency | $V$      | Percentage(%)                    |

为了获得恰当且连贯的照明，我们必须使用符合现实场景中各种光强度比例的光照单位。这些强度可能有很大差异，从家用灯泡的大约 800 流明（$lm$）到日光天空和太阳照明的 120000 拉克丝（$lx$）。

实现照明连贯性的最简单方法是采用物理光照单位。在Filament中，各种类型的光源所使用的照明单位如下：

| Light type               | Unit               |
| ------------------------ | ------------------ |
| Directional light        | Illuminance        |
| Point light              | Luminous power     |
| Spot light               | Luminous power     |
| Photometric light        | Luminous intensity |
| Masked photometric light | Luminous power     |
| Area light               | Luminous power     |
| Image based light        | Luminance          |

在这里，我们有必要区分一下**Illuminance** 和 **Luminance** 

**Illuminance（照度）** 描述的是光照在表面上的强度，单位是$lx$。具体来说，照度计算的是单位面积上的光通量，也就是表面接收到的光的强度。

**Luminance** 是指人眼感知到的光的亮度，单位是$cd/m^2$。它描述了一个表面或物体在特定方向上的可视亮度，通常用于表示从一个表面向观察者传播的光的强度。亮度是一个与观察方向相关的物理量

渲染方程中，我们所计算是任意一点的**luminance**值，也就是outgoing radiance。具体来说，**luminance**取决**illuminance**与**BSDF** $f(v, l)$，数学表达式为


$$
L_{out}=f(v,l)E
$$


---

### 2 Direct Lighting

#### 2.1 Directional Lights

Filament中，平行光源所使用的照明单位为**illuminance（$lx$）**，这一方面是因为我们可以轻易地查找到天空或太阳的**illuminance**值，同时也可以简化计算**luminance**值的方程：


$$
L_{out}=f(v, l)E_{\bot}\lang n \cdot l\rang
$$


其中，$E_{\bot}$代表光源垂直照射到表面时的**illuminance**值。

对应的代码为：

```glsl
vec3 l = normalize(-lightDir);
float NdotL = clamp(dot(n, l), 0.0, 1.0);

// light intensity is the illuminance at perpendicular incidence in lux
float illuinance = lightIntensity * NdotL;
vec3 luminance = BSDF(v, l) * illuminance;
```

#### 2.2 Punctual Lights

Punctual lights遵循平方反比定律，其**illuminance**值可以表示为关于着色点到光源之间距离$d$的函数：


$$
E= L_{in}\lang n \cdot l \rang= \frac{I}{d^2}\lang n \cdot l \rang
$$


Filament支持两种punctual lights：**点光源**与**聚光灯**。它们之间的区别在于**illuminance**值的计算方式的不同，具体来事，是如何从**luminous power**中计算出光源的**luminous intensity**的区别。

##### Point Lights

对于点光源来说，**luminous power**可以通过计算**luminous intensity**关于立体角的积分得到，即：


$$
\Phi=\int_{\Omega}Idl=\int_0^{2\pi}\int_0^{\pi}Id\theta d\phi = 4\pi I
$$


也就是：


$$
I=\frac{\Phi}{4\pi}
$$


代入到公式中，我们可以得到点光源的**luminance**方程为：


$$
L_{out}=f(v, l)\frac{\Phi}{4\pi d^2}\lang n \cdot l \rang
$$

##### Spot Lights

聚光灯比点光源复杂一些，它通过以下参数定义：**位置**、**方向**、**内角**与**外角**，其中内外两角用于定义关于角度的衰减值。对于聚光灯来说，**luminous power**与**luminous intensity**之间的数学表达式为：


$$
\Phi=\int_{\Omega}Idl=\int^{2\pi}_0\int^{\theta_{outer}}_0Id\theta d\phi =2\pi (1-\cos\frac{\theta_{outer}}{2})I
$$


即：


$$
I=\frac{\Phi}{2\pi (1-\cos\frac{\theta_{outer}}{2})}
$$


这个公式在物理上是正确的，但是在渲染中有一些难以应用：外角值的改变会对聚光灯的**illumination level**带来较大的影响，如下图所示：

 ![](screenshot_spot_light_focused.png)

光照强度与外角值的耦合使得美术开发人员在不改变光照强度的前提下无法修改聚光灯的形状。所以Filament采用了这样的公式：


$$
I=\frac{\Phi}{\pi}
$$


这样的话，修改外角值也不会影响光源的光照强度：

![](screenshot_spot_light.png)



---

###  3 Image Based Lights

在现实世界中，光线从各个方向而来，要么直接来自光源，要么在环境中的物体反射后间接而来。在某种程度上，物体周围的整个环境都可以被视为一个光源。我们可以使用cubemap来“编码”这样的环境光照。我们将这种技术成为**IBL**， 或者成为**indirect lighting**。

给定表面上一个着色点，整个环境对于该着色点的贡献值被称为**irradiance**，记为$E$。该点在观察方向所返回的光照被称为**radiance**，记为$L_{out}$。二者之间的计算关系的数学表达式为：


$$
L_{out}(n, v, \Theta)=\int_{\Omega}f(l, v, \Theta)L_{\bot}(l)\lang n\cdot l\rang dl
$$


需要注意的是，我们是从宏观层面上来计算的IBL，而非基于微表面模型的微观层面。**本质上来说，我们是将BRDF应用于来自各个方向、并编码在IBL中的“点光源”。**

#### 3.1 IBL Types

现代渲染引擎中有四种常见的IBL：

- **Distant light probe**：捕获无穷远处的光照信息，通常包含天空、景观、建筑等。这种类型的IBL通常由引擎捕获并生成，或者来自于现实世界中的相机所拍摄的HRDI。
- **Local light probe**：用于从某个特定视角捕获场景中的特定区域。相较于Distant light probe更精准，适合向材质球添加局部反射
- Planar reflections
- Screen space reflection

#### 3.2 IBL Unit

Filament中的IBL都以**luminance （$cd/m^2$）**为单位，也是光照方程的单位。

#### 3.3 Processing Light Probes

IBL的radiance需要对表面半球积分计算得出，这对于实时渲染来说成本过高，为此我们需要对探针进行预处理，将其转换为利于实时渲染计算的形式。

我们将分别讨论两个用于加速光照探针计算的技术：

- **Specular reflectance**：pre-filtered importance sampling and split-sum approximation
- **Diffuse reflectance**：irradiance map和球谐函数

#### 3.4 Distance Ligth Probes

##### Diffuse BRDF Integration

