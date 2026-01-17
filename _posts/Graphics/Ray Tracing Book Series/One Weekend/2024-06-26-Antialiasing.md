---
title: Antialiasing
date: 2024-06-26 10:37 +0800
categories: [Graphics, Ray Tracing In One Weekend]
tags: [Ray Tracing]
media_subpath: /assets/img/Graphics/RayTracingBookSeries/
---

![](img-1.05-normals-sphere-ground.png)

我们当前的渲染结果中有明显的锯齿。当真实的相机拍照时，在物体边缘处通常不会有明显的锯齿，这是因为边缘的像素是与前景与背景在一定程度上混合的结果。而在渲染中，我们可以通过对每个像素的一些采样进行平均来获取相近的效果。

当前，相机构建出的光线会穿过每个像素的中心点，这种做法被称为点采样point sampling。要理解点采样的问题，我们可以想象要渲染一个远处的黑白棋盘，棋盘由8x8的黑白块组成， 但是只有四条光线会击中它，这些光线有可能只与黑色的块相交，也有可能只与白色的块相交，也可能是黑白之间的混合。在现实世界，这个棋盘在我们的眼中是灰色的，而非清晰的黑色与白色的点。这是因为眼睛会整合落在特定区域的光线，这也是我们希望在光线追踪器里实现的效果。

显然，反复采样穿过像素中心的光线并不会让锯齿消失，因为每次得到的结果都是相同的。我们需要做的是采样落在像素中心点周围的光线，然后对这些采样进行积分以近似出正确的连续的结果。

我们将采取最简单的实现方式：对以像素为中心的区域进行采样，该区域延伸到四个相邻像素的每一边的中点，如下图所示。这虽然不是最佳的方法，却是最为直观的

![](fig-1.08-pixel-samples.jpg)



### 8.1 Some Random Number Utilities

我们需要一个随机数生成器，用于返回范围为0<=n<1的随机实数。需要注意，范围并不包含1。同时我们也是实现一个用于返回给定范围内的随机数的函数：

```c++
#include <random>

...
    
inline double randomZeroToOne()
{
    // returns a random real number in [0, 1)
    static std::random_device rd;
    static std::mt19937 gen(rd());
    static std::uniform_real_distribution<> dis(0.0, 1.0);
    return dis(gen);
}

inline double randomMinToMax(double min, double max)
{
    // returns a random real number in [min, max)
    return min + (max - min) * randomZeroToOne();
}
```
{: file="rayTracing.h"}

### 8.2 Generating Pixels with Multiple Samples

我们会在覆盖像素的区域内多次采样，然后再计算颜色的平均值。在最终将颜色结果写入到standard ouput stream之前，我们需要将累加的颜色值除以采样数量。为了保证最终的结果保持在【0， 1】的正确范围内，我们还需要添加一个utility函数`interval::clamp(x)`

```c++
[[nodiscard]] double clamp(double x) const
{
    if (x < min) return min;
    if (x > max) return max;
    return x;
}
```
{: file="interval.h"}

下面是我们使用`interval::clamp(x)`的`write_color()`函数：

```c++
inline void writeColor(std::ostream& out, const color& pixelColor)
{
    double r = pixelColor.x();
    double g = pixelColor.y();
    double b = pixelColor.z();

    // translate [0, 1] component values to byte range[0, 255]
    static const interval intensity(0.000, 0.999);
    int rByte = static_cast<int>(256 * intensity.clamp(r));
    int gByte = static_cast<int>(256 * intensity.clamp(g));
    int bByte = static_cast<int>(256 * intensity.clamp(b));

    // write out pixel color components
    out << rByte << ' ' << gByte << ' ' << bByte << '\n';
}
```
{: file="color.h"}
{: add-lines="9-11"}


接下来，我们在`camera`类中定义并使用一个新的函数`camera::get_ray(i, j)`，用于为每个像素生成多个采样。这个函数需要用到一个新的utility函数`sample_square()`，用于在单位方形中生成一个随机采样点，随后我们将该随机采样点变换到我们当前正在采样的像素：

![](20240617101718.png)

在我们的测试场景中，我们将每个像素的随机采样数设置为100：

```c++
...
cam.samplesPerPixel = 100;
cam.render(world);
```
{: file="main.cpp"}



我们可以对比使用开锯齿技术前后的渲染效果：

![](img-1.06-antialias-before-after.png)
