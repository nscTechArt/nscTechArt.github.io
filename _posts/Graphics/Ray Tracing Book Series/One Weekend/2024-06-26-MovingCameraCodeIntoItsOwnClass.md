---
title: Moving Camera Code Into Its Own Class
date: 2024-06-26 10:35 +0800
categories: [Graphics, Ray Tracing In One Weekend]
tags: [Ray Tracing]
---

因为相机是渲染器的一个重要组成模块，我们有必要将其抽象到一个单独的类中。`camera`类主要负责两个任务：

- 构建并向场景中散布光线
- 使用光线的计算结果渲染图像

我们把这两个任务分别放在函数`private initialize()`和`public render()`中， 同时，在相机的重构中，我们可以将此前在`main.cpp`中的函数`ray_color()`包含起来，因为它属于渲染图像的一部分。

当我们构建好`camera`类后，`main`函数将会得到极大的简化，我们只需要创建摄像机并设置默认值，再调用相机的`render()`函数，再执行相机的渲染循环即可。

`camera`类的框架如下：

```c++
#ifndef CAMERA_H
#define CAMERA_H

#include "rayTracing.h"
#include "hittable.h"

class camera
{
public:
    // public camera parameters below

    void render(const hittable& world) {...}
    
private:
    // private camera variables below

    void initialize() {...}

    color ray_color (const ray& r, const hittable& world) const {...}
};

#endif
```
{: file="camera.h"}

然后，我们可以将`main`函数中场景构建以外的代码都放进`camera`类了。下面是完整的`camera`类：

```c++
#ifndef CAMERA_H
#define CAMERA_H

#include "rayTracing.h"

#include "hittable.h"

class camera
{
public:
    double aspectRatio = 1.0; // ratio of image width over height
    int imageWidth = 100; // rendered image width in pixel count

    void render(const hittable& world)
    {
        initialize();

        std::cout << "P3\n" << imageWidth << ' ' << imageHeight << "\n255\n";

        for (int j = 0; j < imageHeight; j++)
        {
            std::clog << "rScanlines remaining: " << (imageHeight - j) << "\n" << std::flush;

            for (int i = 0; i < imageWidth; i++)
            {
                point3 pixelCenter = firstPixelLocation + (i * pixelDeltaU) + (j * pixelDeltaV);
                vec3 rayDirection = pixelCenter - center;
                ray r = ray(center, rayDirection);

                color pixelColor = rayColor(r, world);
                writeColor(std::cout, pixelColor);
            }
        }

        std::clog << "rDone.              \n";
    }

private:
    int imageHeight = 1; // rendered image height in pixel count
    point3 center;    // camera center
    point3 firstPixelLocation; // location of pixel 0, 0
    vec3 pixelDeltaU; // offset to pixel to the right
    vec3 pixelDeltaV; // offset to pixel below

    void initialize()
    {
        imageHeight = static_cast<int> (imageWidth / aspectRatio);
        imageHeight = imageHeight < 1 ? 1 : imageHeight;

        center = point3(0, 0, 0);

        // determine viewport dimensions
        double focalLength = 1;
        double viewportHeight = 2.0;
        double viewportWidth = static_cast<double>(imageWidth) / imageHeight * viewportHeight;

        // calculate the vectors across the horizontal and vertical viewport edges
        vec3 viewportU = vec3(viewportWidth, 0, 0);
        vec3 viewportV = vec3(0, -viewportHeight, 0);

        // // Calculate the horizontal and vertical delta vectors from pixel to pixel
        pixelDeltaU = viewportU / imageWidth;
        pixelDeltaV = viewportV / imageHeight;

        // calculate the location of the upper left pixel
        point3 viewportUpperLeft = center - vec3(0, 0, focalLength) - viewportU / 2 - viewportV / 2;
        firstPixelLocation = viewportUpperLeft + 0.5 * (pixelDeltaU + pixelDeltaV);
    }

    [[nodiscard]] static color rayColor(const ray& r, const hittable& world)
    {
        if (hitInfo info; world.hit(r, interval(0, infinity), info))
        {
            return (info.normal + vec3(1, 1, 1)) * 0.5;
        }

        // Background
        vec3 unitDirection = unitVectorLength(r.direction());
        double a = (unitDirection.y() + 1.0) * 0.5;
        return color(1.0, 1.0, 1.0) * (1.0 - a) + color(0.5, 0.7, 1.0) * a;
    }

};

#endif
```
{: file="camera.h"}

现在，我们的`main.cpp`文件已经很简洁了：

```c++
#include "rayTracing.h"

#include "camera.h"
#include "hittable.h"
#include "hittableList.h"
#include "sphere.h"

int main()
{
    // World-----------------------------------------------------------
    hittableList world;
    world.add(make_shared<sphere>(point3(0,0,-1), 0.5));
    world.add(make_shared<sphere>(point3(0,-100.5,-1), 100));

    // Render----------------------------------------------------------
    camera cam;
    cam.imageWidth = 400;
    cam.aspectRatio = 16.0 / 9.0;
    cam.render(world);
}
```
{: file="main.cpp"}