---
layout: page
permalink: /blogs/Unity/SRP中的平行光阴影小结/index.html
title: SRP中的平行光阴影 小结
---

### SRP中的平行光阴影 小结

在SRP中自己实现平行光的阴影是一个很复杂的事情，我在读[Catlike的博客](https://catlikecoding.com/unity/tutorials/custom-srp/directional-shadows)时，往往要反复理解才能体会到其中的精妙。这篇小结我打算梳理一些我自己容易混淆的概念，希望日后回顾时能够发现曾经困惑的东西原来如此简单。

---

Shader中关于灯光与阴影的部分，出现了很多结构体，它们分布在各个hlsl文件中，有的结构体之间还会使用名字相同的字段，所以很有必要弄清楚它们究竟是什么用途。

```glsl
// Shadows.hlsl
struct ShadowData
{
	int cascadeIndex;
	float strength;
}

struct DirectionalShadowData
{
    int tileIndex;
    float strength;
};
   
// Light.hlsl
struct Light
{
    float3 color;
    float3 direction;
    float attenuation;
};
```

**分析一个数据z的意义和作用，最好的办法就是看这个数据在哪里被定义，在何处被使用。**

首先来看`Light`，它的前两个很好理解，就不再说明了，主要是`attenuation`，我最开始以为这个值是像点光源那样，照射亮度和阴影强度会随着光源的距离变大而衰减，但是按照我目前的理解，`attenuation`表示被投影片段的颜色会因为受到阴影而衰减。

我理解的根据来自`Lighting.hlsl`中的`IncomingLight()`，这个方法本身是用来计算给定surface和light下的入射光量，结果受光线颜色的影响。在这个方法里，`attenuation`被纳入到了计算过程中。

```glsl
float3 IncomingLight(Surface surface, Light light)
{
	return saturate(dot(surface.normal, light.direction) * light.attenuation) * light.color;
}
```

可以这么说，之所以定义出`ShadowData`和`DirectionalShadowData`，就是为了计算`light.attenuation`。那`light.attenuation`又是怎样被计算出来的呢？让我们把分散在各个hlsl文件中的相关联的代码都放在一起吧。

```glsl
Light GetDirectionalLight(int index, Surface surfaceWS, ShadowData shadowData)
{
    Light light;
    light.color = _DirectionalLightColors[index].rgb;
    light.direction = _DirectionalLightDirections[index].xyz;
    DirectionalShadowData dirShadowData = GetDirectionalShadowData(index, shadowData);
    light.attenuation = GetDirectionalShadowAttenuation(dirShadowData, surfaceWS);
    return light;
}
```

# 写不完了，先睡觉！