---
title: A Scene Testing All New Features
date: 2024-07-01 11:27 +0800
categories: [Graphics, Ray Tracing The Next Week]
tags: [Ray Tracing]
media_subpath: /assets/img/Graphics/RayTracingBookSeries/
---

最后，我们创建一个新场景，用于展示*Ray Tracing The Next Week*中所添加的新特性：

```c++
...
    
void finalScene(int imageWidth, int samplesPerPixel, int maxDepth)
{
    hittableList boxes1;
    auto ground = make_shared<lambertian>(color(0.48, 0.83, 0.53));

    int boxes_per_side = 20;
    for (int i = 0; i < boxes_per_side; i++) {
        for (int j = 0; j < boxes_per_side; j++) {
            auto w = 100.0;
            auto x0 = -1000.0 + i*w;
            auto z0 = -1000.0 + j*w;
            auto y0 = 0.0;
            auto x1 = x0 + w;
            auto y1 = randomDouble(1,101);
            auto z1 = z0 + w;

            boxes1.add(box(point3(x0,y0,z0), point3(x1,y1,z1), ground));
        }
    }

    hittableList world;

    world.add(make_shared<bvhNode>(boxes1));

    auto light = make_shared<diffuseLight>(color(7, 7, 7));
    world.add(make_shared<quad>(point3(123,554,147), vec3(300,0,0), vec3(0,0,265), light));

    auto center1 = point3(400, 400, 200);
    auto center2 = center1 + vec3(30,0,0);
    auto sphere_material = make_shared<lambertian>(color(0.7, 0.3, 0.1));
    world.add(make_shared<sphere>(center1, center2, 50, sphere_material));

    world.add(make_shared<sphere>(point3(260, 150, 45), 50, make_shared<dielectric>(1.5)));
    world.add(make_shared<sphere>(
        point3(0, 150, 145), 50, make_shared<metal>(color(0.8, 0.8, 0.9), 1.0)
    ));

    auto boundary = make_shared<sphere>(point3(360,150,145), 70, make_shared<dielectric>(1.5));
    world.add(boundary);
    world.add(make_shared<constantVolume>(boundary, 0.2, color(0.2, 0.4, 0.9)));
    boundary = make_shared<sphere>(point3(0,0,0), 5000, make_shared<dielectric>(1.5));
    world.add(make_shared<constantVolume>(boundary, .0001, color(1,1,1)));

    auto emat = make_shared<lambertian>(make_shared<imageTexture>("../image/earthmap.jpg"));
    world.add(make_shared<sphere>(point3(400,200,400), 100, emat));
    auto pertext = make_shared<noiseTexture>(0.2);
    world.add(make_shared<sphere>(point3(220,280,300), 80, make_shared<lambertian>(pertext)));

    hittableList boxes2;
    auto white = make_shared<lambertian>(color(.73, .73, .73));
    int ns = 1000;
    for (int j = 0; j < ns; j++) {
        boxes2.add(make_shared<sphere>(point3::randomVector(0,165), 10, white));
    }

    world.add(make_shared<translate>(
        make_shared<rotateY>(
            make_shared<bvhNode>(boxes2), 15),
            vec3(-100,270,395)
        )
    );

    camera cam;

    cam.aspectRatio      = 1.0;
    cam.imageWidth       = imageWidth;
    cam.samplesPerPixel = samplesPerPixel;
    cam.maxDepth         = maxDepth;
    cam.background = color(0, 0, 0);

    cam.verticalFOV = 40;
    cam.lookFrom = point3(478, 278, -600);
    cam.lookAt = point3(278, 278, 0);
    cam.viewUp = vec3(0,1,0);

    cam.defocusAngle = 0;

    cam.render(world);

}

int main()
{
    switch (9)
    {
        case 1: bouncingSphere(); break;
        case 2: checkeredSphere(); break;
        case 3: earth(); break;
        case 4: perlinSpheres(); break;
        case 5: quads(); break;
        case 6: simpleLight(); break;
        case 7: cornellBox(); break;
        case 8: cornellBoxWithSmokes(); break;
        case 9: finalScene(800, 10000, 40); break;
        default: finalScene(400, 250, 4); break;
    }
}
```
{: file="main.cpp"}
{: add-lines="3-82, 86, 96-97"}

渲染中。。。

![](img-2.23-book2-final.jpg)
