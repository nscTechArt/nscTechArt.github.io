---
title: Perlin Noise
date: 2024-06-29 17:02 +0800
categories: [Graphics, Ray Tracing The Next Week]
tags: [Ray Tracing]
media_subpath: /assets/img/Graphics/RayTracingBookSeries/
---

w

White noise的效果如下图所示：

![](img-2.06-white-noise.jpg)

而Perlin noise的效果则有些像模糊后的white  noise：

![](img-2.07-white-noise-blurred.jpg)

Perlin noise的一个重要特征是可重复性：只要输入的三维坐标不变，它返回的随机数就是固定的。Perlin Noise还有一个特征是使用的方法快速且复杂型相对较小，在本章节中我们将会实现自己的Perlin Noise类。

> 原博客中基本没有详细介绍Perlin Noise生成的思路，所以这篇博客主要是展示代码。我会在后续单独更新一篇文章，更深入地探讨相关内容。
>

### 5.1 Using Blocks of Random Numbers

如果我们尝试用随机数构成的三位数组平铺在空间中，我们会清楚地看到重复的样式：

![](img-2.08-tile-random.jpg)

所以我们还需要使用某种散列来扰乱它：

```c++
#ifndef PERLIN_H
#define PERLIN_H

#include "rayTracing.h"

class perlin
{
public:
    perlin()
    {
        randFloat = new double[pointCount];
        for (int i = 0; i < pointCount; i++)
        {
            randFloat[i] = randomZeroToOne();
        }

        permX = perlinGeneratePerm();
        permY = perlinGeneratePerm();
        permZ = perlinGeneratePerm();
    }

    ~perlin()
    {
        delete[] randFloat;
        delete[] permX;
        delete[] permY;
        delete[] permZ;
    }

    double noise(const point3& p) const
    {
        auto i = static_cast<int>(4 * p.x()) & 255;
        auto j = static_cast<int>(4 * p.y()) & 255;
        auto k = static_cast<int>(4 * p.z()) & 255;

        return randFloat[permX[i] ^ permY[j] ^ permZ[k]];
    }

private:
    static constexpr int pointCount = 256;
    double* randFloat;
    int* permX;
    int* permY;
    int* permZ;

    static int* perlinGeneratePerm()
    {
        auto p = new int[pointCount];

        for (int i = 0; i < pointCount; i++)
        {
            p[i] = i;
        }

        permute(p, pointCount);

        return p;
    }

    static void permute(int* p, int n)
    {
        for (int i = n - 1; i > 0; i--)
        {
            int target = randomInt(0, i);
            int temp = p[i];
            p[i] = p[target];
            p[target] = temp;
        }
    }
};

#endif

```
{: file="perlin.h"}

现在我们可以实现Perlin noise的纹理了：

```c++
#include "perlin.h"
#include "rtw_stb_image.h"

...

class noiseTexture final : public texture
{
public:
    noiseTexture() = default;

    color value(double u, double v, const point3& p) const override
    {
        return color(1, 1, 1) * noise.noise(p);
    }

private:
    perlin noise;
};
```
{: file="texture.h"}
{: add-lines="1, 6-18"}

我们创建一个测试场景来看看noise纹理的效果：

```c++
void perlinSpheres()
{
    hittableList world;

    auto perlinNoiseTexture = make_shared<noiseTexture>();
    world.add(make_shared<sphere>(point3(0,-1000,0), 1000, make_shared<lambertian>(perlinNoiseTexture)));
    world.add(make_shared<sphere>(point3(0,2,0), 2, make_shared<lambertian>(perlinNoiseTexture)));

    camera cam;

    cam.aspectRatio      = 16.0 / 9.0;
    cam.imageWidth       = 400;
    cam.samplesPerPixel = 100;
    cam.maxDepth         = 50;

    cam.verticalFOV = 20;
    cam.lookFrom = point3(13, 2, 3);
    cam.lookAt = point3(0, 0, 0);
    cam.viewUp = vec3(0,1,0);

    cam.defocusAngle = 0;

    cam.render(world);
}

int main()
{
    switch (4)
    {
        case 1: bouncingSphere(); break;
        case 2: checkeredSphere(); break;
        case 3: earth(); break;
        case 4: perlinSpheres(); break;
        default: ;
    }
}
```
{: file="main.cpp"}
{: add-lines="1-24, 28, 33"}

渲染中。。。

![](img-2.09-hash-random.png)

### 5.2 Smoothing out the Result

我们可以使用三线性插值来让当前的Perlin noise更加的平滑：

```c++
class perlin
{
public:
    ...

    double noise(const point3& p) const
    {
        double u = p.x() - floor(p.x());
        double v = p.y() - floor(p.y());
        double w = p.z() - floor(p.z());

        auto i = static_cast<int>(floor(p.x()));
        auto j = static_cast<int>(floor(p.y()));
        auto k = static_cast<int>(floor(p.z()));
        double c[2][2][2];

        for (int di=0; di < 2; di++)
            for (int dj=0; dj < 2; dj++)
                for (int dk=0; dk < 2; dk++)
                    c[di][dj][dk] = randFloat[
                        permX[i+di & 255] ^
                        permY[j+dj & 255] ^
                        permZ[k+dk & 255]
                    ];

        return trilinearInterp(c, u, v, w);
    }

private:
    ...

    static double trilinearInterp(double c[2][2][2], double u, double v, double w)
    {
        auto accum = 0.0;
        for (int i = 0; i < 2; i++)
        {
            for (int j = 0; j < 2; j++)
            {
                for (int k = 0; k < 2; k++)
                {
                    accum += (i * u + (1 - i) * (1 - u))
                          * (j * v + (1 - j) * (1 - v))
                          * (k * w + (1 - k) * (1 - w))
                          * c[i][j][k];
                }
            }
        }
        return accum;
    }
};
```
{: file="perlin.h"}
{: add-lines="6-27, 32-49" }

再次运行程序，渲染中。。。

![](img-2.10-perlin-trilerp.png)

### 5.3 Improvement with Hermitian Smoothing

我们可以看到noise纹理的平滑处理生效了，但是也会带来明显的网格状的瑕疵，其中有一些被称为Mach Band，是一种颜色线性插值带来的感知上的artifact。我们可以使用Hermite方法来改进：

```c++
class perlin (
  public:
    ...
    double noise(const point3& p) const {
        auto u = p.x() - floor(p.x());
        auto v = p.y() - floor(p.y());
        auto w = p.z() - floor(p.z());
        u = u*u*(3-2*u);
        v = v*v*(3-2*v);
        w = w*w*(3-2*w);

        auto i = int(floor(p.x()));
        auto j = int(floor(p.y()));
        auto k = int(floor(p.z()));
        ...
```
{: file="perlin.h"}
{: add-lines="8-10"}

### 5.4 Tweaking The Frequency

当前的所产生的效果还是无法满足我们的要求，我们可以通过缩放输入的point3来让Perlin noise纹理的变化更加快速：

```c++
class noiseTexture final : public texture
{
public:
    noiseTexture() = default;

    explicit noiseTexture(double scale) : scale(scale) {}

    color value(double u, double v, const point3& p) const override
    {
        return color(1, 1, 1) * noise.noise(scale * p);
    }

private:
    perlin noise;
    double scale;
};
```
{: file="texture.h"}
{: add-lines="6, 10, 15"}

然后，我们在测试场景中的噪音纹理的缩放值设置为4：

```c++
void perlinSpheres()
{
    hittableList world;

    auto perlinNoiseTexture = make_shared<noiseTexture>(4);
   	...
}
```
{: file="main.cpp"}
{: add-lines="5"}

渲染中。。。

![](img-2.12-perlin-hifreq.png)

### 5.5 Using Random Vectors on the Lattice Points

### 5.6 Introducing Turbulence

### 5.7 Adjusting the Phase