---
title: One Dimensional Monte Carlo Integration
date: 2024-07-01 17:43 +0800
categories: [Graphics, Ray Tracing The Rest of Life]
tags: [光线追踪, 离线渲染, Monte Carlo]
media_subpath: /assets/img/Graphics/RayTracingBookSeries/
math: true
---

> 我们要用两个章节的内容来讨论蒙特卡洛积分的相关知识

### 3.1 Expected Value

我们假设我们拥有以下所有条件：

1. a list of values $X$ that contains member $x_i$:

   $$
   X = (x_0, x_1, ..., x_{N-1})
   $$

2. a continous function $f(x)$ that takes members from the list:

   $$
   y_i = f(x_i)
   $$

3. a function $F(X)$ that takes the list $X$ as input and produces the list $Y$ as output:

   $$
   Y = F(X)
   $$

4. Where output list $Y$ has members $y_i$ :

   $$
   Y = (y_0, y_1, ..., y_{N-1}) = (f(x_0), f(x_1), ..., f(x_{N-1}))
   $$

有了上述这些条件，我们可以求得Y的算术平均值为：

$$
\displaylines{\operatorname{average}(Y) = E[Y] = \frac{1}{N} \sum_{i=0}^{N-1} y_i \\ = \frac{1}{N} \sum_{i=0}^{N-1} f(x_i) \\ = E[F(X)]}
$$


我们称$E[Y]$为$Y$的期望。

如果$x_i$的值是从一个连续区间$[a, b]$中随机选择的，那么我们有$a\le x_i \le b$对所有$i$成立，则$Y$的期望就可以近似为连续函数$f(x')$在连续区间$[a, b]$上的平均值，即：


$$
\displaylines{E[f(x') | a \leq x' \leq b] \approx E[F(X) | X =
        \{\small x_i | a \leq x_i \leq b \normalsize \} ] \\ \approx E[Y = \{\small y_i = f(x_i) | a \leq x_i \leq b \normalsize \} ] \\ \approx \frac{1}{N} \sum_{i=0}^{N-1} f(x_i)}
$$


如果我们将N作为采样数量，同时取N的极限为$\infty$，则我们可以得到：


$$
E[f(x') | a \leq x' \leq b]  = \lim_{N \to \infty} \frac{1}{N} \sum_{i=0}^{N-1} f(x_i)
$$


让我们总结一下，连续函数$f(x')$在连续区间$[a, b]$上的期望值可以通过区间上无限数量的随机点采样并求和来表示。当采样数量趋近$\infty$时，采样之和的平均数就趋近于正确的答案。这就是蒙特卡洛算法。

但随机点采样也不是计算某个区间上的期望值的唯一方法，实际上我们也可以自己选择采样点的位置。如果我们在连续区间$[a, b]$上有N个采样点，那么我们可以距离均等地采样：


$$
\displaylines{x_i=a + i\Delta x \\ \Delta x = \frac{b - a}{N}}
$$


然后我们代入到计算期望的公式中，可得：


$$
\displaylines{E[f(x') | a \leq x' \leq b] \approx \frac{1}{N} \sum_{i=0}^{N-1} f(x_i)
        \Big|_{x_i = a + i \Delta x} \\ E[f(x') | a \leq x' \leq b] \approx \frac{\Delta x}{b - a} \sum_{i=0}^{N-1} f(x_i)
        \Big|_{x_i = a + i \Delta x} \\ E[f(x') | a \leq x' \leq b] \approx \frac{1}{b - a} \sum_{i=0}^{N-1} f(x_i) \Delta x
        \Big|_{x_i = a + i \Delta x}}
$$


再次取N的极限为$\infty$，则我们可以得到：


$$
E[f(x') | a \leq x' \leq b] = \lim_{N \to \infty} \frac{1}{b - a} \sum_{i=0}^{N-1}
        f(x_i) \Delta x \Big|_{x_i = a + i \Delta x}
$$


实际上，这就是一个常规积分的形式：


$$
E[f(x') | a \leq x' \leq b] = \frac{1}{b - a} \int_{a}^{b} f(x) dx
$$


我们又知道，积分在几何上的意义可以是函数曲线下的面积：


$$
E[f(x) | a \leq x \leq b] = \frac{1}{b - a} \cdot \operatorname{area}(f(x), a, b)
$$


接下里我们再通过一个例子来加强我们的理解

### 3.2 Integrating $x^2$

我们先来看下面这个积分


$$
I = \int_{0}^{2} x^2 dx
$$


使用常规方法，我们可以计算出


$$
I = \frac{1}{3} (2^3 - 0^3) = \frac{8}{3}
$$


如果使用蒙特卡洛方法计算积分，则我们有：


$$
\displaylines{E[f(x) | a \leq x \leq b] = \frac{1}{b - a} \cdot \operatorname{area}(f(x), a, b) \\ \operatorname{average}(x^2, 0, 2) = \frac{1}{2 - 0} \cdot \operatorname{area}( x^2, 0, 2 ) \\ \operatorname{average}(x^2, 0, 2) = \frac{1}{2 - 0} \cdot I \\ I = 2 \cdot \operatorname{average}(x^2, 0, 2)}
$$


我们用代码完成近似值的计算：

```c++
#include "rayTracing.h"

#include <iostream>
#include <iomanip>
#include <math.h>
#include <stdlib.h>

int main()
{
    int a = 0;
    int b = 2;
    int N = 1000000;
    double sum = 0.0;
    for (int i = 0; i < N; i++)
    {
        double x = randomDouble(a, b);
        sum += x * x;
    }
    std::cout << std::fixed << std::setprecision(12);
    std::cout << "I = " << (b - a) * (sum / N) << '\n';
}
```

### 3.3 Density Function

我们在rayColor函数，虽然简单且优雅，但是有一个巨大的问题：场景中使用小光源会带来大量的噪点，也就是我们会在深色像素周围看到很亮的像素。这是因为我们当前的均匀采样方法，对这样的光源来说采样频率不够高。只有当光线散射到光源所在的方向上时，才会对光源采样。对于小光源和距离较远的光源来说，这种弊端会尤为显著。

对于这个问题，我们有一个简单粗暴的解决办法。对于任意一个给定的光线，我们通常从相机开始追踪，然后光线穿过场景，最后终止于光源。如果我们反过来，从光源开始追踪光线，然后穿过场景，最后终止于相机，这种情况下，光线在开始时会有很强的亮度，然后会在场景中的连续反弹中失去能量，当光线到达相机时，它会被各种表面的反射变暗和着色。如果，我们迫使光源射出的光线尽快地反弹到相机上，这种做法也就等同于我们想光源发送更多的随机采样。但是这种光线会由于缺少连续的反射而最终具有不正确的亮度，虽然可以解决黑色像素旁有明亮像素的问题，但是也会使得所有像素变量。

有没有改进的方法呢？我们可以通过降低这些采样的权重来消除这种不正确的亮度的光线的影响，从而调节过度采样。但是具体的做法是怎样的呢？这时候我们需要引入新的概念：密度函数与概率密度函数

我们可以将密度函数理解为直方图的一种连续的版本。下面是一个直方图的实例：

![](fig-3.03-histogram.jpg)

在直方图中，如果将每个条形的数值范围减少，则条形的数目会变多，同时每个条形所对应的频率也会降低。如果我们将条形的数量增加到无穷，则我们将会有无限数量个的频率为零的条形。为了解决这个问题，我们可以使用离散密度函数来代替离散函数的直方图，它们之间的区别在于，离散密度函数将Y轴上的值归一化为总数的百分比，也就是密度，而不再是每个条形的计数。从离散函数转换到离散密度函数很简单：


$$
\text{Density of Bin i} = \frac{\text{Number of items in Bin i}}
                                      {\text{Number of items total}}
$$


一旦我们有了离散密度函数，我们就可以通过将离散值变更为连续值的方法，将离散密度函数转换为连续密度函数：


$$
\text{Bin Density} = \frac{(\text{Fraction of trees between height }H\text{ and }H’)}
                            {(H-H’)}
$$


当我们想要知道某个树的高度时，我们可以构建一个概率函数，它能够告诉该树落在特定条形中的概率有多大：


$$
\text{Probability of Bin i} = \frac{\text{Number of items in Bin i}}
                                          {\text{Number of items total}}
$$


