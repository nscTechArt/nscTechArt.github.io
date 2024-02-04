---
layout: page
permalink: /blogs/Unity/SRP中的平行光阴影/index.html
title: SRP中的平行光阴影
---

### SRP中的平行光阴影

这篇博客主要翻译自[Catlike的博客](https://catlikecoding.com/unity/tutorials/custom-srp/directional-shadows/)，我想试着从管线和Shader的角度全面地剖析Unity中阴影是如何绘制出来的。请注意，我们将直接考虑级联形式的阴影的实现。

<br>本篇博客中的代码不能保证正确，可能一个手抖就写错了，所以请参照原链接。

#### 1 Rendering Shadows

Unity基于ShadowMap实现了阴影的渲染，主要原理可以概括为：生成一个shadow map，存储了光线从光源出发，到照射到物体表面所经过的距离，在光线方向上，更远距离的任何物体都无法被相同的光线照亮。

##### Shadow Settings

在着手实现阴影之前，我们需要首先确定阴影的设置，这里主要包括两个方面：

- 渲染阴影的最大距离
- shadow map的分辨率

<br>我们当然可以在相机的可视范围内将阴影完全绘制出来，但是这可能需要我们提供一个分辨率很高很高的shadow map，在实时渲染中是不可行的。为了便于我们更改阴影的设置，我们可以创建一个可序列化的类来管理。

<br> 同时，因为Unity中不止平行光这一种形式的灯光，各个类型灯光的阴影的设置和实现方法存在区别，所以我们把平行光相关的设置单独放进一个结构体中。

```c#
using UnityEngine

[System.Serializable]
public class ShadowSettings
{
    // 阴影距离
	[Min(0f)] public float maxDistance = 100f;
    
    // ShadowMap分辨率
    public enum TextureSize
    {
        _256 = 256, _512 = 512, _1024 = 1024,
		_2048 = 2048, _4096 = 4096, _8192 = 8192
    }
    
    // 平行光的阴影设置
    [System.Serializable]
    public struct Directional
    {
        public TextureSize atlasSize;
	}
    public Directional directional = new Directional {atlasSize = TextureSize._1024};
}
```

<br>接下来，为我们的SRP管线实例化阴影的设置。

```c#
[SerializeField] private ShadowSettings shadows;
```

<br>

完成之后，我们就可以像URP那样在Inspector面板中修改阴影的相关参数了，虽然目前比URP简陋了很多。![](files/shadowSettings.png)

<br>

不过目前我们的阴影设置还没有参与进管线，我们需要把shadow settings作为Custom RP Asset创建的参数之一，并进一步被传递给渲染每个相机时所调用的方法。本篇博客就暂且不展示这部分的代码了。

<br>SRP中，场景中的相机逐次渲染。每个相机渲染阴影时，不能只考虑全局范围内的阴影设置，还需要把相机的剔除和灯光的设置纳入考虑范围。比如说渲染阴影的距离应该从Max Distance和相机的远裁截面中选择较小的那个，每个灯光的阴影也有强弱、软硬之分。我们在`CameraRender.Render`中修改相应的代码，并把shadow settings也作为参数传入灯光的设置中。

```c#
public void Render (
    ScriptableRenderContext context, Camera camera,
    bool useDynamicBatching, bool useGPUInstancing,
    ShadowSettings shadowSettings
) {
    …
    if (!Cull(shadowSettings.maxDistance)) {
        return;
    }

    Setup();
    lighting.Setup(context, cullingResults, shadowSettings);
    …
}

private bool Cull (float maxShadowDistance) {
    if (camera.TryGetCullingParameters(out ScriptableCullingParameters p)) {
        p.shadowDistance = Mathf.Min(maxShadowDistance, camera.farClipPlane);
        cullingResults = context.Cull(ref p);
        return true;
    }
    return false;
}
```
<br>

```c#
public void Setup (
    ScriptableRenderContext context, CullingResults cullingResults,
    ShadowSettings shadowSettings
) { … }
```

##### shadows类

虽然阴影的渲染可以视为灯光的一部分，但是因为阴影渲染本身也是一个复杂的过程，我们把相关的逻辑单独放在`shadows`类中。这个类和我们所定义的`Lighting`类有相似之处，除了ShadowSettings之外，我们需要context、cullingResults以及command buffer。

