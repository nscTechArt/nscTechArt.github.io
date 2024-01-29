---
layout: page
permalink: /blogs/Unity/SPR-Batcher/index.html
title: SRP Batcher
---

## SRP Batcher

批处理是**合并draw call**的过程，可以减少 CPU 和 GPU 之间的通信时间。最简单的方法是启用 SRP Batcher。不过，这只适用于兼容的着色器。

SRP 的批处理并不会减少draw call的数量，而使其更加精简。它将材质属性缓存在 GPU 上，因此无需每次draw call都发送这些属性。这样既减少了需要传输的数据量，也减少了 CPU 在每次绘制调用中需要做的工作。但这只有在着色器遵循严格的统一数据结构时才能奏效。

所有材质属性都必须在具体的内存缓冲区中定义，而不是在全局级别上定义。具体做法是将 _BaseColor 声明封装在带有 UnityPerMaterial 名称的 cbuffer 中。这与结构体声明类似，但必须以分号结束。它将 _BaseColor 放在一个特定的常量内存缓冲区(constant memory buffer)中，从而隔离了 _BaseColor 声明，但它仍可在全局级别访问。

```glsl
cbuffer UnityPerMaterial
{
	float4 _BaseColor;
};
```


但是，并非所有平台（如 OpenGL ES 2.0）都支持常量缓冲区，因此我们可以使用Core RP 库中的 CBUFFER_START 和 CBUFFER_END 宏来代替直接使用 cbuffer。第一个宏将缓冲区名称作为参数，就像函数一样。在这种情况下，我们会得到与之前完全相同的结果，只是 cbuffer 代码将不存在于不支持它的平台上。

```glsl
CBUFFER_START(UnityPerMaterial)
	float4 _BaseColor;
CBUFFER_END
```

