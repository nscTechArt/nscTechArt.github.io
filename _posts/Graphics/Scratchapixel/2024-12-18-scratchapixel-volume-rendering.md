---
title: Volume Rendering
date: 2024-12-18 23:38 +0800
categories: [Graphics, Scratchpixel]
media_subpath: /assets/img/Graphics/Scratchapixel/
math: true
---

### 1 An Introduction to Volume Rendering

#### 1.1 Transmittance, Absorption, Particle Density, and Beer's Law

体积渲染围绕这样几个概念展开：

- **transmission、**
- **absorption，**
- **volume的不透明度与volume中粒子密度之间的关系**。

为了简单起见，我们暂时只讨论密度均匀的volume。

我们以下图为例，一个球形的volume放在一个红色的长方体前。当光线经红色的长方体反射并朝向眼睛运动过程中，部分光线会被**吸收**。

![](voldev-L0term1.png)

目前来说，我们首先关注于能够透射出光线的量，而我们通常将光线穿过volume而被吸收的能量称为**内部透射率，internal transmittance**。

当内部透射率的值为0时，表示光线完全被volume所遮挡；当内部透射率为1时，表示所有光线均可以从volume中完成透射。

Beer-Lambert定律就是一个计算透射率的公式。其中，密度这个概念是由吸收系数表示的（以及散射系数，我们会在后面讨论到）。吸收系数越高，则volume越不透明。Beer-Lambert定律的数学表达式如下：


$$
T = \exp(-\text{distance} \times \sigma_a) = e^{-\text{distance} \times \sigma_a}
$$

**Beer-Lambert定律表明，一个穿过volume的光线的内部透射率$T$，和volume的吸收系数$\sigma_a$与光线在volume中的传播距离的乘积之间存在指数关系。**

其中，吸收系数与散射系数的单位是长度的倒数。**我们可以将吸收系数与散射系数理解为，在给定距离/位置上，光子被吸收或被散射的概率。**

![](voldev-expfunction.png)

---

#### 1.2 Rendering a Volume Over a Uniform Background

我会在Unity中实现本篇博客所对应的代码。我们先来设置一个演示场景，场景中存在一个厚度与密度已知的volume，以及已知的背景色，那么根据我们已有的知识，不难计算出透过该volume所观察到的背景色：

```glsl
float3 backgroundColor = float3(0.5, 0.5, 0.5);
float absorption = 0.1;
float distance = 10;
float T = exp(-distance * absorption);
float3 backgroundColorThroughtVolume = T * backgroundColor;
```

---

#### 1.3 Scattering

目前为止，我们的讨论一直基于volume是黑色的这样的前提。在此前提下，volume对光线带来的影响只能体现在对于背景色的变暗上。然而，volume并不限于是黑色，与普通的物体一样，volume可以**反射**（更严谨地来说，是散射scatter）和**发出光线**。这也是为什么我们可以观察到天空中的白色的云朵。

现在，我们不妨假设volume自身的颜色值为`(yr, yg, yb)`（我们先暂时忽略volume自身的颜色值来自哪里这个问题）。那么我们的代码就变为了：

```c++
float3 backgroundColor = float3(0.5, 0.5, 0.5);
float3 volumeColor = float3(1.0, 0.0, 0.0);
float absorption = 0.1;
float distance = 10;
float T = exp(-distance * absorption);
float3 backgroundColorThroughtVolume = T * backgroundColor + (1 - T) * volumeColor;
```

我们可以将这个过程理解为alpha混合，用公式表示为：


$$
C = (1 - B.\text{transparency}) * A + B.\text{transparency} * B
$$

这里的透明度为1减去内部透射率，而B则是volume的颜色（被volume“反射”并进入眼睛的光线）。这里可能存在的误区是认为自发光应该直接加上去，而没有考虑到自发光在路径上的衰减。实际上，发射光在传播到眼睛的过程中，后面的介质部分会吸收这些光，因此每个点的发射贡献需要乘以该点到眼睛的透射率。所以说这种混合模式本质上是均匀介质下的积分结果。

---

#### 1.4 Rendering our First Volume Sphere

现在，我们可以在场景中绘制一个volume球体了。实现方式很简单，我们构建以相机为起点的射线，如果射线与球体没有相交，就直接返回背景色。如果存在交点，我们计算出两个交点的位置，就得到了光线在volume中的距离，并应用Beer-Lambert定律。

```glsl
half4 VolumeRenderingPassFragment(Varyings input) : SV_Target
{
    // initialize colors
    // -----------------
    const half3 backgroundColor = _BackgroundColor.rgb;
    const half3 volumeColor = _VolumeColor.rgb;
    half4 color = half4(0, 0, 0, 1);

    // ray-sphere intersection
	// -----------------------
    float3 positionWS = ReconstructionPositionWS(input.texcoord);
    float3 rayDirection = normalize(positionWS - _WorldSpaceCameraPos);
    float3 rayOrigin = _WorldSpaceCameraPos;
	float t0, t1;
	bool intersected = HitSphere(rayOrigin, rayDirection, t0, t1);

    // if no intersection, return background color
	// -------------------------------------------
	if (!intersected) color.rgb = backgroundColor;

	// beer-lambert law
	// ----------------
	else
	{
		float distance = t1 - t0;
		float transmission = exp(-distance * _Absorption);
		color.rgb = lerp(volumeColor, backgroundColor, transmission);
	}
	
    return color;
}
```

![](20241218183808.png)

在Unity中渲染得到的结果

---

#### 1.5 Let's Add Light! In-Scattering

目前我们已经有了一个volume构成的球体，那如何实现光照呢？如果我们用光源照射该体积，那么被照射到的部分理应变的更亮。

我们首先来回顾一下我们目前所了解的知识：当光子从光源发出，在volume中行进时，光子的强度会由于吸收而减弱。当光线穿过volume后，所剩余的能量可以通过Beer-Lambert定律计算得到，也就是说，如果我们已知光线在volume中穿过的距离，就能够计算出在该距离上光线的强度。

**一句话总结来说，Beer-Lambert定律揭示了光线在穿过volume过程中，能量会衰减。**

我们来考虑这样一种情况：光线沿着即有路线行进，在穿过volume过程中，其中的部分被吸收，而也有一部分光线会被散射，从而偏离了原本的路径。如果散射的方向与观察方向相反，那么这束光线对我们来说就是可见的。

当光线与组成volume的粒子发生碰撞时，存在两种情况**：光线被吸收**或者**光线被散射到任意方向**。

我们暂时不关注这两种情况所对应的概率，我们目前所关注的重点在于：如果光线的散射方向与观察方向相反，我们将这种情况称为**in-scattering**。规范地来说，**in-scattering描述了光线穿过volume时，由于散射而被重定向朝向眼睛/摄像机的情况。**如下图所示：

![](voldev-inscattering.png)

从图中可以看出，最终进入眼睛的光线是来自背景的光线与来自光源的被散射的光线的组合。由此，最终volume的成像由多个部分组成：

- 沿着视线方向穿过volume所观察到的背景色，这个颜色会因volume对于光线吸收而产生衰减
- 来自场景中各个光源以及各个方向的光线

对于第一个部分，我们已经讨论过了计算内部透射率的Beer定律。现在我们来考虑如何计算in-scattering。

计算in-scattering的难点在于，光线的散射可能发生在视线方向上的$[t_0, t_1]$的任何位置。在这段距离上，光线的吸收与散射是连续的，而非离散的。

在我们讨论解决方法之前，有必要先明确一下数学上的表述。我们定义$L_i(x, \omega)$为计算散射到眼睛的光量的函数，其中$x$表示$[t_0, t_1]$上的任意位置。如下图所示：

![](voldev-raymarching1.png)

所以，计算in-scattering意味着我们需要收集$[t_0, t_1]$之间、沿着方向$\omega$的光线所散射的所有能量。于是我们得到了这样的一个积分：


$$
\int_{x=t_0}^{t_1}Li(x, \omega)dx
$$

由于volume的形状是任意的，场景中的光源信息也是任意的，我们只能通过近似的方式求这个积分，也就是Ray-Marching算法。

现在，我们可以简述一下算法的流程了：

- 以每个分段的中点$x$为射线的起点，指向光源，我们可以计算出射线与volume相交的位置，这样我们就得到了光线在到达位置$x$时，在volume中行进的距离。
- 我们对该距离应用Beer-Lambert定律，就能够计算光源在这段距离中所损失的能量。

---

### 2 The Ray-Marching Algorithm

为了计算某个方向上的入射光的in-scattering，我们需要将光线所穿过的volume划分为若干个小的volume，并分别计算出贡献值，最终求和。如下图所示：

![](voldev-backward-raymarching.gif)

算法流程如下：

1. 求出$t_0$与$t_1$，也就是视线进入volume与离开volume的点。
2. 将$[t_0, t_1]$定义的线段划分为$X$个大小相同的较小线段，每段线段的长度为我们所定义的**step size**。
3. 以$t_0$或$t_1$沿为起点，沿着视线方向，步进$X$次。

4. 在每次步进中，我们构建一条射线，该射线以当前的采样点为原点，指向光源方向，并计算出射线与volume的交点，最终利用Beer定律计算出当前采样点的贡献值，即in-scattering的值。需要注意的是，根据黎曼和的定义，我们需要将得到的结果再乘以step size，也就是$dx$。
5. 我们也应当将光线穿过当前的步进距离，即**step size**而产生的衰减考虑在内。并使用这个衰减值乘以上一步得到的in-scattering值。
6. 最后，我们需要将所有的样本组合在一起，以考虑到它们对于volume整体不透明度与颜色的各自的贡献。从相机的角度来看，靠近$t_1$的样本会被靠近$t_0$而遮挡。将样本组合的方式可以分为两种，从$t_1$到$t_0$的顺序被称为**backward**，从$t_0$到$t_1$的顺序被称为**forward**

---

#### 2.1 Backward Ray-Marching

我们遵循从后向前的步进顺序，也就是将volume中位于$t_1$处的样本$X0$作为第一个样本，然后依次步进回到$t_0$。

由于我们要从volume对象的后方开始步进，我们可以将最终的颜色结果初始化为背景色，当我们完成对于volume颜色已经透明度的计算后，就可以叠加结果并输出了。

那么我们要如何计算这个每个样本的贡献值呢？我们首先来考虑第一个样本$X0$。

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
half4 VolumeRenderingPassFragment(Varyings input) : SV_Target
{
    // initialize colors
    // -----------------
    const half3 backgroundColor = _BackgroundColor.rgb;
    const half3 volumeColor = _VolumeColor.rgb;
	const float3 lightDirection = float3(0, 1, 0);
	const half3 lightColor = half3(1.3, 0.3, 0.9);

    // ray-sphere intersection
	// -----------------------
    float3 positionWS = ReconstructionPositionWS(input.texcoord);
    float3 rayDirection = normalize(positionWS - _WorldSpaceCameraPos);
    float3 rayOrigin = _WorldSpaceCameraPos;
	float t0, t1;
	bool intersected = HitSphere(rayOrigin, rayDirection, t0, t1);

    // if no intersection, return background color
	// -------------------------------------------
	if (!intersected) return float4(backgroundColor, 1);

	// configure ray marching
	// ----------------------
	float stepSize = 0.1;
	int numSteps = ceil(t1 - t0) / stepSize;
	stepSize = (t1 - t0) / numSteps;

	// initialize final result
	// -----------------------
	float transparency = 1;
	half3 result = 0;

	// start ray marching
	// ------------------
	float sampleTransparency = exp(-stepSize * _Absorption);
	for (int i = 0; i < numSteps; i++)
	{
		// calculate sample position
		// -------------------------
		float t = t1 - (i + 0.5) * stepSize;
		float3 pos = rayOrigin + t * rayDirection;

		// accumulate global transparency
		// ------------------------------
		transparency *= sampleTransparency;

		// calculate light in-scattering contribution to sample
		// ----------------------------------------------------
		float lightT0, lightT1;
		if (HitSphere(pos, lightDirection, lightT0, lightT1))
		{
			float3 lightAttenuation = exp(-lightT1 * _Absorption);
			result += lightColor * lightAttenuation * stepSize;
		}

		result *= sampleTransparency;
	}
	
    return half4(backgroundColor * transparency + result, 1);
}
```

![](20241218230552.png)

---

#### 2.2 Forward Ray-Marching

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
	// start ray marching
	// ------------------
	float sampleTransparency = exp(-stepSize * _Absorption);
	for (int i = 0; i < numSteps; i++)
	{
		// calculate sample position
		// -------------------------
		float t = t0 + (i + 0.5) * stepSize;
		float3 pos = rayOrigin + t * rayDirection;

		// accumulate global transparency
		// ------------------------------
		transparency *= sampleTransparency;

		// calculate light in-scattering contribution to sample
		// ----------------------------------------------------
		float lightT0, lightT1;
		if (HitSphere(pos, lightDirection, lightT0, lightT1))
		{
			float3 lightAttenuation = exp(-lightT1 * _Absorption);
			result += transparency * lightColor * lightAttenuation * stepSize;
		}
	}
```

两种方式得到的最终结果都是一样的。

---

#### 2.3 Why forward is "better" than backward

在前向步进中，当整体透明度非常接近零时，我们就可以停止步进，从而减少不必要的计算。

---

#### 2.4 Choosing the Step Size

我们使用光线步进来进行volume rendering，是因为能够较好对求出积分的近似。所以stepsize的选择是一种在性能与精确程度上的权衡。

目前我们假设volume的密度是均匀的，而在后续的内容中，密度能够随着空间或时间而变换。如果步长较大，就有可能无法捕捉到一些较小的频率特征，如下图所示（当然这是一个极端的示例）：

![](voldev-stepsizesmall.png)

另一种情况是阴影。当较小的物体在volume中投影时，也有可能因步长太大而损失对应的细节。如下图所示：

![](voldev-missshadow.png)

目前来说，一个较好的步长选择是相机射线与volume相交处的像素的投影大小，即

```c++
float projPixWidth = 2 * tanf(M_PI / 180 * fov / (2 * imageWidth)) * tmin;
```

其中，tmin是相机射线与volume相交处的距离。类似地，可以计算光线离开体时的投影像素宽度，并在`tmin`和`tmax`处对投影像素宽度进行线性插值，以便在沿着光线行进时设置步长。

---

### 3 Ray Marching: Getting it Right!

在前面的章节中，我们只考虑了光束与构成介质的粒子之间的两种相互作用类型：**吸收**和**内散射**。但是，为了得到准确的结果，我们应该考虑四种类型。我们可以将它们分为两类。一类是光束穿过介质到达眼睛的过程中减弱其能量的相互作用。另一类是有助于增加其能量的相互作用。

- 光束在通过volume传播到眼睛的过程中会因以下原因而**损失**能量：
  - absorption：光线的一部分能量被组成volume的粒子吸收
  - out-scattering：朝向眼睛传播的光在到达眼睛的途中也可能被散射出去
- 光束在通过volume传播到眼睛的过程中会因以下原因而**获得**能量：
  - emission
  - in-scattering：一些最初并非朝着眼睛传播的光由于散射而被重新定向朝着眼睛传播

![](voldev-interactions.png)

在我们目前的Unity实现中，光线损失的能量只考虑到了吸收这种情况。现在，我们可以将散射同样考虑在内，也就是在应用Beer定律时，将散射系数与吸收系数相加，用$\sigma_t$表示，称为**extinction coefficient**。

此外，考虑到内散射的贡献值与散射系数成正比，我们还需要将内散射乘以散射系数。

最终我们的代码如下：

```glsl
// calculate each sample's transmittance
// -------------------------------------
float sampleTransmittance = exp(-stepSize * (_Absorption + _Scatter));

// start forward-raymarching
// -------------------------
for (int i = 0; i < numSteps; i++)
{
    // calculate sample position
    // -------------------------
    float t = t0 + (i + 0.5) * stepSize;
    float3 samplePos = rayOrigin + t * rayDirection;

    // accumulate global transmittance
    // -------------------------------
    totalTransmittance *= sampleTransmittance;

    // in-scattering
    // -------------
    float lightT0, lightT1;
    if (HitSphere(samplePos, lightDirection, lightT0, lightT1))
    {
        // calculate light calculation
        // ---------------------------
        float3 lightAttenuation = exp(-lightT1 * (_Absorption + _Scatter));
        float3 lightContribution = lightColor * lightAttenuation;

        // accumulate light contribution
        // -----------------------------
        result += totalTransmittance * lightContribution * stepSize;
    }
}
```
---

#### 3.1 The Density Term

目前为止，我们使用散射与吸收系数用于控制volume的不透明程度，并且这两个系数在volume中是恒定的。我们将这种volume称为**homogenous participating medium**。在现实世界中，如云与烟通常具有非均一的密度，我们称之为**heterogeneous participating medium**。

我们可以定义一个**密度变量**，用于全局地缩放吸收与散射系数。

```glsl
	// calculate each sample's transmittance
	// -------------------------------------
	float extinction = (_Absorption + _Scatter) * _Density;
	float scatter = _Scatter * _Density;
	float sampleTransmittance = exp(-stepSize * extinction);
	
	// start forward-raymarching
	// -------------------------
	for (int i = 0; i < numSteps; i++)
	{
		// calculate sample position
		// -------------------------
		float t = t0 + (i + 0.5) * stepSize;
		float3 samplePos = rayOrigin + t * rayDirection;

		// accumulate global transmittance
		// -------------------------------
		totalTransmittance *= sampleTransmittance;

		// in-scattering
		// -------------
		float lightT0, lightT1;
		if (HitSphere(samplePos, lightDirection, lightT0, lightT1))
		{
			// calculate light calculation
			// ---------------------------
			float3 lightAttenuation = exp(-lightT1 * extinction);
			float3 lightContribution = lightColor * lightAttenuation;
			lightContribution *= scatter;

			// accumulate light contribution
			// -----------------------------
			result += totalTransmittance * lightContribution * stepSize;
		}
	}
```
---

#### 3.2 The Phase Function

我们先来回顾一下内散射的计算公式如下：


$$
Li(x,\omega)=\sigma_s\int_{S^2}p(x, \omega, \omega')L(x, \omega')d\omega'
$$


其中，$x$表示采样点的位置，$\omega$表示观察方向，也就是步进算法中的射线方向，$\omega'$表示光线方向，$L(x, \omega')$表示光源原本的贡献值。此外，与常规的物体渲染不同，我们需要在整个球形上进行积分。

但是，我们在代码中并没有实现公式中的$p(x, \omega, \omega')$项。这一项被称为**相位函数**。

在**各向同性**的散射volume中，当光子与组成volume的粒子交互时，光子可以被散射到任意方向上。然而，**大多数volume都倾向与在一个受限的方向范围内散射光线。**我们将这种性质称为**各向异性**。相位函数用于描述散射光线的角度分布，在数学上返回了一个零到一之间的值。**相位函数具有在其定义域上的积分必然为1的性质**。

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

#### 3.3 Jittering the Sample Positions



