---
title: URP中的抗锯齿算法
date: 2023-07-05 09:40 +0800
categories: [Unity, Rendering]
media_subpath: /assets/img/Unity/rendering
tag: [Unity, Anti-Aliasing]
math: true
---

### 0 Aliasing

在归纳各个抗锯齿算法之前，我们首先需要明白锯齿出现的原因：**连续的几何信号在离散的像素网格上的采样不足，导致高频细节信息丢失**，进而出现Aliasing。

具体来说，我们可以从两方面进行考虑：

- **采样率不足**
  - **渲染是对连续几何对象的离散化采样的过程**，而三角形的边缘、纹理的细节都属于连续几何
  - 当几何边缘的变化频率（斜边、曲线）超过了像素的采样率时，像素无法捕捉到这样的连续变换，就会呈现出阶梯状的锯齿
- **光栅化算法的局限性**
  - 在光栅化阶段，每个像素通过一个采样点来判断几何覆盖的情况，进而导致**亚像素细节的丢失**

于是，我们可以将抗锯齿的算法分为两类：

- **增加有效采样率**：SSAA
- 通过滤波或时域累积，**模糊/伪造高频信息**：FXAA、TAA

[Unity URP实现TAA - 知乎](https://zhuanlan.zhihu.com/p/650839828)

[主流抗锯齿方案详解（二）TAA - 知乎](https://zhuanlan.zhihu.com/p/425233743)

---

### 1 TAA

#### 1.1 子像素抖动

TAA的核心思想在于通过**多帧累积而覆盖到更多的子像素信息**，从而实现近似于SSAA的效果。所以，实现TAA算法的第一步就是获取子像素信息，具体来说，我们在每帧渲染时，**为摄像机的投影矩阵施加亚像素级别的偏移**，使得采样点能够在像素内不同位置抖动。

在构建投影矩阵的偏移时，我们通常选择Halton序列，原因可以归纳为以下几点：

- **低差异特性**
  - 其采样点在空间中的分布更加均匀
  - 在相同采样数下，能覆盖更多子像素区域
  - 减少因采样点分布不均导致的噪点或残留锯齿

- **时域累积效率高**
  - 每个采样点基于**互质基数**（如基数为2和3的二维序列），确保连续帧的抖动模式无周期性重复
  - 避免周期性抖动导致的重复性伪影（如固定模式闪烁）

而具体在URP中实现Jitter，则需要我们构建一个在渲染不透明物体之前执行的`RenderPass`，调用`cmd.SetViewProjectionMatrices()`，将Jitter值写入到投影矩阵的`m02`与`m12`中，剩余的步骤就可以交给MVP变换了。

#### 1.2 历史帧混合

现在， 我们可以构建起一个最基础的TAA框架了。首先，分配两个`RTHandle`，分别用于表示累积的历史帧与混合后的结果：

```c#
mResetHistoryFrames = RenderingUtils.ReAllocateIfNeeded(ref mHistoryAccumTexture, descriptor, FilterMode.Bilinear, TextureWrapMode.Clamp, name:kHistoryAccumTextureName);
        RenderingUtils.ReAllocateIfNeeded(ref mResultTexture, descriptor, FilterMode.Bilinear, TextureWrapMode.Clamp, name:kTAAResultTextureName);
```

这里，我们判定了`mHistoryAccumTexture`是否需要重分配，如果是，我们在进行历史帧混合时就需要排除掉废弃历史帧的影响。

在每一帧中，我们需要做三件事：

1. 将当前帧与历史帧进行混合，以实现TAA抗锯齿
2. 将混合结果保存，作为下一帧的历史帧
3. 输出混合结果

```c#
// do temporal anti-aliasing
Blitter.BlitCameraTexture(cmd, mSource, mResultTexture, mPassMaterial, 0);
// save history
Blitter.BlitCameraTexture(cmd, mResultTexture, mHistoryAccumTexture);
// copy result to destination
Blitter.BlitCameraTexture(cmd, mResultTexture, mDestination);
```

Shader中对应的代码为：

```glsl
half4 history = GetHistory(input.texcoord);
half4 source = GetSource(input.texcoord);

half4 color = source * _BlendFactor + history * (1 - _BlendFactor);
```

这样，对于一个完全静态的场景来说，TAA框架就已经成立了。

#### 1.3 重投影

在绝大多数情况下，场景都是动态的，此时当前帧的某个像素所对应的三维位置，**在历史帧中有可能映射到完全不同的屏幕坐标**，进而导致画面的失真，包括：

- **模糊**：颜色没有对齐，混合后边缘变模糊
- **鬼影**：历史残留颜色出现在错误的位置

所以，我们需要为TAA算法引入重投影，即通过运动信息将当前帧的像素**“追溯”到历史帧的正确位置**，从而确保多帧混合时颜色对齐。

在URP中，Unity将屏幕空间中两帧之间的偏移距离存储在了一个精度较高的纹理中，我们采样该纹理，进而就能获取到用于采样历史帧的正确UV。当然，我们也可以手动进行计算，也就是通过深度信息，将当前片段还原到世界空间中，再分别利用当前帧与上一帧中没有Jitter偏移的投影矩阵进行变换。相关代码在`Packages/com.unity.render-pipelines.universal/Shaders/CameraMotionVectors.shader`这个文件中。

此外，我们还需要考虑到镜头移动对于物体遮挡关系的影响。比方说，当镜头拉远时，原本被遮挡的物体会突然出现，这样的话，若当前像素实际属于一个近处物体，但因其自身Motion Vector可能指向远处物体（历史帧中未被遮挡的位置），直接使用会导致重投影到错误的历史颜色。所以，我们应该优先选择**当前可见物体**（即深度最近的物体）的运动向量，减少因遮挡/显露导致的重投影错误

#### 1.4 数据矫正

处于种种原因，
