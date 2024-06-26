---
title: The Vec3 Class
date: 2024-06-26 08:00 +0800
categories: [Graphics, Ray Tracing In One Weekend]
tags: [光线追踪, 离线渲染]
media_subpath: /assets/img/Graphics/RayTracingBookSeries/
---

几乎所有的图形程序都有一些类用于存储向量与颜色。在很多系统中，这些向量是4维的，对于位置向量来说，这包括三维空间中的位置以及一个齐次坐标，对于颜色向量来说，包括RGB颜色以及alpha透明值。对于我们的渲染器来说，三维向量就足够了。我们将会使用同一个`vec3`类用于表示颜色、位置、方向、偏移量等。同时，我们还会声明两个别名：`point3`和`color`。

我们将这个类的定义放在`vec3.h`头文件中。同时我们也会定义一些有用的向量函数：

```c++
#ifndef VEC3_H
#define VEC3_H

#include <cmath>
#include <iostream>

using std::sqrt;

class vec3;
using point3 = vec3;

class vec3
{
    public:
    double e[3];

    vec3(): e {0, 0, 0} {}
    vec3(double e0, double e1, double e2): e{e0, e1, e2} {}

    double x() const {return e[0];}
    double y() const {return e[1];}
    double z() const {return e[2];}

    vec3 operator- () const {return vec3(-e[0], -e[1], -e[2]);}
    double operator[] (int i) const {return e[i];}
    double& operator[] (int i) {return e[i];}

    vec3& operator+= (const vec3& v)
    {
        e[0] += v.e[0];
        e[1] += v.e[1];
        e[2] += v.e[2];
        return *this;
    }

    vec3& operator*= (double t)
    {
        e[0] *= t;
        e[1] *= t;
        e[2] *= t;
        return *this;
    }

    vec3 operator/= (double t)
    {
        return *this *= 1 / t;
    }

    double lengthSquared() const
    {
        return e[0] * e[0] + e[1] * e[1] + e[2] * e[2];
    }

    double length() const
    {
        return sqrt(lengthSquared());
    }
};

// VECTOR UTILITY FUNCTIONS
inline std::ostream& operator<< (std::ostream& out, const vec3& v)
{
    return out << v.e[0] << ' ' << v.e[1] << ' ' << v.e[2];
}

inline vec3 operator+ (const vec3& u, const vec3& v)
{
    return vec3(u.e[0] + v.e[0], u.e[1] + v.e[1], u.e[2] + v.e[2]);
}

inline vec3 operator- (const vec3& u, const vec3& v)
{
    return vec3(u.e[0] - v.e[0], u.e[1] - v.e[1], u.e[2] - v.e[2]);
}

inline vec3 operator* (const vec3& u, const vec3& v)
{
    return vec3(u.e[0] * v.e[0], u.e[1] * v.e[1], u.e[2] * v.e[2]);
}

inline vec3 operator* (double t, const vec3& v)
{
    return vec3(v.e[0] * t, v.e[1] * t, v.e[2] * t);
}

inline vec3 operator* (const vec3& v, double t)
{
    return t * v;
}

inline vec3 operator/ (const vec3& v, double t)
{
    return (1 / t) * v;
}

inline double dot(const vec3& u, const vec3& v) {
    return u.e[0] * v.e[0]
        + u.e[1] * v.e[1]
        + u.e[2] * v.e[2];
}

inline vec3 cross(const vec3& u, const vec3& v) {
    return vec3(u.e[1] * v.e[2] - u.e[2] * v.e[1],
                u.e[2] * v.e[0] - u.e[0] * v.e[2],
                u.e[0] * v.e[1] - u.e[1] * v.e[0]);
}

inline vec3 unitVectorLength(const vec3& v)
{
    return v / v.length();
}

#endif
```
{: file="main.cpp"}

### 3.1 Color Utility Functions

此外，我们创建一个`color.h`头文件，并定义一个utility函数，用于将单个像素的颜色写入standard output stream：

```c++
// color.h

#ifndef COLOR_H
#define COLOR_H

#include "vec3.h"

#include <iostream>

using color = vec3;

void writeColor(std::ostream& out, const color& pixelColor)
{
    double r = pixelColor.x();
    double g = pixelColor.y();
    double b = pixelColor.z();

    // translate [0, 1] component values to byte range[0, 255]
    int rByte = int(255.999 * r);
    int gByte = int(255.999 * g);
    int bByte = int(255.999 * b);

    // write out pixel color components
    out << rByte << ' ' << gByte << ' ' << bByte << '\n';
}

#endif
```
{: file="color.h"}

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