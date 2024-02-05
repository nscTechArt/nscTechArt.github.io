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
// ShadowSettings Class
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
// CustomRenderPipelineAsset Class
[SerializeField] private ShadowSettings shadows;
```

<br>完成之后，我们就可以像URP那样在Inspector面板中修改阴影的相关参数了，虽然目前比URP简陋了很多。![](files/shadowSettings.png)

<br>不过目前我们的阴影设置还没有参与进管线，我们需要把shadow settings作为Custom RP Asset创建的参数之一，并进一步被传递给渲染每个相机时所调用的方法。本篇博客就暂且不展示这部分的代码了。

<br>SRP中，场景中的相机逐次渲染。每个相机渲染阴影时，不能只考虑全局范围内的阴影设置，还需要把相机的剔除和灯光的设置纳入考虑范围。比如说渲染阴影的距离应该从Max Distance和相机的远裁截面中选择较小的那个，每个灯光的阴影也有强弱、软硬之分。我们在`CameraRender.Render`中修改相应的代码，并把shadow settings也作为参数传入灯光的设置中。

```c#
// CameraRenderer Class
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
```c#
// Lighting Class
public void Setup (
    ScriptableRenderContext context, CullingResults cullingResults,
    ShadowSettings shadowSettings
) { … }
```

##### shadows类

虽然阴影的渲染可以视为灯光的一部分，但是因为阴影渲染本身也是一个复杂的过程，我们把相关的逻辑单独放在`shadows`类中。这个类和我们所定义的`Lighting`类有相似之处，除了ShadowSettings之外，我们需要context、cullingResults以及command buffer。

```c#
// Shadows Class
using UnityEngine;
using UnityEngine.Rendering;

public class Shadows
{
    private const string bufferName = "Shadows";
    private CommandBuffer buffer = new CommandBuffer {name = bufferName};
    
    private ScriptableRenderContext context;
    private CullingResults cullingResults;
    private ShadowSettings settings;
    
    public void Setup (
        ScriptableRenderContext context, 
    	CullingResults cullingResults，
    	ShadowSettings settings)
    {
        this.context = context;
        this.cullingResults = cullingResults;
        this.settings = settings;
    }
    
    private void ExecuteBuffer()
    {
        context.ExecuteCommandBuffer(buffer);
        buffer.Clear();
    }
}
```

<br>当然，这只是阴影渲染的开始，之后所有的逻辑都会在`Shadows`这个类中实现，`Lighting`类所需要的只是将阴影的绘制添加进它的渲染流程。

```c#
// Lighting Class
private Shadows shadows = new Shadows();

public void Setup(...)
{
    this.cullingResults = cullingResults;
    buffer.BeginSample(bufferName);
    shadows.Setup(context, cullingResults, shadowSettings);
    SetupLights();
}
```

##### Lights with Shadows

尽管我们的最终目标是实现多个平行光的阴影，不过让我们先从一个开始，也就是：假定场景中有且只有一个shadow-cast的灯光。但是这也会带来一个问题，到底是哪个灯光投影呢？不过我们定义一个结构体，并且用一个数组来管理这些结构体。目前，这个结构体只包含灯光在可见光数组中的索引。

```c#
// Shadows Class
private const int maxShadowedDirectionalLightCount = 1;

private struct ShadowedDirectionalLight
{
    public int visibleLightIndex;
}
private ShadowedDirectionalLight[] shadowedDirectionalLights = 
    new ShadowedDirectionalLight[maxShadowedDirectionalLightCount];
```

<br>现在，我们需要确定哪个灯光是需要投影的。为此，我们定义一个方法`ReserveDirectionalShadows()`，如果判断得到某个灯是投影的，我们把它加入我们的`ShadowedDirectionalLight[]`，并把它的索引一并存储。~~我们还会通过在阴影图集(shadow atlas)中为shadow map预留空间，并且存储渲染阴影所需要的信息。~~

<br>我们必须明确的是，如果判断一个灯光是需要投影的。目前，我们要考虑以下因素并在代码中实现

- 当前投影的灯光数量小于最大投影灯光数量
- 灯光的投影模式不能为none
- 灯光的阴影强度大于0
- 灯光如果只影响在Max Shadow Distance之外的物体，那这个灯光就没有阴影需要渲染。这需要我们在cullingResults中调用`GetShadowCasterBounds`来检测，它需要我们提供当前的可见光的索引

```c#
// Shadows Class
private int shadowedDirectionalLightCount;

public void Setup(...)
{
    ...
    shadowedDirectionalLightCount = 0; // 归零计数
}

public void ReserveDirectionalShadows(
    Light light, int visibleLightIndex)
{
    if (shadowedDirectionalLightCount < maxShadowedDirectionalLightCount && 
       light.shadows != LightShadows.None &&
       light.shadowStrength > 0f &&
       cullingResults.GetShadowCasterBounds(visibleLightIndex, out Bounds bounds))
    {
        shadowedDirectionalLights[shadowedDirectionalLightCount++] = 
            new ShadowedDirectionalLight {visibleLightIndex = visibleLightIndex};
    }
}
```

<br>如此一来，我们就可以在`Lighting`遍历灯光时插入这个方法了

```c#
// Lighting Class
private void SetupDirectionalLight (int index, ref VisibleLight visibleLight)
{
    dirLightColors[index] = visibleLight.finalColor;
    dirLightDirections[index] = -visibleLight.localToWorldMatrix.GetColumn(2);
    shadows.ReserveDirectionalShadows(visibleLight.light, index);
}
```

##### Creating the Shadow Atlas

完成了对灯光的筛选，就要着手实现阴影的绘制了。我们把相关逻辑放在一个单独的方法`Render()`中，并在`Lighting`类调用这个方法。但实际上`Render()`也只是一个入口，我们将平行光阴影的渲染委托给另一个方法`RenderDirectionalShadows()`，这里存放真正的阴影渲染逻辑。

```c#
// Lighting Class
shadows.Setup(context, cullingResults, shadowSettings);
SetupLights();
shadows.Render();
```

```c#
// Shadows Class
public void Render()
{
    if (shadowedDirectionalLightCount > 0)
    {
        RenderDirectionalShadows();
    }
}

private void RenderDirectionalShadows() {}
```
<br>阴影渲染的逻辑从创建shadow map开始，也就是把投影的物体绘制到一张纹理中，在级联阴影的前提下，我们把这个贴图命名为*_DirectionalShadowAtlas*，纹理的分辨率我们已经设置好了，余下的就是确认纹理的位深、格式、filterMode。**请注意，shadow map的纹理设置要考虑不同平台的要求。**<br>当然，既然我们创建了一个RenderTexture，也必然要考虑到RT的释放以及释放的时机。在我们的管线中，应该是在相机结束一次渲染时释放。<br>问题又来了，想CameraRenderer所写的释放RT的操作是不加逻辑判断的，所以我们必须考虑到如果场景没有阴影需要渲染，shadow map的RT没有创建的这种情况。同时，在一些较旧的图形API上，纹理和纹理采样器是绑定的，当shadow map RT没有被创建是，材质会使用默认贴图，也会使用shadow map的采样器，二者是不匹配的。为了避免以上种种情况，我们可以在不绘制阴影时创建一个dummy shadow map。

```c#
// Shadows Class
private int dirShadowAtlasID = Shader.PropertyToID("_DirectionalShadowAtlas");

public void Render()
{
    if (shadowedDirectionalLightCount > 0)
    {
        RenderDirectionalShadows();
    }
    else
    {
        buffer.GetTemporaryRT(dirShadowAtlasID, 1, 1, 
                              32, FilterMode.Bilinear, RenderTextureFormat.Shadowmap);
    }
}

private void RenderDirectionalShadows() 
{
    int atlasSize = (int)settings.directional.atlasSize;
    buffer.GetTemporaryRT(dirShadowAtlasID, atlasSize, atlasSize, 
                         32, FilterMode.Bilinear, RenderTextureFormat.Shadowmap);
}

public void Cleanup()
{
    buffer.ReleaseTemporaryRT(dirShadowAtlasID);
    ExecuteBuffer();
}
```

```c#
// Lighting Class
public void Cleanup()
{
    shadows.Cleanup();
}
```

```c#
// CameraRenderer Class
public void Render(...)
{
    ...
    lighting.Cleanup();
    Submit();
}
```

