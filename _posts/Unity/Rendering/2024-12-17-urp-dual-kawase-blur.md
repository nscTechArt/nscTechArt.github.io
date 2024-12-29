---
title: URP中实现Dual Kawase Blur
date: 2024-12-17 21:29 +0800
categories: [Unity, Rendering]
tags: [Unity, Blur]
media_subpath: /assets/img/Unity/24-12-17/
math: true
---

### 算法简介

Dual Blur框架本质上是利用分层处理的思想：

- 在**降采样**过程中降低图像分辨率，减少处理的像素数量，从而实现高效的模糊效果
- 在**升采样**过程中逐级叠加模糊结果，产生一种更自然、更扩散的模糊效果

Dual Blur支持多种模糊算法作为基础（例如Kawase模糊、高斯模糊等），框架本身不限制具体的模糊操作。

在Dual Kawase Blur算法中，降采样与升采样会使用不同的blur kernel，如下图所示：

![](v2-1ae54eb0e154d542ff6acdae06232bdc_1440w.png)

下面这些文章都更详细地介绍了这种模糊算法：

- [十种图像模糊算法的总结与实现-腾讯云开发者社区-腾讯云](https://cloud.tencent.com/developer/article/1614858)
- [Unity URP DualKawaseBlur tajourney](https://tajourney.games/5050/)
- [An investigation of fast real-time GPU-based image blur algorithms](https://www.intel.com/content/www/us/en/developer/articles/technical/an-investigation-of-fast-real-time-gpu-based-image-blur-algorithms.html)

---

### 连续的模糊算法

先放一个效果演示

{% include embed/video.html src='01.mp4' autoplay=true loop=true %}

虽然多级降采样与升采样能够带来性能上的明显优势，但会带来一些问题，即由于降采样与升采样本身而产生的模糊与我们希望的“精确控制的模糊效果”之间存在差异。具体来说：

- 降采样会丢失图像中的高频细节，导致“模糊”
- 升采样时，模糊算法会在不同分辨率的纹理之间进行过渡，可能最终使得模糊效果存在阶跃式的视觉瑕疵，导致丢失过多细节或模糊效果分布不均

所以常规的dual kawase blur算法的实现对于逐渐模糊的效果需求是不太友好的。

如何解决呢？在原始分辨率下直接完成模糊操作，可以避免降采样和升采样带来的“不理想”模糊，但就违背使用Dual Blur算法的初衷。但是这种思路能够启发我们，最终使用的解决方法是，**在升采样过程中，通过调整权重参数$\alpha$（介于0到1之间）进行线性插值，平滑地融合两个纹理的模糊程度，从而让模糊效果在不同迭代次数之间保持连续过渡**

> 本篇博客在一定程度上参考了这篇[文章](https://zznewclear13.github.io/posts/almost-continuous-dual-kawase-blur/)，感谢zznewclear13前辈

#### 模糊半径

在常规的dual blur算法中，我们会指定模糊半径、迭代次数以及降采样的倍率。在这种做法下，模糊强度与模糊参数成线性比例，那么模糊程度的变化就会较为剧烈，无法生成连续的模糊效果。在我们的实现中，使用了以2为底的对数调整模糊程度的动态范围：

```c#
float blurAmount = Mathf.Log(maxRadius * intensity + 1.0f, 2);
int   blurIterations = Mathf.FloorToInt(blurAmount);
```

对数函数具有增长速度逐渐减缓的特性，这种非线性增长方式使得模糊效果变化在低值时更明显，在高值时更加平缓。符合我们的需求。

而在升采样与降采样过程中，采样点的偏移始终由blur kernel以及目标纹理的分辨率决定。

#### 线性插值

线性插值是实现连续的模糊效果的关键。前面我们已经提到了线性插值的作用，现在我们需要弄明白其中的一些细节问题：

- 如何确定插值的权重？
- 线性插值发生在升采样过程中，那么具体是在哪两个特定的纹理之间插值？
- 为什么通过插值可以实现连续的模糊效果？

我们来逐一解释。首先，插值的权重为`blurAmount - blurIterations`，也就是`blurAmount`的小数部分，这样权重始终在$[0, 1]$的范围内，并且在本质上就是代表趋近下一个模糊层级的程度。

在dual blur算法框架中，当降采样模糊的完成后，就要开始执行升采样模糊。在完成第一次升采样后，我们将得到的纹理与降采样过程中的与其分辨率一致的纹理进行插值，实际上也就是倒数第二次的降采样纹理。

![](20241230005335.png)

想要理解为什么插值能够实现连续的模糊效果，我们需要思考这个问题的本质：**插值如何影响了两个相邻迭代层级之间的模糊效果**。我们不妨使用一个笨方法，找一个简单的例子推导一遍算法，并考虑极端的插值权重。简单起见，我们分别来看迭代次数为1与迭代次数为2的情况。

##### Case 1

`blurIteration`为`1`，则算法流程为：

降采样

- cameraColor -> texture0
- texture0 -> texture1

升采样

- texture1 -> texture2

插值

- texture0 -> texture2

交换

- texture0 <-> texture2 

升采样

- texture0 -> finalTexture

在插值权重无限趋近于1时，**texture0**本质上就是**texture2**，即**texture1**升采样的结果。那么整个模糊过程就等价于**两次降采样+两次升采样**，也就是：

降采样

- cameraColor -> texture0
- texture0 -> texture1

升采样

- texture1 -> texture0

- texture0 -> finalTexture

##### Case 2

`blurIteration`为`2`，则算法流程为：

降采样

- cameraColor -> texture0
- texture0 -> texture1
- texture1 -> texture2

升采样

- texture2 -> texture3

插值

- texture1 -> texture3

交换

- texture1 <-> texture3

升采样

- texture1 -> texture0
- texture0 -> finalTexture

在插值权重无线趋近于0时，相当于我们忽略掉了由**texture2**升采样得到的**texture3**，那么整个模糊过程就等价于**两次降采样+两次升采样**，也就是：

降采样

- cameraColor -> texture0
- texture0 -> texture1

升采样

- texture1 -> texture0
- texture0 -> finalTexture

由此，我们不难归纳出这样的结果：**当模糊算法的迭代次数递进时，用于插值的权重从1变为0，从而衔接起两个相邻迭代次数之间的模糊程度，实现连续的模糊效果。**

---

### 代码

项目地址在[这里](https://github.com/nscTechArt/URP-Blur-Features)。

#### DualKawaseBlur.compute

```glsl
#pragma kernel DownSampleBlur
#pragma kernel UpSampleBlur
#pragma kernel LinearLerp

Texture2D _SourceTexture;
RWTexture2D<half4> _TargetTexture;
SamplerState sampler_LinearClamp;

float2 _TargetSize;
float _BlendRatio;

float3 SampleSource(float2 uv)
{
    return _SourceTexture.SampleLevel(sampler_LinearClamp, uv, 0.0f).rgb;
}

[numthreads(8,8,1)]
void DownSampleBlur(uint3 id : SV_DispatchThreadID)
{
    float2 halfPixel = 0.5f * _TargetSize;
    float2 uv = float2(id.xy) * _TargetSize + halfPixel;

    half3 color = 0;
    color += SampleSource(uv + float2(0.0f, 0.0f)) * 0.5;
    color += SampleSource(uv + float2(-1.0f,  1.0f) * halfPixel) * 0.125;
    color += SampleSource(uv + float2( 1.0f,  1.0f) * halfPixel) * 0.125;
    color += SampleSource(uv + float2(-1.0f, -1.0f) * halfPixel) * 0.125;
    color += SampleSource(uv + float2( 1.0f, -1.0f) * halfPixel) * 0.125;
    
    _TargetTexture[id.xy] = float4(color, 1.0f);
}

[numthreads(8, 8, 1)]
void UpSampleBlur(uint3 id : SV_DispatchThreadID)
{
    float2 onePixel = 1.0f * _TargetSize;
    float2 uv = float2(id.xy) * _TargetSize + 0.5f * _TargetSize;

    const float weight = rcp(12.0f);
    const float weight1 = rcp(6.0f);

    half3 color = 0;
    color += SampleSource(uv + onePixel * float2(-1.0f, +1.0f)) * weight1;
    color += SampleSource(uv + onePixel * float2(+1.0f, +1.0f)) * weight1;
    color += SampleSource(uv + onePixel * float2(-1.0f, -1.0f)) * weight1;
    color += SampleSource(uv + onePixel * float2(+1.0f, -1.0f)) * weight1;
    color += SampleSource(uv + onePixel * float2(+0.0f, +2.0f)) * weight;
    color += SampleSource(uv + onePixel * float2(+0.0f, -2.0f)) * weight;
    color += SampleSource(uv + onePixel * float2(-2.0f, +0.0f)) * weight;
    color += SampleSource(uv + onePixel * float2(+2.0f, +0.0f)) * weight;
    
    _TargetTexture[id.xy] = half4(color, 1.0f);
}

[numthreads(8, 8, 1)] 
void LinearLerp(uint3 id : SV_DispatchThreadID)
{
    float4 sourceTex = _SourceTexture.Load(uint3(id.xy, 0));
    float4 blurredTex = _TargetTexture.Load(uint3(id.xy, 0));
    float3 color = lerp(sourceTex.rgb, blurredTex.rgb, _BlendRatio);
    _TargetTexture[id.xy] = half4(color, 1.0f);
}
```
{: file="DualKawaseBlur.compute"}

#### DualKawaseBlurRenderPass.cs

```c#
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

public class DualKawaseBlurRenderPass : ScriptableRenderPass
{
    public DualKawaseBlurRenderPass(string featureName, DualKawaseBlurSettings settings)
    {
        // initialize
        // ----------
        mProfilingSampler = new ProfilingSampler(featureName);
        renderPassEvent   = settings.m_CopyToFrameBuffer
            ? RenderPassEvent.BeforeRenderingPostProcessing
            : RenderPassEvent.AfterRenderingSkybox;
        mSettings         = settings;
        
        // shader related
        // --------------
        mPassShader           = settings.m_DualKawaseBlurShader;
        mDownSampleKernel = mPassShader.FindKernel("DownSampleBlur");
        mUpSampleKernel   = mPassShader.FindKernel("UpSampleBlur");
        mBlendKernel   = mPassShader.FindKernel("LinearLerp");
    }

    public void Setup(DualKawaseBlur volumeComponent)
    {
        mVolumeComponent = volumeComponent;
    }

    public override void OnCameraSetup(CommandBuffer cmd, ref RenderingData renderingData)
    {
        // update camera color texture
        // ---------------------------
        mCameraColorTexture = renderingData.cameraData.renderer.cameraColorTargetHandle;
        
        // update descriptor of blur textures
        // ----------------------------------
        mDescriptor = renderingData.cameraData.cameraTargetDescriptor;
        mDescriptor.depthBufferBits = 0;
        mDescriptor.msaaSamples = 1;
        mDescriptor.enableRandomWrite = true;
        
        // update screen size
        // ------------------
        mOriginalSize = new Vector2Int(mDescriptor.width, mDescriptor.height);
    }

    public override void Execute(ScriptableRenderContext context, ref RenderingData renderingData)
    {
        CommandBuffer cmd = CommandBufferPool.Get();
        using (new ProfilingScope(cmd, mProfilingSampler))
        {
            context.ExecuteCommandBuffer(cmd);
            cmd.Clear();
            
            // figure out blur iterations and blending ratio
            // ---------------------------------------------
            float blurFactor = mVolumeComponent.m_BlurRadius.value * mVolumeComponent.m_BlurIntensity.value + 1.0f;
            float blurAmount = Mathf.Log(blurFactor, 2.0f);
            int   blurIterations = Mathf.FloorToInt(blurAmount);
            float ratio = blurAmount - blurIterations;

            // create lists to store temporary textures and sizes
            // --------------------------------------------------
            List<int> textureIDs = new();
            List<Vector2Int> textureSizes = new();
            
            // create final target blur texture
            // --------------------------------
            int finalTextureID = Shader.PropertyToID(mSettings.m_TargetTextureName);
            cmd.GetTemporaryRT(finalTextureID, mDescriptor);
            // keep track
            textureIDs.Add(finalTextureID);
            textureSizes.Add(mOriginalSize);
            
            // downsample blur
            // ---------------
            Vector2Int sourceTextureSize = mOriginalSize;
            RenderTargetIdentifier sourceTextureID = mCameraColorTexture.nameID;
            for (int i = 0; i <= blurIterations; i++)
            {
                // create a new target texture
                // ---------------------------
                int targetTextureID = Shader.PropertyToID(kBlurTextureName + i);
                // plus one is necessary to zero thread group count
                Vector2Int targetTextureSize = new((sourceTextureSize.x + 1) / 2, (sourceTextureSize.y + 1) / 2);
                mDescriptor.width = targetTextureSize.x;
                mDescriptor.height = targetTextureSize.y;
                cmd.GetTemporaryRT(targetTextureID, mDescriptor);
                // keep track
                textureIDs.Add(targetTextureID);
                textureSizes.Add(targetTextureSize);
                
                // do the kawase blur
                // ------------------
                DownSampleBlur(cmd, sourceTextureID, targetTextureID, targetTextureSize);
                
                // update the last size and ID
                // ---------------------------
                sourceTextureSize = targetTextureSize;
                sourceTextureID = targetTextureID;
            }
            
            // upsample
            // --------
            if (blurIterations != 0)
            {
                // create an intermediate texture for linear lerp,
                // which has the same size with the last second downsample texture
                // ---------------------------------------------------------------
                int tempTextureID = Shader.PropertyToID(kBlurTextureName + (blurIterations + 1));
                Vector2Int tempTextureSize = textureSizes[blurIterations];
                mDescriptor.width = tempTextureSize.x;
                mDescriptor.height = tempTextureSize.y;
                cmd.GetTemporaryRT(tempTextureID, mDescriptor);

                for (int i = blurIterations + 1; i >= 1; i--)
                {
                    int sourceID = textureIDs[i];
                    int targetID = i == blurIterations + 1 ? tempTextureID : textureIDs[i - 1];
                    Vector2Int targetSize = textureSizes[i - 1];
                    
                    // do the kawase blur
                    // ------------------
                    UpSampleBlur(cmd, sourceID, targetID, targetSize);
                    
                    // do the linear lerp
                    // ------------------
                    if (i == blurIterations + 1)
                    {
                        Linear(cmd, textureIDs[i - 1], tempTextureID, targetSize, ratio);
                        // swap the texture IDs
                        (tempTextureID, textureIDs[i - 1]) = (textureIDs[i - 1], tempTextureID);
                    }
                    
                    // release current temporary texture
                    // ---------------------------------
                    cmd.ReleaseTemporaryRT(sourceID);
                }
                
                // release the intermediate texture
                // --------------------------------
                cmd.ReleaseTemporaryRT(tempTextureID);
            }
            else
            {
                UpSampleBlur(cmd, textureIDs[1], textureIDs[0], textureSizes[0]);
                Linear(cmd, mCameraColorTexture.nameID, textureIDs[0], textureSizes[0], ratio);
            }
            
            // blit the final result
            // ---------------------
            if (mSettings.m_CopyToFrameBuffer)
            {
                cmd.Blit(finalTextureID, mCameraColorTexture.nameID);
            }
            else
            {
                cmd.SetGlobalTexture(mSettings.m_TargetTextureName, finalTextureID);
            }
            cmd.ReleaseTemporaryRT(finalTextureID);
        }
        
        context.ExecuteCommandBuffer(cmd);
        cmd.Clear();
        CommandBufferPool.Release(cmd);
    }

    private Vector4 GetTextureSizeParams(Vector2Int size)
    {
        return new Vector4(1.0f / size.x, 1.0f / size.y);
    }
    
    private void DownSampleBlur(CommandBuffer cmd, RenderTargetIdentifier source, RenderTargetIdentifier target, Vector2Int targetSize)
    {
        using (new ProfilingScope(cmd, new ProfilingSampler("DownSample Blur")))
        {
            // pass data to shader
            // -------------------
            cmd.SetComputeTextureParam(mPassShader, mDownSampleKernel, _SourceTexture, source);
            cmd.SetComputeTextureParam(mPassShader, mDownSampleKernel, _TargetTexture, target);
            cmd.SetComputeVectorParam(mPassShader, _TargetSize, GetTextureSizeParams(targetSize));
        
            // dispatch shader
            // ---------------
            mPassShader.GetKernelThreadGroupSizes(mDownSampleKernel, out uint x, out uint y, out uint _);
            int threadGroupX = Mathf.CeilToInt((float)targetSize.x / x);
            int threadGroupY = Mathf.CeilToInt((float)targetSize.y / y);
            cmd.DispatchCompute(mPassShader, mDownSampleKernel, threadGroupX, threadGroupY, 1);
        }
        
    }

    private void UpSampleBlur(CommandBuffer cmd, RenderTargetIdentifier source, RenderTargetIdentifier target, Vector2Int targetSize)
    {
        using (new ProfilingScope(cmd, new ProfilingSampler("UpSample Blur")))
        {
            // pass data to shader
            // -------------------
            cmd.SetComputeTextureParam(mPassShader, mUpSampleKernel, _SourceTexture, source);
            cmd.SetComputeTextureParam(mPassShader, mUpSampleKernel, _TargetTexture, target);
            cmd.SetComputeVectorParam(mPassShader, _TargetSize, GetTextureSizeParams(targetSize));

            // dispatch shader
            // ---------------
            mPassShader.GetKernelThreadGroupSizes(mUpSampleKernel, out uint x, out uint y, out uint _);
            int threadGroupX = Mathf.CeilToInt((float)targetSize.x / x);
            int threadGroupY = Mathf.CeilToInt((float)targetSize.y / y);
            cmd.DispatchCompute(mPassShader, mUpSampleKernel, threadGroupX, threadGroupY, 1);
        }
    }

    private void Linear(CommandBuffer cmd, RenderTargetIdentifier source, RenderTargetIdentifier target, Vector2Int sourceSize, float ratio)
    {
        using (new ProfilingScope(cmd, new ProfilingSampler("Linear Blend")))
        {
            // pass data to shader
            // -------------------
            cmd.SetComputeTextureParam(mPassShader, mBlendKernel, _SourceTexture, source);
            cmd.SetComputeTextureParam(mPassShader, mBlendKernel, _TargetTexture, target);
            cmd.SetComputeFloatParam(mPassShader, _BlendRatio, ratio);
        
            // dispatch shader
            // ---------------
            mPassShader.GetKernelThreadGroupSizes(mBlendKernel, out uint x, out uint y, out uint _);
            int threadGroupX = Mathf.CeilToInt((float)sourceSize.x / x);
            int threadGroupY = Mathf.CeilToInt((float)sourceSize.y / y);
            cmd.DispatchCompute(mPassShader, mBlendKernel, threadGroupX, threadGroupY, 1);
        }
    }
    
    // profiling related
    // -----------------
    private ProfilingSampler mProfilingSampler;
    // feature related
    // ---------------
    private DualKawaseBlur         mVolumeComponent;
    private DualKawaseBlurSettings mSettings;
    // pass shader related
    // -------------------
    private ComputeShader mPassShader;
    private int           mDownSampleKernel;
    private int           mUpSampleKernel;
    private int           mBlendKernel;
    // render pass related
    // -------------------
    private RTHandle                mCameraColorTexture;
    private RenderTextureDescriptor mDescriptor;
    private Vector2Int              mOriginalSize;
    // constants
    // ---------
    private const string kBlurTextureName = "_BlurTexture";
    // cached shader property IDs
    // --------------------------
    private static readonly int _SourceTexture = Shader.PropertyToID("_SourceTexture");
    private static readonly int _TargetTexture = Shader.PropertyToID("_TargetTexture");
    private static readonly int _TargetSize = Shader.PropertyToID("_TargetSize");
    private static readonly int _BlendRatio = Shader.PropertyToID("_BlendRatio");
}
```
{: file="DualKawaseBlurRenderPass.cs"}


Volume与RenderFeature都是常规的实现，这里就不再贴源码了。唯一值得一提的是，可以配置是否将最终的模糊纹理Blit到屏幕上，这取决于想要通过dual blur实现全屏后处理还是用于创建磨砂玻璃等材质。

```c#
public bool            m_CopyToFrameBuffer = true;
public string          m_TargetTextureName = "_BlurTexture";
```
{: file="DualKawaseBlurRenderFeature.cs"}