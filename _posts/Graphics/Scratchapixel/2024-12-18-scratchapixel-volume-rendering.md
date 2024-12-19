---
title: Scratchpixel Volume Rendering
date: 2024-12-18 23:38 +0800
categories: [Graphics, Scratchpixel]
media_subpath: /assets/img/Graphics/Scratchapixel/
math: true
---

### An Introduction to Volume Rendering

#### Transmittance, Absorption, Particle Density, and Beer's Law

体积渲染围绕这样几个概念展开：**透射、吸收，以及volume不透明度与volume中粒子密度之间的关系**。为了简单起见，我们暂时先考虑均一的密度。

我们以下图为例，一个球形的volume放在一个红色的长方体前。当光线经长方体反射并朝向眼睛运动过程中，部分光线会被**吸收**。我们将光线穿过volume而被吸收的能量称为**内部透射率，internal transmittance**。当内部透射率的值为0时，表示volume完成遮挡了光线；当内部透射率为1时，表示所有光线均可以从volume中完成透射。

![](voldev-L0term1.png)

Beer-Lambert定律就是一个计算透射率的公式。其中，密度这个概念是由吸收系数表示的（以及散射系数，我们会在后面讨论到）。吸收系数越高，则volume越不透明。公式定义如下：


$$
T = \exp(-\text{distance} \times \sigma_a) = e^{-\text{distance} \times \sigma_a}
$$


**Beer-Lambert定律表明，一个穿过volume的光线的内部透射率$T$，和volume的吸收系数$\sigma_a$与光线在volume中的传播距离的乘积之间存在指数关系。**其中，吸收系数与散射系数的单位是长度的倒数。

![](voldev-expfunction.png)

---

#### Scattering

目前为止，我们的讨论一直基于volume是黑色的这样的前提。在此前提下，volume对光线带来的影响只能体现在对于背景色的变暗上。然而，volume并不限于是黑色，与普通的物体一样，volume可以反射（或者说散射，scatter）和发出光线。这也是为什么我们可以观察到天空中的白色的云朵。

现在，让我们想象一个由volume构成的方块，其厚度为`10`，密度为`0.1`。当透过该方块观察一个颜色为`(xr, xg, xb)`的背景时，由Beer-Lambert定律，我们可以轻易计算出透过volume所看到的颜色为：

```c++
vec3 backgroundColor {xr, xg, xb};
float sigmaA = 0.1; // absorption coefficient
float distance  = 10; // thickness of the slab

float T = exp(-distane * sigmaA);
vec3 backgroundColorThroughVolume = backgroundColor * T;
```

当然，这是没有将volume的散射考虑在内的情况。我们假设volume自身的颜色值为`(yr, yg, yb)`（我们先暂时忽略volume自身的颜色值来自哪里这个问题）。那么我们的代码就变为了：

```c++
vec3 backgroundColor {xr, xg, xb};
vec3 volumeColor {yr, yg, yb};
float sigmaA = 0.1; // absorption coefficient
float distance  = 10; // thickness of the slab

float T = exp(-distane * sigmaA);
vec3 backgroundColorThroughVolume = backgroundColor * T + volumeColor * (1 - T);
```

我们可以将这个过程理解为alpha混合，用公式表示为：


$$
C = (1 - B.\text{transparency}) * A + B.\text{transparency} * B
$$


这里的透明度为1减去内部透射率，而B则是volume的颜色（被volume“反射”并进入眼睛的光线）

---

#### Rendering our First Volume Sphere

![](20241218183808.png)

在Unity中渲染得到的结果

---

#### Let's Add Light! In-Scattering

当光线与组成volume的粒子发生碰撞时，由两种情况，光线被吸收或者光线被散射到其他方向。而如果光线的散射方向与观察方向相反，那么这束光线对我们来说就是可见的。我们将这种情况称为in-scattering。规范地来说，**in-scattering描述了光线穿过volume时，由于散射而被重定向朝向眼睛/摄像机的情况。**如下图所示：

![](voldev-inscattering.png)

从图中可以看出，最终进入眼睛的光线是来自背景的光线与来自光源的被散射的光线的组合。由此，最终volume的成像由多个部分组成：

- 沿着视线方向穿过volume所观察到的背景色，这个颜色会因volume对于光线吸收而产生衰减
- 来自场景中各个光源以及各个方向的光线

对于第一个部分，我们已经讨论过了计算内部透射率的Beer定律。现在我们来考虑如何计算in-scattering。这个问题的难点在于，光线的散射可能发生在视线方向上的$[t_0, t_1]$的任何位置。在这段距离上，光线的吸收与散射是连续的，而非离散的。

在我们讨论解决方法之前，有必要先明确一下数学上的表述。我们定义$L_i(x, \omega)$为计算散射到眼睛的光量的函数，其中$x$表示$[t_0, t_1]$上的任意位置。如下图所示：

![](voldev-raymarching1.png)

所以，计算in-scattering意味着我们需要收集$[t_0, t_1]$之间、沿着方向$\omega$的光线所散射的所有能量。于是我们得到了这样的一个积分：


$$
\int_{x=t_0}^{t_1}Li(x, \omega)dx
$$


由于volume的形状是任意的，场景中的光源信息也是任意的，我们只能通过近似的方式求这个积分，也就是Ray-Marching算法。

---

### The Ray-Marching Algorithm

为了计算某个方向上的入射光的in-scattering，我们需要将光线所穿过的volume划分为若干个小的volume，并分别计算出贡献值，最终求和。如下图所示：

![](voldev-backward-raymarching.gif)

算法流程如下：

1. 求出$t_0$与$t_1$，也就是视线进入volume与离开volume的点。
2. 将$[t_0, t_1]$定义的线段划分为$X$个大小相同的较小线段，每段线段的长度为我们所定义的**step size**。
3. 沿着视线方向，步进$X$次。

4. 在每次步进中，我们构建一条射线，该射线以当前的采样点为原点，指向光源方向，并计算出射线与volume的交点，最终利用Beer定律计算出当前采样点的贡献值，即in-scattering的值。需要注意的是，根据黎曼和的定义，我们需要将得到的结果再乘以step size，也就是$dx$。
5. 我们也应当将光线穿过当前的步进距离，即**step size**而产生的衰减考虑在内。并使用这个衰减值乘以上一步得到的in-scattering值。
6. 最后，我们需要将所有的样本组合在一起，以考虑到它们对于volume整体不透明度与颜色的各自的贡献。从相机的角度来看，靠近$t_1$的样本会被靠近$t_0$而遮挡。将样本组合的方式可以分为两种，从$t_1$到$t_0$的顺序被称为**backward**，从$t_0$到$t_1$的顺序被称为**forward**

---

#### Backward Ray-Marching

在这种组合方式中，我们遵循从后向前的步进顺序，也就是将volume中位于$t_1$处的样本$X0$作为第一个样本，然后依次步进回到$t_0$。那么我们要如何计算这个每个样本的贡献值呢？我们首先来考虑第一个样本$X0$。

- 我们需要计算in-scattering贡献值$Li(X0)$。计算方法我们已经在上一个section中的第四步讨论过了。
- 乘以该样本的透明度，也就是该样本处volume会吸收多少光量。计算方式同样是利用Beer定律，其中距离是光线在该样本中的穿行距离，即step size

用伪代码表示为：

```c++
Color LiX0 = exp(-lightT1 * sigmaA) * lightColor * stepSize;
Color X0Contribute = LiX0 * exp(-stepSize * sigmaA);
```

现在，我们应该开始计算下一个样本$X1$的贡献值了，但此时情况比计算$X0$时复杂了一些：我们不但需要考虑到由于in-scattering而穿过样本$X1$的光线，还需要考虑到来自前一个样本的光线。我们需要将二者相加，然后乘以第二个样本的透射率。不断重复这个过程，直到步进到$t_0$。整个过程如下图所示：

![](voldev-backward-raymarching2.png)

从图中可以发现，我们计算的是两个值，分别是volume的颜色与volume的透明度。最终我们将得到的这两个结果与背景色相结合：

```c++
Color final = backgroundColor * transparency + result;
```

其中，`result`已经在计算过程中完成了对于透明度的预乘。关于这一点，我们会在后面进一步地深入讨论。

在Unity中的实现如下：

```glsl
float transparency = 1;
half3 result = 0;

for (int i = 0; i < steps; i++)
{
    // calculate the sample position
    // -----------------------------
    float t = t1 - stepSize * (i + 0.5); // middle of the step
    float3 samplePos = rayOrigin + rayDirection * t;

    // compute current sample's transparency
    // -------------------------------------
    float sampleTransparency = exp(-stepSize * _Absorption);

    // attenuate global transparency by current sample's transparency
    // --------------------------------------------------------------
    transparency *= sampleTransparency;

    // in-scattering
    // -------------
    float lightDistance = distance(samplePos, lightPos);
    float lightAttenuation = exp(-lightDistance * _Absorption);
    result += lightAttenuation * lightColor * stepSize;

    // finally attenuate result by sample's transparency
    // -------------------------------------------------
    result *= sampleTransparency;
}

color.rgb = backgroundColor * transparency + result;
return color;
```

![](20241218230552.png)

---

#### Forward Ray-Marching

不管是前向还是后向，采样点透射率与in-scattering的计算手段都是相同的，二者的区别在于组合采样点的方式。在前向步进中，样本的in-scattering贡献值已经被当前处理完成的采样点的总透明度衰减完成了。对于前向步进，算法描述如下：

- 步骤一：在开始步进循环之前

  ```glsl
  float transparency = 1;
  half3 result = 0;
  ```

- 步骤二：在每个步进中

  - 计算当前采样点的in-scattering
  - 更新整体透明度，也就是乘以当前采样点的透明度
  - 将当前采样点的$Li(x)$乘以整体透明度，得到的结果再共享给`result`

过程如下图所示：

![](voldev-forward-raymarching2.png)

在Unity中的实现为：

```glsl
for (int i = 0; i < steps; i++)
{
    // calculate the sample position
    // -----------------------------
    float t = t0 + stepSize * (i + 0.5);
    float3 samplePos = rayOrigin + rayDirection * t;

    // compute current sample's transparency
    // -------------------------------------
    float sampleTransparency = exp(-stepSize * _Absorption);

    // attenuate global transparency by current sample's transparency
    // --------------------------------------------------------------
    transparency *= sampleTransparency;

    // in-scattering
    // -------------
    float lightDistance = distance(samplePos, lightPos);
    float lightAttenuation = exp(-lightDistance * _Absorption);
    result += transparency * lightAttenuation * lightColor * stepSize;
}
```

两种方式得到的最终结果都是一样的。

---

#### Why forward is "better" than backward

在前向步进中，当整体透明度非常接近零时，我们就可以停止步进，从而减少不必要的计算。

---

#### Choosing the Step Size

我们使用光线步进来进行volume rendering，是因为能够较好对求出积分的近似。所以stepsize的选择是一种在性能与精确程度上的权衡。

除此以外，StepSize的选择还有一些其他的考量。目前我们假设volume的密度是均匀的，而在后续的内容中，密度能够随着空间或时间而变换。如果步长较大，就有可能无法捕捉到一些较小的频率特征，如下图所示（当然这是一个极端的示例）：

![](voldev-stepsizesmall.png)

另一种情况是阴影。当较小的物体在volume中投影时，也有可能因步长太大而损失对应的细节。如下图所示：

![](voldev-missshadow.png)

目前来说，一个较好的步长选择是相机射线与volume相交处的像素的投影大小，即

```c++
float projPixWidth = 2 * tanf(M_PI / 180 * fov / (2 * imageWidth)) * tmin;
```

其中，tmin是相机射线与volume相交处的距离。类似地，可以计算光线离开体时的投影像素宽度，并在`tmin`和`tmax`处对投影像素宽度进行线性插值，以便在沿着光线行进时设置步长。

---

### Ray Marching: Getting it Right!

在前面的章节中，我们只考虑了光束与构成介质的粒子之间的两种相互作用类型：**吸收**和**内散射**。但是，为了得到准确的结果，我们应该考虑四种类型。我们可以将它们分为两类。一类是光束穿过介质到达眼睛的过程中减弱其能量的相互作用。另一类是有助于增加其能量的相互作用。

- 光束在通过volume传播到眼睛的过程中会因以下原因而**损失**能量：
  - absorption：光线的一部分能量被组成volume的粒子吸收
  - out-scattering：朝向眼睛传播的光在到达眼睛的途中也可能被散射出去
- 光束在通过volume传播到眼睛的过程中会因以下原因而**获得**能量：
  - emission
  - in-scattering：一些最初并非朝着眼睛传播的光由于散射而被重新定向朝着眼睛传播

![](voldev-interactions.png)

在我们目前的Unity实现中，光线损失的能量只考虑到了吸收这种情况。现在，我们可以将散射同样考虑在内，也就是在应用Beer定律时，将散射系数与吸收系数相加，用$\sigma_t$表示，称为extinction coefficient。

此外，考虑到内散射的贡献值与散射系数成正比，我们还需要将内散射乘以散射系数。

最终我们的代码如下：

```glsl
float extinction = _Absorption + _Scatter;

float transparency = 1;
half3 result = 0;

// compute each sample's transparency
// ----------------------------------
const float sampleTransparency = exp(-stepSize * extinction);

// using forward ray marching
// --------------------------
for (int i = 0; i < steps; i++)
{
    // calculate the sample position
    // -----------------------------
    float t = t0 + stepSize * (i + 0.5);
    float3 samplePos = rayOrigin + rayDirection * t;

    // attenuate global transparency by each sample's transparency
    // -----------------------------------------------------------
    transparency *= sampleTransparency;

    // in-scattering of this sample
    // ----------------------------
    float lightAttenuation = exp(-distance(samplePos, lightPos) * extinction);
    float3 inScattering = lightAttenuation * lightColor * stepSize * _Scatter;

    // add in-scattering to the result
    // -------------------------------
    result += inScattering * transparency;
}

// final color
// -----------
color.rgb = backgroundColor * transparency + result;
return color;
```
{: add-lines="1, 8, 25-26"}

---

#### The Density Term

目前为止，volume的密度是均一的，我们将这种volume称为**homogenous participating medium**。在现实世界中，如云与烟通常具有非均一的密度，我们称之为**heterogeneous participating medium**。

我们定义一个密度变量，用于全局地缩放吸收与散射系数。另外，内散射的贡献值也需要乘以密度。

```glsl
const float sampleTransparency = exp(-stepSize * extinction * _Density);

// using forward ray marching
// --------------------------
for (int i = 0; i < steps; i++)
{
    // calculate the sample position
    // -----------------------------
    float t = t0 + stepSize * (i + 0.5);
    float3 samplePos = rayOrigin + rayDirection * t;
    
    // attenuate global transparency by each sample's transparency
    // -----------------------------------------------------------
    transparency *= sampleTransparency;

    // in-scattering of this sample
    // ----------------------------
    float lightAttenuation = exp(-distance(samplePos, lightPos) * extinction * _Density);
    float3 inScattering = lightAttenuation * lightColor * stepSize * _Scatter * _Density;

    // add in-scattering to the result
    // -------------------------------
    result += inScattering * transparency;
}
```
{: add-lines="1, 18-19"}

---

#### The Phase Function

我们先来回顾一下内散射的计算公式如下：


$$
Li(x,\omega)=\sigma_s\int_{S^2}p(x, \omega, \omega')L(x, \omega')d\omega'
$$


其中，$x$表示采样点的位置，$\omega$表示观察方向，也就是步进算法中的射线方向，$\omega'$表示光线方向，$L(x, \omega')$表示光源原本的贡献值。此外，与常规的物体渲染不同，我们需要在整个球形上进行积分。

与此对应的，我们的代码实现为：

```glsl
float lightAttenuation = exp(-distance(samplePos, lightPos) * extinction * _Density);
float3 inScattering = lightAttenuation * lightColor * stepSize * _Scatter * _Density;
```

可见我们在代码中并没有实现公式中的$p(x, \omega, \omega')$项。这一项被称为**相位函数**。

在**各向同性**的散射volume中，当光子与组成volume的粒子交互时，光子可以被散射到任意方向上。然而，大多数volume都倾向与在一个受限的方向范围内散射光线。我们将这种性质称为**各向异性**。相位函数用于描述散射光线的角度分布，在数学上返回了一个零到一之间的值。相位函数具有在其定义域上的积分必然为1的性质。

最简单的相位函数来自于均一volume：


$$
f_p(x, \theta) = \frac{1}{4\pi}
$$


在渲染领域中，我们常用的各向异性的相位函数是**Henyey-Greenstein**函数：


$$
f_p(x, g, cos\theta)=\frac{1}{4\pi}\frac{1-g^2}{(1+g^2-2gcos\theta)^{3/2}}
$$


其中，$g$被称为**asymmetry factor**，范围为$[-1, 1]$：

- 当$g>0$，绝大多数光线会向前散射
- 当$g<0$，绝大多数光线会向后散射
- 当$g = 0$时，**Henyey-Greenstein**函数则等价于$1/4\pi$，也就是各向同性的相位函数

![](voldev-phasefuncplot.png)

---

#### Jittering the Sample Positions



