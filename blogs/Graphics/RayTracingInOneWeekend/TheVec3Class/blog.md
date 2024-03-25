---
layout: page
permalink: /blogs/Graphics/RayTracingInOneWeekend/TheVec3Class/index.html
title: The Vec3 Class
---

## The Vec3 Class

几乎所有图形程序都有一些用来存储几何向量和颜色的类。在很多系统中，向量是四维的，除了存储位置坐标和RGB颜色值以外，还有有一个额外的分量来存储齐次坐标或者alpha值。不过对我们这个系列博客来说，三个坐标就足够了。

我们将使用同一个类`vec3`来表示颜色、位置、方向、偏移量等等。同时，我们还会为`vec3`声明两个别名，`point3`和`color`。

我们将在*vec3.h*头文件中定义`vec3`，同时也会定义一下Helper Functions：

```c++
#ifndef VEC3_H
#define VEC3_H

#include <cmath>
#include <iostream>

using std::sqrt;

class vec3
{
public:
    double e[3];
    
    vec3(): e{0, 0, 0} {}
}
```

