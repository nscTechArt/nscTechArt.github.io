---
layout: page
permalink: /blogs/Graphics/LearnOpenGL/GettingStarted/Review/index.html
title: Review
---

### Review

---

恭喜，我们已经完成了**Getting Started**这一章节，现在我们已经可以在OpenGL中创建窗口、编译Shader、通过buffer objectsh或uniform来向shader传递vertex data、绘制物体、使用纹理、利用向量和矩阵创建一个带有摄像机的3D世界。

**Getting Started**涉及了繁多的概念，让我们再逐一回顾一下吧

- OpenGL：一个图形API的正式规范，定义了每个函数的布局和输出
- GLAD：一个扩展加载库，它为我们加载并设置所有OpenGL的函数指针，以便我们可以使用所有（现代）OpenGL的函数
- Viewport：渲染图形所使用的2D窗口
- Graphics Pipeline：图形管线，将顶点最终转换称为屏幕中一个或多个像素的过程
- Shader：显卡上执行图形管线步骤的小程序
- Vertex：表示一个点的数据集合
- Normalized Device Coordinates：在对clip coordinates进行透视除法之后，vertex所处的坐标系统。所有在NDC中位置在-1.0到1.0之间的顶点不会被丢弃或剪辑，并最终可见。
- Vertex Buffer Object：顶点缓冲对象，在GPU上分配内存并将所有vertex data存储起来供显卡使用的一类buffer object
- Vertex Array Object：存储buffer和vertex attribute状态信息
- Element Buffer Object：在GPU中存储索引，是实现索引绘制所需的一类buffer object
- Uniform：一种特殊类型的GLSL变量，它是全局的（着色器程序中的每个着色器都可以访问此uniform变量），只需要设置一次
- Texture Wrapping：定义了当纹理坐标超出范围（0，1）时，OpenGL如何对纹理进行采样的模式
- Texture Filtering：定义了指定OpenGL应如何从多个texel中对纹理进行取样的模式。这通常发生在放大纹理时
- Mipmaps：存储纹理的较小版本，根据到观察者的距离选择适当大小的版本
- Texture Units：通过绑定多个纹理到不同的纹理单元，允许单个着色器程序上有多个纹理。
- Local Space：物体初始的坐标空间，所有坐标都相对于物体的原点
- World Space：所有坐标都相对于世界原点
- View Space：所有坐标都从相机的视角进行观察
- Clip Space：所有坐标都从相机的视角考虑，但应用了投影。这是顶点坐标应该最终所在的空间，作为顶点着色器的输出。OpenGL会完成剩下的工作（裁剪/透视除法）
- Screen Space：坐标范围从0到屏幕宽度/高度
- LootAt：视图矩阵的一种特殊类型，它创建一个坐标系统，所有坐标都以某种方式进行旋转和平移，使得用户从特定位置查看固定目标
- Euler Angles：被定义为偏航、俯仰和滚动，这三个值让我们可以构造出任何3D方向向量
