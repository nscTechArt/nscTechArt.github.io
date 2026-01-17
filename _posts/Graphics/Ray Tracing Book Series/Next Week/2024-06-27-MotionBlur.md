---
title: Motion Blur
date: 2024-06-27 15:48 +0800
categories: [Graphics, Ray Tracing The Next Week]
tags: [Ray Tracing]
media_subpath: /assets/img/Graphics/RayTracingBookSeries/
---

在真实世界的相机中，相机会在一个短暂的时间窗口内保持开启，而在这个时间段内，相机和场景中的物体都有可能处于运动状态。为了能够在渲染器中实现这一效果，我们需要计算在快门的时间窗口中，相机对于场景的感知的平均值。

### 2.1 思路

原博客的这一部分我认为解释的有些繁琐，所以我就不再翻译原文内容了，直接写一写思路与代码。

**实现运动模糊的思路很简单，光线追踪器在相机快门打开的时间窗口内随机选择不同的时间点射出光线，根据每个时间点，确定场景中的物体在对应时刻的位置，并计算光照。最后将随机时间点上的光线结果求平均值，得到最终的图像。**

这种思路能够综合物体在不同时间点上的位置与光照信息，所以可以实现自然的Motion Blur的效果。

我们可以思考一个简单的例子。假设快门的0到1秒的时间段内开启，物体在这个时间窗口中，从位置A移动到位置B。我们在0到1秒内随机选取多个时间点（例如0.1秒、0.3秒、0.5秒等），并在这些时间点上发射光线：

- 在0.1秒时，物体可能在A附近，光线记录此时的光照。
- 在0.3秒时，物体可能移动到某个中间位置，光线记录新的光照。
- 在0.5秒时，物体接近B，光线记录这个时间点的光照。

最终，将这些时间点上的光照结果组合起来，就能得到带有运动模糊效果的图像。

### 2.2 代码实现

我们将实现一个简单的运动模糊，也就是只渲染一帧，帧开始和结束的时间分别是0和1。

首先我们需要修改`ray`类，从而可以存储每条光线的确切时间：

```c++
class ray
{
public:
    ray() = default;

    ray(const point3& origin, const vec3& direction)
        : orig(origin), dir(direction), tm(0) {}
    ray(const point3& origin, const vec3& direction, double time)
        : orig(origin), dir(direction), tm(time) {}

    [[nodiscard]]
    const point3& origin() const {return orig;}

    [[nodiscard]]
    const vec3& direction() const {return dir;}

    [[nodiscard]]
    double time() const {return tm;}

    [[nodiscard]] point3 at(double t) const {return orig + dir * t;}

private:
    point3 orig;
    vec3 dir;
    double tm;
};
```
{: file="ray.h"}
{: add-lines="6-9, 17-18, 25"}

接下来，我们修改`camera`类，从而可以在特定时间段内的随机时刻上构建光线：

```c++
class camera
{
...
private:
    ...
    ray getRay(int i, int j) const
    {
        ...
        point3 rayOrigin = defocusAngle <= 0 ? center : apertureSample();
        vec3 rayDirection = randomSampleLocation - rayOrigin;
        double rayTime = randomZeroToOne();

        return {rayOrigin, rayDirection, rayTime};
    }

    ...
}
```
{: file="camera.h"}
{: add-lines="11, 13"}

现在我们来创建一个移动中的物体。我们可以修改`sphere`类，让球体的球心在帧开始时位于`intialCenter`，在帧结束时球体线性移动到`finalCenter`：

```c++
class sphere final : public hittable
{
public:
    // stationary sphere
    sphere(const point3& center, double radius, const shared_ptr<material>& material)
        : initialCenter(center), radius(fmax(0, radius)), material(material), isMoving(false) {}
    // moving sphere
    sphere(const point3& initialCenter, const point3& finalCenter, double radius, const shared_ptr<material>& material)
        : initialCenter(initialCenter), radius(fmax(0, radius)), material(material), isMoving(true)
    {
        centerVector = finalCenter - initialCenter;
    }

    ...
    
private:
    point3 initialCenter;
    double radius;
    shared_ptr<material> material;
    bool isMoving;
    vec3 centerVector;

    [[nodiscard]]
    point3 getSphereCurrenCenter(double time) const
    {
        // linearly interpolate from center1 to center2 according to time,
        // where t = 0 yields center1, and t = 1 yields center 2
        return initialCenter + time * centerVector;
    }
}
```
{: file="sphere.h"}
{: add-lines="4-12, 17, 20-21, 23-29"}

我们在`sphere:hit()`函数中判断球体是否会与给定光线发生相交，但是在运动模糊中，如果当前球体是在运动中的，则我们在判断是否相交之前，需要先根据当前时刻，计算出球体对应的确切位置：

```c++
class sphere final : public hittable
{
public:
    ...

    bool hit(const ray& r, interval tInterval, hitInfo& info)
    const override
    {
        point3 currentCenter = isMoving ? getSphereCurrenCenter(r.time()) : initialCenter;
        vec3 oc = currentCenter - r.origin();
        double a = dot(r.direction(), r.direction());
        double h = dot(r.direction(), oc);
        double c = dot(oc, oc) - radius * radius;
		
        ...
    }
	
	...
}
```
{: file="sphere.h"}
{: add-lines="9, 10"}

现在，我们的光线已经有了`time`这个新的属性，我们还需要修改`material::scatter()`，因为这个函数中调用了`ray`的构造函数，我们需要在函数调用提供足够的参数：

```c++
rayScattered = ray(info.position, direction);
rayScattered = ray(info.position, direction, rayIncoming.time());
```
{: file="materia.h"}
{: add-lines="2"}
{: remove-lines="1"}

终于，我们可以看看修改测试场景来看看运动模糊的效果了。简单起见，我们让所有的漫反射球体处于运动状态：

```c++
int main() {

    // World-------------------------------------------------------------------------------------
    hittableList world;

    // ground
    auto groundMaterial = make_shared<lambertian>(color(0.5, 0.5, 0.5));
    world.add(make_shared<sphere>(point3(0,-1000,0), 1000, groundMaterial));

    for (int a = -11; a < 11; a++) {
        for (int b = -11; b < 11; b++) {
            auto randomPossibility = randomZeroToOne();
            point3 center(a + 0.9 * randomZeroToOne(), 0.2, b + 0.9 * randomZeroToOne());

            if ((center - point3(4, 0.2, 0)).length() > 0.9) {
                shared_ptr<material> sphereMaterial;

                if (randomPossibility < 0.8) {
                    // diffuse
                    color albedo = color::randomUnitVector() * color::randomUnitVector();
                    sphereMaterial = make_shared<lambertian>(albedo);
                    point3 finalCenter = center + vec3(0, randomMinToMax(0, 0.5), 0);
                    world.add(make_shared<sphere>(center, finalCenter, 0.2, sphereMaterial));
                }
                else if (randomPossibility < 0.95) {
                    // metal
                    color albedo = color::randomVector(0.5, 1);
                    double fuzz = randomMinToMax(0, 0.5);
                    sphereMaterial = make_shared<metal>(albedo, fuzz);
                    world.add(make_shared<sphere>(center, 0.2, sphereMaterial));
                } else {
                    // glass
                    sphereMaterial = make_shared<dielectric>(1.5);
                    world.add(make_shared<sphere>(center, 0.2, sphereMaterial));
                }
            }
        }
    }

    // some big spheres
    auto material1 = make_shared<dielectric>(1.5);
    world.add(make_shared<sphere>(point3(0, 1, 0), 1.0, material1));
    auto material2 = make_shared<lambertian>(color(0.4, 0.2, 0.1));
    world.add(make_shared<sphere>(point3(-4, 1, 0), 1.0, material2));
    auto material3 = make_shared<metal>(color(0.7, 0.6, 0.5), 0.0);
    world.add(make_shared<sphere>(point3(4, 1, 0), 1.0, material3));


    // Render-------------------------------------------------------------------------------------
    camera cam;

    cam.aspectRatio      = 16.0 / 9.0;
    cam.imageWidth       = 400;
    cam.samplesPerPixel = 100;
    cam.maxDepth         = 50;

    cam.verticalFOV = 20;
    cam.lookFrom = point3(13,2,3);
    cam.lookAt = point3(0,0,0);
    cam.viewUp = vec3(0,1,0);

    cam.defocusAngle = 0.6;
    cam.focusDistance = 10.0;

    cam.render(world);
}
```
{: file="main.cpp"}
{: add-lines="22-23"}

渲染中。。。

![](img-2.01-bouncing-spheres.png)