---
title: The Vec3 Class
date: 2024-06-26 08:00 +0800
categories: [Graphics, Ray Tracing In One Weekend]
tags: [Ray Tracing]
media_subpath: /assets/img/Graphics/RayTracingBookSeries/
---

几乎所有的图形程序都有一些类用于存储向量与颜色。在很多系统中，这些向量是4维的，对于位置向量来说，这包括三维空间中的位置以及一个齐次坐标，对于颜色向量来说，包括RGB颜色以及alpha透明值。对于我们的渲染器来说，三维向量就足够了。我们将会使用同一个`Vec3`类用于表示颜色、位置、方向、偏移量等。同时，我们还会声明两个别名：`Point3`和`Color`。

我们将这个类的定义放在`math.hpp`头文件中。同时我们也会定义一些有用的向量函数：

```c++
#pragma once

#include <pch.hpp>

namespace EngineCore
{
    // Vec3 class
    // ----------
    class Vec3
    {
    public:
        Vec3();
        Vec3(double e0, double e1, double e2);

        double x() const;
        double y() const;
        double z() const;

        Vec3    operator-() const;
        Vec3&   operator+=(const Vec3& v);
        Vec3&   operator*=(const double t);
        Vec3&   operator/=(const double t);
        double  operator[](int i) const;
        double& operator[](int i);

        double lengthSquared() const;
        double length() const;

    public:
        double e[3];
    };

    // vector utility functions
    // ------------------------
    inline std::ostream& operator<<(std::ostream& out, const Vec3& v)
    {
        return out << v.e[0] << ' ' << v.e[1] << ' ' << v.e[2];
    }

    inline Vec3 operator+(const Vec3& u, const Vec3& v)
    {
        return Vec3(u.e[0] + v.e[0], u.e[1] + v.e[1], u.e[2] + v.e[2]);
    }

    inline Vec3 operator-(const Vec3& u, const Vec3& v)
    {
        return Vec3(u.e[0] - v.e[0], u.e[1] - v.e[1], u.e[2] - v.e[2]);
    }

    inline Vec3 operator*(const Vec3& u, const Vec3& v)
    {
        return Vec3(u.e[0] * v.e[0], u.e[1] * v.e[1], u.e[2] * v.e[2]);
    }

    inline Vec3 operator*(double t, const Vec3& v)
    {
        return Vec3(t * v.e[0], t * v.e[1], t * v.e[2]);
    }

    inline Vec3 operator*(const Vec3& v, double t)
    {
        return t * v;
    }

    inline Vec3 operator/(Vec3 v, double t)
    {
        return (1 / t) * v;
    }

    inline double dot(const Vec3& u, const Vec3& v)
    {
        return u.e[0] * v.e[0] + u.e[1] * v.e[1] + u.e[2] * v.e[2];
    }

    inline Vec3 cross(const Vec3& u, const Vec3& v)
    {
        return Vec3(u.e[1] * v.e[2] - u.e[2] * v.e[1],
                    u.e[2] * v.e[0] - u.e[0] * v.e[2],
                    u.e[0] * v.e[1] - u.e[1] * v.e[0]);
    }

    inline Vec3 normalize(Vec3 v)
    {
        return v / v.length();
    }

}


```
{: file="math.hpp"}

---

### 3.1 Color Utility Functions

此外，我们创建一个`color.h`头文件，并定义一个utility函数，用于将单个像素的颜色写入standard output stream：

```c++
#pragma once

#include <engine/math.hpp>

namespace EngineCore
{
    using Color = Vec3;

    inline void writeColor(std::ostream& out, const Color& pixelColor)
    {
        auto r = pixelColor.x();
        auto g = pixelColor.y();
        auto b = pixelColor.z();

        // write the translated [0,255] value of each color component
        // ----------------------------------------------------------
        int byteR = int(255.999 * r);
        int byteG = int(255.999 * g);
        int byteB = int(255.999 * b);

        // write out to the ppm file
        // -------------------------
        out << byteR << ' ' << byteG << ' ' << byteB << '\n';
    }

}
```
{: file="color.hpp"}

现在，我们可以使用新的`vec3`类来修改我们`main`函数了：

```c++
#include <iostream>

#include "vec3.h"
#include "color.h"

int main()
{
    // Image
    int imageWidth = 256;
    int imageHeight = 256;

    // Render
    std::cout << "P3\n" << imageWidth << ' ' << imageHeight << "\n255\n";
    for (int j = 0; j < imageHeight; j++)
    {
        std::clog << "rScanlines remaining: " << (imageHeight - j) << ' ' << std::flush;

        for (int i = 0; i < imageWidth; i++)
        {
            double r = double(i) / (imageWidth - 1);
            double g = double(j) / (imageHeight - 1);

            int pixelR = int(255.999 * r);
            int pixelG = int (255.999 * g);
            std::cout << pixelR << ' ' << pixelG << ' ' << "0\n";

            vec3 currentPixelColor = vec3(r, g, 0);
            writeColor(std::cout, currentPixelColor);
        }
    }

    std::clog << "rDone.              \n";

    return 0;
}
```
{: file="main.cpp"}
{: add-lines="3-4, 27-28"}
{: remove-lines="23-25"}