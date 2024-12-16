---
title: Defocus Blur
date: 2024-06-27 09:42 +0800
categories: [Graphics, Ray Tracing In One Weekend]
tags: [Ray Tracing]
media_subpath: /assets/img/Graphics/RayTracingBookSeries/
---

Defocus Blur有一个更熟悉的说法，景深。

实现景深的思路相对来说很简单，我们只需要修改相机的模型即可，这主要涉及到相机的两个参数：

- 焦距距离（Focus Distance）：指定一个距离，在这个距离上的物体会清晰对焦
- 光圈大小（Aperture Size）：控制模糊的程度，光圈越大，则模糊越明显

### 13.1 Generating Sample Rays

在没有散焦模糊的情况下，所有光线来自相机中心。为了实现散焦模糊，我们构建一个以相机为中心的圆作为相机的光圈。同时，光圈的大小应该作为相机的一个参数。

我们将从光圈中随机选择光线的起点，这需要一个新的函数来执行这个操作。思路与`vec3::randomVectorOnUnitSphere()`类似，只是这次转换到了二维平面上：

```c++
...

inline vec3 unitVectorLength(const vec3& v) {...}

inline vec3 randomVectorOnUnitDisk()
{
    while (true)
    {
        if (point3 p = vec3(randomMinToMax(-1, 1), randomMinToMax(-1, 1), 0);
            p.lengthSquared() < 1)
        {
            return p;
        }
    }
}
```
{: file="vec3.h"}

现在，我们可以再次重构`camera`类了，需要留意的是，我们使用角度值来表示光圈的大小，而非直接定义光圈的半径：

```c++
class camera
{
public:
    ...

    double defocusAngle = 0;
    double focusDistance = 10;  // distance from camera lookFrom point to plane of perfect focus

    ...

private:
    ...
    vec3 u, v, w;                 // camera basis vectors
    vec3 apertureU;               // defocus disk horizontal radius
    vec3 apertureV;               // defocus disk vertical radius

    void initialize()
    {
        imageHeight = static_cast<int> (imageWidth / aspectRatio);
        imageHeight = imageHeight < 1 ? 1 : imageHeight;

        sampleScaleFactor = 1.0 / samplesPerPixel;

        center = lookFrom;

        // determine viewport dimensions
        double focalLength = (lookFrom - lookAt).length();
        double theta = degreesToRadians(verticalFOV);
        double h = tan(theta / 2);
        double viewportHeight = 2 * h * focusDistance;
        double viewportWidth = static_cast<double>(imageWidth) / imageHeight * viewportHeight;

        // calculate the u, v, w unit basis vectors for the camera current position
        w = unitVectorLength(lookFrom - lookAt);
        u = unitVectorLength(cross(viewUp, w));
        v = cross(w, u);

        // calculate the vectors across the horizontal and vertical viewport edges
        vec3 viewportU = viewportWidth * u;
        vec3 viewportV = viewportHeight * -v;

        // Calculate the horizontal and vertical delta vectors from pixel to pixel
        pixelDeltaU = viewportU / imageWidth;
        pixelDeltaV = viewportV / imageHeight;

        // calculate the location of the upper left pixel
        point3 viewportUpperLeft = center - focusDistance * w - viewportU / 2 - viewportV / 2;
        firstPixelLocation = viewportUpperLeft + 0.5 * (pixelDeltaU + pixelDeltaV);

        // calculate the camera defocus disk basis vectors
        double apertureRadius = focusDistance * tan(degreesToRadians(defocusAngle / 2));
        apertureU = u * apertureRadius;
        apertureV = v * apertureRadius;
    }

    [[nodiscard]]
    ray getRay(int i, int j) const
    {
        // construct a camera ray originating from the aperture and
        // directed at random sampled point around the pixel location i, j
        vec3 offset = sampleFromSquare();
        point3 randomSampleLocation =
            firstPixelLocation + (i + offset.x()) * pixelDeltaU + (j + offset.y()) * pixelDeltaV;
        point3 rayOrigin = defocusAngle <= 0 ? center : apertureSample();
        vec3 rayDirection = randomSampleLocation - rayOrigin;
        return {rayOrigin, rayDirection};
    }

    [[nodiscard]]
    static vec3 sampleFromSquare() {...}

    [[nodiscard]]
    point3 apertureSample() const
    {
        // returns a random point in the camera aperture
        point3 p = randomVectorOnUnitDisk();
        return center + (p[0] * apertureU + p[1] * apertureV);
    }

    [[nodiscard]]
    static color rayColor(const ray& rayIncoming, int depth, const hittable& world) {...}

};
```
{: file="camera.h"}
{: add-lines="6-7, 14-15, 29, 46,  49-53,  58, 64-65, 71-77 "}
{: remove-lines="27"}

最后，我们将测试场景中的相机的光圈调大一些：

```c++
cam.defocusAngle = 10.0;
cam.focusDistance = 3.4;
```

{: file="main.cpp"}
{: add-lines="1-2"}

渲染中。。。

![](img-1.22-depth-of-field.png)