---
title: GPU-Driven Rendering
date: 2024-10-31 10:48 +0800
categories: [Engine, Evnia Engine Developing]
media_subpath: /assets/img/Engine/evnia/
math: false
---

在本篇博客中，我们会首先梳理应用程序段的网格体结构，将其划分为以“meshlets”命名的组，每个组包含最多64个三角形，并且为每个组构建一个单独的包围球。然后我们会使用compute shader执行剔除，并构建用于绘制meshlet的command队列。最后，我们会使用mesh shader完成对于meshlet的绘制。

传统上，我们会使用CPU来实行几何剔除。场景中的每个网格体通常会通过一个AABB来表示，进而可以结合相机的视锥体进行剔除。但是这种方法有一个明显的弊端，也就是随着场景复杂度的提升，剔除的耗时也会变长。此外，在CPU剔除中，我们也难以判断哪些物体是被遮挡occluded从而不需要绘制的。

而在GPU-Driven渲染管线中，我们可以利用GPU强大的并行处理能力进行视锥体剔除与遮挡剔除。

接下来，我们将会依次讨论这几个方面的内容：

- 将网格体划分为meshlets
- 通过task shader与mesh shader对meshlets进行背面剔除与视锥体剔除
- 使用compute shader进行遮挡剔除
- 使用indirect drawing完成绘制




---

### Breaking down large meshes into meshlets

在本小节中，我们关注的是渲染管线中的geometry阶段。geometry阶段可以划分为几个子阶段：

- input assembly
- vertex processing，这是开发者通过vertex shader、geometry shader、mesh shader、taskshader自行配置的阶段
- primitive assmbly



我们提供给渲染引擎的几何体具有各不相同的形状、大小与复杂度。从杂草、装饰物到山体、大型建筑，我们的渲染引擎需要能够处理各种类型的几何体。将几何体进行一定程度的拆分能够帮助我们剔除不可见的部分，但是有些较大的网格体仍然需要我们完整地处理，即使该网格体中只有一小部分是可见的。

Meshlets可以帮助我们解决这个问题，在GPU-Driven渲染管线中，每个网格体都会被划分为不同的顶点组，从而便于在GPU端处理。下图展示了将网格体拆分为meshlet的效果

![](B18395_06_01.webp)

Meshlets中的每组顶点会组成任意数量的三角形，但在实际操作中，我们会将根据硬件来调整三角形的数量值。Vulkan中，推荐的数量为126，具体可以参考[这篇](https://developer.nvidia.com/blog/introduction-turing-mesh-shaders/)来自英伟达的链接
