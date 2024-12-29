---
title: Unity中实现Kawase Blur
date: 2024-12-02 09:40 +0800
categories: [Unity, Rendering]
media_subpath: /assets/img/Unity/24-12-02/
tag: [Unity, Blur]
math: false
---

### 思路

模糊处理在思路上很简单，只需要收集周围像素的颜色值并求平均值，从而得到模糊的像素。但是不同的实现方法会带来不同的视觉效果、模糊质量以及性能。

Kawase Blur算法在模糊时，会使用一个偏移步长，对目标像素周围的多个像素进行采样。采样点通常是围绕中心对称分布的，数量是可以是4个，8个或16个等。

Kawase Blur算法是一个多pass的算法，每个pass会在前一个pass的模糊基础上进行进一步模糊。在在每个pass中，新的像素值是以当前像素为中心的矩形区域的四个角的16个采样的平均值。多次迭代的同时调整偏移步长，使得模糊半径逐渐增加。如下图所示：

![](figure10-518113.png)

### 实现细节

#### Volume Component

Kawase Blur的设置较为简单，只需要美术指定**模糊迭代的次数**与**降采样倍率**即可

```c#
[VolumeComponentMenu("Custom/Kawase Blur")]
public class KawaseBlurVolume : VolumeComponent, IPostProcessComponent
{
    [Space]
    public BoolParameter m_Enable = new(false);
    [Space]
    public ClampedIntParameter m_BlurPassNumber = new(2, 2, 15);
    public ClampedIntParameter m_DownSample = new(1, 1, 4);
    
    public bool IsActive() => m_Enable.value;
    public bool IsTileCompatible() => false;
}
```
{: file="KawaseBlurVolume.cs"}
{: add-lines="7-8"}

#### Render Pass

在Render Pass中，我们在两个临时纹理之间进行乒乓式blit，并且在迭代过程中，根据迭代次数使用不同的kernel。

```c#
public override void Execute(ScriptableRenderContext context, ref RenderingData renderingData)
{
    ...
    // blur pass
    // ---------
    cmd.SetGlobalFloat(KawaseBlurOffsetID, 1.5f);
    Blitter.BlitCameraTexture(cmd, mSource, mTemporaryTexture1, mPassMaterial, 0);
    for (int i = 1; i < mVolumeComponent.m_BlurPassNumber.value - 1; i++)
    {
        cmd.SetGlobalFloat(KawaseBlurOffsetID, 0.5f + i);
        Blitter.BlitCameraTexture(cmd, mTemporaryTexture1, mTemporaryTexture2, mPassMaterial, 0);
        (mTemporaryTexture1, mTemporaryTexture2) = (mTemporaryTexture2, mTemporaryTexture1);
    }
    ...
}
```
{: file="KawaseBlurRenderPass.cs"}

模糊算法通常作为全屏后处理，但也可以在获取模糊结果后，用于场景中的特殊物体或组件，例如UI、毛玻璃等。对此，我们需要对最终的模糊结果不同的处理：

```c#
public override void Execute(ScriptableRenderContext context, ref RenderingData renderingData)
{
    ...
    // final pass
    // ----------
    cmd.SetGlobalFloat(KawaseBlurOffsetID, 0.5f + mVolumeComponent.m_BlurPassNumber.value - 1);
    if (mSettings.m_RenderToFullScreen)
    {
        Blitter.BlitCameraTexture(cmd, mTemporaryTexture1, mDestination, mPassMaterial, 0);
    }
    else
    {
        Blitter.BlitCameraTexture(cmd, mTemporaryTexture1, mTemporaryTexture2, mPassMaterial, 0);
        cmd.SetGlobalTexture(mSettings.m_TargetTextureName, mTemporaryTexture2);
    }
    ...
}
```
{: file="KawaseBlurRenderPass.cs"}

#### Shader

在对应的Shader中，我们在顶点着色器中计算用于采样的偏移UV，在片段着色其中完成采样与加权。


```glsl
CustomVaryings KawaseBlurVert(Attributes input)
{
    CustomVaryings output;
    output.positionHCS = GetFullScreenTriangleVertexPosition(input.vertexID);
    float2 uv  = GetFullScreenTriangleTexCoord(input.vertexID);
    output.uv   = uv * _BlitScaleBias.xy + _BlitScaleBias.zw;
    output.uvTopRight    = output.uv + float2( _KawaseBlurOffset,  _KawaseBlurOffset) * _BlitTexture_TexelSize.xy;
    output.uvTopLeft     = output.uv + float2(-_KawaseBlurOffset,  _KawaseBlurOffset) * _BlitTexture_TexelSize.xy;
    output.uvBottomRight = output.uv + float2( _KawaseBlurOffset, -_KawaseBlurOffset) * _BlitTexture_TexelSize.xy;
    output.uvBottomLeft  = output.uv + float2(-_KawaseBlurOffset, -_KawaseBlurOffset) * _BlitTexture_TexelSize.xy;
    return output;
}

float4 KawaseBlurFrag(CustomVaryings input) : SV_Target
{
    float4 color = SAMPLE_TEXTURE2D(_BlitTexture, sampler_LinearClamp, input.uv) * 0.2;
    color += SAMPLE_TEXTURE2D(_BlitTexture, sampler_LinearClamp, input.uvTopRight) * 0.2;
    color += SAMPLE_TEXTURE2D(_BlitTexture, sampler_LinearClamp, input.uvTopLeft) * 0.2;
    color += SAMPLE_TEXTURE2D(_BlitTexture, sampler_LinearClamp, input.uvBottomRight) * 0.2;
    color += SAMPLE_TEXTURE2D(_BlitTexture, sampler_LinearClamp, input.uvBottomLeft) * 0.2;
    return float4(color.rgb, 1.0);
}
```
{: file="KawaseBlurShader.shader"}

### 效果演示

![](cozy-space-blu-ui.jpg)

---

![](CozySpace2024-12-02 10-14-58.jpg)

---

