---
title: Unity中的空间变换
date: 2022-08-19 09:40 +0800
categories: [Unity, Rendering]
media_subpath: /assets/img/22-08-19/
tag: [Unity]
math: true
---



[Homogeneous Coordinates, Clip Space, and NDC | WebGPU | Carmen's Graphics Blog](https://carmencincotti.com/2022-05-02/homogeneous-coordinates-clip-space-ndc/)





Fragment Shader中的SV_POSITION包含的信息如下：

- XY：screen space position
- Z  :  raw depth / converted clip-space depth / depth buffer's value
- W : view space depth
