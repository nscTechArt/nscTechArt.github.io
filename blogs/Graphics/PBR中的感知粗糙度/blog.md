---
layout: page
permalink: /blogs/Graphics/PBR中的感知粗糙度/index.html
title: PBR中的感知粗糙度
---

### PBR中的感知粗糙度

最近在学习Unity的过程中，发现Unity在计算BRDF的过程中，使用了感知粗糙度(PerceptualRoughness)这一概念，这篇博客记录我对这个概念的浅陋理解.  


**首先是总结：** 

**在实践中，照亮模型时，粗糙度的感知变化往往不是线性的，特别是在粗糙度较低（即材料较光滑）时。所以，使用perceptualRoughness替代物理粗糙度，可以让材质在视觉上表达更贴近真实世界。** 

**例如，光滑度为0.5的情况下，虽然从数值的角度来说，粗糙度会介于1和0中间，但是实际上需要粗糙度为Sqrt(0.5)=0.707才能达到这个效果** 


在DCC或者游戏引擎中的材质编辑器里，Smoothness通常是一个范围是[0,1]的浮点值，我们可以通过滑条来控制材质的粗糙程度。但在实际的渲染方程中，roughness通常不会简单地用`1 - smoothness`来获得，也就是说，二者的关系不是线性的。 

以Unity为例，给定Surface，获取BRDF中的roughness的计算过程是： 

```glsl
float perceptualRoughness = 
	PercuptualSmoothnessToPerceputualRoughness(surface.smoothness);
brdf.roughness = PerceptualRoughnessToRoughness(perceptualRoughness);
```

Unity使用了和迪士尼照明模型相同的思路，即 

```glsl
smoothness = 1.0 - roughness^2
// or
smoothness = 1.0 - perceptualRoughness
```

但是需要注意的是在实际的微表面光照计算上，粗糙度还是以线性形式参与计算的 

从另一种思路来说，使用roughness^2可以提供更好的精度分布。比如在使用基于PBR的IBL时，一种常见的方法是**Split-Sum**，涉及到从roughness和NdotV计算Lookup Table，并在运行时将其和预卷积的环境贴图结合。这种情况下，使用线性粗糙度的精度会不够好，换成分辨率更好的LUT又会带来纹理采样的性能压力。这种思路也可以解释为什么对于颜色贴图我们要使用sRGB的格式，因为它更好地利用了数据中最明显的位(每通道8位)。


最后附上Unity中`PerceptualRoughnessToRoughness`的代码 

```glsl
real PerceptualRoughnessToRoughness(real perceptualRoughness)
{
    return perceptualRoughness * perceptualRoughness;
}
```