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

**分析一个数据的意义和作用，最好的办法就是看这个数据在哪里被定义，在何处被使用。**

首先来看`Light`，它的前两个很好理解，就不再说明了，主要是`attenuation`，我最开始以为这个值是像点光源那样，照射亮度和阴影强度会随着光源的距离变大而衰减，但是按照我目前的理解，`attenuation`表示被投影片段的颜色会因为受到阴影而衰减。

我理解的根据来自`Lighting.hlsl`中的`IncomingLight()`，这个方法本身是用来计算给定surface和light下的入射光量，结果受光线颜色的影响。在这个方法里，`attenuation`被纳入到了计算过程中。

```glsl
float3 IncomingLight(Surface surface, Light light)
{
	return saturate(dot(surface.normal, light.direction) * light.attenuation) * light.color;
}
```

可以这么说，之所以定义出`ShadowData`和`DirectionalShadowData`，就是为了计算`light.attenuation`。那`light.attenuation`又是怎样被计算出来的呢？概括来说，是将片段的位置转换到shadow texture space，然后作为uv在shadow map中采样。只不过因为我们使用的是级联阴影，采样需要明确采样的是哪个tile，转换片段的坐标需要则需要对应的矩阵，这个矩阵是我们在管线中计算好的，存在了一组矩阵数组中，我们通过`directionalShadowData.tileIndex`来告诉shader使用哪个矩阵为片段转换，从而明确了是哪个tile。采样完成后，就得到了灯光对应当前片段的衰减值，但是每个灯光可能会有对应的shadowStrength，该值是我们在unity编辑器中设置的，当然我们也在管线中将这个值传给了GPU，就是`directionalShadowData.strength`。

我们明确了`light.attenuation`的计算过程后，再来分析一下`directionalShadowData`是如何配置的。我们知道，atlas会根据场景中投影灯光的数量分为数个tile，每个tile对应一个投影平行光。但是根据级联阴影的原理，我们知道每个灯光又会根据级联的数量渲染多次，数次渲染的结果会再次分割tile存储，这就是`shadowData.cascadeIndex`的作用。另外，级联阴影中，每个级联所对应的阴影强度通常是渐变的，也就是越靠近max shadow distance，阴影的强度越弱，直至为0，这个强度是相对全局的，不与灯光相关，所以我们要将这个值纳入单个灯光阴影强度的配置，这就是`shadowData.strength`的作用。以上分析可以结合源码来理解。

```glsl
DirectionalShadowData GetDirectionalShadowData(int lightIndex, ShadowData shadowData)
{
    DirectionalShadowData data;
    data.strength = _DirectionalLightShadowData[lightIndex].x * shadowData.strength;
    data.tileIndex = _DirectionalLightShadowData[lightIndex].y + shadowData.cascadeIndex;
    return data;
}
```

---

##### 总结

```glsl
// Shadows.hlsl
struct ShadowData
{
	int cascadeIndex; // 单个投影平行光的级联索引，与采样shadow tile相关
	float strength;   // 级联阴影带来的全局阴影强度
}

struct DirectionalShadowData
{
    int tileIndex;    // 确定单个投影平行光采样atlas的哪个tile
    float strength;	  // unity编辑器中灯光shadow strength与当前级联的阴影强度相乘的结果
};
   
// Light.hlsl
struct Light
{
    float3 color;    
    float3 direction; 
    float attenuation; //被投影片段的颜色会因为受到阴影而带来的衰减值
};
```