---
layout: page
permalink: /blogs/Graphics/LearnOpenGL/GettingStarted/CoordinateSystems/index.html
title: CoordinateSystems
---

### Coordinate Systems

---

之前在图形管线那里提到过，在vertex shader结束后，OpenGL期望所有可见的顶点都应该在NDC中，超出NDC范围的顶点都是不可见的。将坐标转换到NDC中是一个逐步的过程，物体的顶点经过多次转换为多个坐标系，最终转换为NDC，为什么不一次性转换完成呢？因为在某些坐标系下，运算会更简单。总的来说，有五个相对重要的坐标系：

- Object Space
- World Space
- View Space (Camera Space)
- Clip Space
- Screen Space

将坐标从一个空间转换到另一个空间，我们会使用数个矩阵变换，其中最重要的矩阵是model、view、projection。下图展示了顶点坐标从object space变换到screen space的过程。

![](files/coordinate_systems.png)

---

首先我们来讨论一下前三个较为简单的坐标系

**Local Space**是指物体所在的坐标空间，模型的所有顶点都是在local space中的

**World Space**中的坐标正如其名，是顶点相对于游戏世界原点的坐标。从local space转换到world space是由**model matrix**实现的。

**View Space**可以理解为OpenGL的摄像机，它是world space转换到玩家视野前方的坐标而产生的结果，说种说法就是，view space就是从摄像机视角所观察到的空间

---

**Clip Space**可以这样理解，OpenGL期望所有的坐标都可以落在一个特定的范围内，且任何在这个范围以外的点都会被clip掉，范围内的点就会变成屏幕上可见的fragment，这就是clip space命名的由来。为了把顶点坐标从view space变换到clip space，我们需要定义一个projection matrix，它在xyz每个维度上都指定了坐标范围，然后projection matrix会将范围内的坐标变换为NDC，范围以外的坐标则不会参与到映射至NDC的过程，所以会被裁剪掉。如果只是primitive的一部分超出了裁剪体积(clipping volume)，那么OpenGL会重构这个三角形为一个或者多个三角形，从而使其适合这个裁剪范围。

由投影矩阵所创建的viewing box被称为平截头体(Frustum)，所有在Frustum中的坐标最终都会出现在屏幕上。将特定范围的坐标变换到NDC的过程被称为**投影(Projection)**。

一旦所有的顶点都被变换到Clip Space中，OpenGL就会自行执行一个名为**透视除法(Perspective Division)**的操作。这个操作是将位置向量的x y z分量分别除以位置向量的齐次w分量，它能够让4D clip space中的坐标转换为3D的NDC。**透视除法会在vertex shader运行的最后被自动执行**。

这一阶段后，坐标会被`glViewport`映射到屏幕空间，并被转换为片段。

需要注意的是，projection matrix可以分为两种不同的形式，每种形式都定义了不同的frustum

---

**orthographic projection matrix**对应了一个类似正方体的平截头体。创建正交投影矩阵时，我们需要定义这个平截头体的宽、高、远近平面。正交视锥体直接将视锥体内的所有坐标映射到规范化设备坐标，没有任何特殊的副作用，因为它不会触及变换向量的w分量；如果w分量保持等于1.0，透视除法不会改变坐标。

![](files/orthographic_frustum.png)

我们可以用GLM的内置函数`glm::ortho`来创建一个正交投影矩阵

```c++
glm::ortho(0.0f, 800.0f, 0.0f, 600.0f, 0.1f, 100.0f);
```

前两个参数规定了视锥体的宽度(从左至右)，第三个第四个参数规定了视锥体的高度(从下至上)，最后两个参数定义了近平面和远平面。

正交投影会直接将坐标映射至屏幕，但是由于没有透视，会让画面少了一些真实感。

---

透视投影矩阵将一个给定的视锥体范围映射到clip space，同时也会操作每个顶点坐标的 w 值，使得一个顶点坐标离观察者越远，这个 w 组件就越大。一旦坐标被转换到裁剪空间，它们就在 -w 到 w 的范围内（任何超出此范围的部分都会被裁剪）。OpenGL要求可视坐标落在 -1.0 和 1.0 的范围内作为最终的顶点着色器输出，因此一旦坐标在裁剪空间内，透视除法就会应用于裁剪空间坐标：

简单来说，透视投影矩阵会将3D场景中的物体映射到2D空间，同时保留深度信息。这是通过修改物体的w坐标实现的，物体离观察者越远，w坐标就越大。最后，通过透视除法将裁剪空间中的坐标映射到设定的视口范围。这就让远离观察者的物体看起来更小，从而实现了3D的视觉效果。

我们可以用GLM的内置函数`glm::perspective`来创建一个正交投影矩阵

```c++
glm::mat4 proj = glm::perspective(glm::radians(45.0f), (float)width/(float)height, 0.1f, 100.0f);
```

`glm::perspective`创建了一个视锥体，第一个参数定了fov值，接下来我们计算viewport的宽高，从而定义了aspect ration，最后的两个参数与正交投影矩阵的创建一样，定义了近平面和远平面。

![](files/perspective_frustum.png)

---

我们依次创建出model、view、projection矩阵后，将一个顶点变换进clip space的步骤就是如下所示了
$$
Vclip=Mprojection⋅Mview⋅Mmodel⋅Vlocal
$$
在vertex shader中，我们将运算后的顶点位置传递给`gl_Position`，OpenGL会对clip space内的坐标执行透视除法，将其变换为NDC
