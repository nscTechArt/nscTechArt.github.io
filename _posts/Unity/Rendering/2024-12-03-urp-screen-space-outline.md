---
title: URP中实现屏幕空间描边
date: 2024-12-03 09:48 +0800
categories: [Unity, Rendering]
tags: [Unity, Outlines]
media_subpath: /assets/img/Unity/12-03
---

项目中需要一个特定的描边效果，用于标识玩家当前选中的家具，以及提醒玩家选中的家具是否能够摆放在当前位置。此外，描边效果还需要满足以下要求：

- 仅标识选中物体的外轮廓，无需内描边，确保选中效果的简洁
- 描边结果始终在游戏画面的最上层，确保选中效果不受物体之间相互遮挡的影响

### 效果演示

![](Image Sequence_001_0000.png)

![](20241222223548.png)

### 实现思路

思路本身比较简单：**将需要描边的物体绘制到一个单独的Texture中，对该Texture进行边缘检测，得到该物体的外轮廓，最终合成到相机的输出结果即可。**

#### 将选中物体绘制到单独的纹理中

首先，我们需要确定如何划定“选中”的物体。URP内置了*Render Objects*功能，能够依据给定的**队列**与**LayerMask**，使用重载材质对划定的物体进行绘制，本质上就是创建特定的`FilteringSettings`，然后执行`context.DrawRenderers()`。

但是在物宅空间这个项目中，程序组对于*LayerMask*有特定的使用规则，为了不影响这部分逻辑，我们可以额外给定一个参数，即*RenderingLayerMask*。在玩家选中或取消选中物体时，通过脚本会添加或删除特定的*RenderingLayerMask*，从而决定该物体是否需要描边。

此外*Render Objects*会将绘制结果直接呈现在屏幕上，而我们需要将该结果保留在一个纹理上，以便用于边缘识别。所以我们需要自行实现一个*RenderFeature*，并通过`CoreUtils.SetRenderTarget()`设置渲染目标。

#### 边缘检测

我们将选中物体绘制到了一个单通道的纹理中，所以，我们只需要对该纹理进行基于颜色信息的边缘检测就可以得到该物体的外轮廓。这里选择Roberts算子。

在根据给定的描边宽度计算偏移UV时，为了避免单数宽度值造成的不对称效果，可以对传入的宽度值取floor与ceil：

```glsl
// multiply by 0.5 due to half-resolution texture
float2 texelSize = _BlitTexture_TexelSize.xy * 0.5;
const float halfWidthFloor = floor(_OutlineWidth * 0.5);
const float halfWidthCeil = ceil(_OutlineWidth * 0.5);

output.uvs[0] = output.texcoord + texelSize * float2(halfWidthFloor, halfWidthCeil)  * float2(-1,  1);
output.uvs[1] = output.texcoord + texelSize * float2(halfWidthCeil,  halfWidthFloor) * float2( 1,  1);
output.uvs[2] = output.texcoord + texelSize * float2(halfWidthFloor, halfWidthCeil)  * float2(-1, -1);
output.uvs[3] = output.texcoord + texelSize * float2(halfWidthCeil,  halfWidthFloor) * float2( 1, -1);
```

#### 合成

需要注意在Blit前需要重置渲染目标。

---

### 代码

[Github仓库地址](https://github.com/nscTechArt/URP-Screen-Space-Outline)

#### ScreenSpaceOutline.cs

用于创建Volume组件，以便控制描边的宽度与颜色

```c#
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

public class ScreenSpaceOutline : VolumeComponent, IPostProcessComponent
{
    [Space(5)]
    public BoolParameter m_Enable = new(false);
    [Space(5)]
    public ColorParameter        m_OutlineColor = new(Color.white);
    public ClampedFloatParameter m_OutlineWidth = new(3.0f, 1.0f, 10.0f);

    public bool IsActive() => m_Enable.value;
    public bool IsTileCompatible() => false;
}
```
{: file="ScreenSpaceOutline.cs"}

---

#### ScreenSpaceOutlineRenderFeature.cs

常规的RenderFeature处理方式。在`ScreenSpaceOutlineSettings`中，包含了需要绘制描边的物体的`LayerMask`与所在的`RenderingLayerMask`，这些值会传递给render pass，用于生成对应的Filtering Setting

```c#
using JetBrains.Annotations;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

[System.Serializable]
public class ScreenSpaceOutlineSettings
{
    [Header("Basic Settings"), Space(5)]
    public RenderPassEvent m_RenderPassEvent = RenderPassEvent.AfterRenderingTransparents;
    public Shader          m_ScreenSpaceOutlineShader;
    
    [Header("Filtering Settings"), Space(5)]
    public RenderQueueRange   m_RenderQueueRange = RenderQueueRange.Opaque;
    public LayerMask          m_LayerMask;
    [Range(0, 32)] public int m_RenderingLayerMask;
    
    // enums
    // -----
    public enum RenderQueueRange
    {
        [UsedImplicitly] All, 
        [UsedImplicitly] Opaque, 
        [UsedImplicitly] Transparent
    }
}

public class ScreenSpaceOutlineRenderFeature : ScriptableRendererFeature
{
    [SerializeField] 
    private ScreenSpaceOutlineSettings   m_Settings = new();
    private OutlineDrawingRenderPass mPass;

    public override void Create()
    {
        if (m_Settings.m_ScreenSpaceOutlineShader == null) return;
        
        mPass = new OutlineDrawingRenderPass(name, m_Settings);
    }

    public override void AddRenderPasses(ScriptableRenderer renderer, ref RenderingData renderingData)
    {
        ScreenSpaceOutline volumeComponent = VolumeManager.instance.stack.GetComponent<ScreenSpaceOutline>();
        if (!volumeComponent || !volumeComponent.IsActive()) return;
        
        mPass.Setup(volumeComponent);
        renderer.EnqueuePass(mPass);
    }

    protected override void Dispose(bool disposing)
    {
        mPass.Dispose();
    }
}
```
{: file="ScreenSpaceOutlineRenderFeature.cs"}

---

#### ScreenSpaceOutlineRenderPass.cs

```c#
using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

public class OutlineDrawingRenderPass : ScriptableRenderPass
{
    public OutlineDrawingRenderPass(string featureName, ScreenSpaceOutlineSettings settings)
    {
        // initialization
        // --------------
        mProfilingSampler = new ProfilingSampler(featureName);
        renderPassEvent = settings.m_RenderPassEvent;
        mPassMaterial = CoreUtils.CreateEngineMaterial(settings.m_ScreenSpaceOutlineShader);
        
        // create FilteringSettings
        // ------------------------
        RenderQueueRange renderQueueRange;
        switch (settings.m_RenderQueueRange)
        {
            case ScreenSpaceOutlineSettings.RenderQueueRange.All :
                renderQueueRange = RenderQueueRange.all; break;
            case ScreenSpaceOutlineSettings.RenderQueueRange.Opaque:
                renderQueueRange = RenderQueueRange.opaque; break;
            case ScreenSpaceOutlineSettings.RenderQueueRange.Transparent:
                renderQueueRange = RenderQueueRange.transparent; break;
            default: throw new ArgumentOutOfRangeException();
        }
        uint renderingLayerMask = (uint) 1 << settings.m_RenderingLayerMask;
        mFilteringSettings = new FilteringSettings(renderQueueRange, settings.m_LayerMask, renderingLayerMask);
    }
    
    public void Setup(ScreenSpaceOutline volumeComponent)
    {
        // pass shader properties
        // ----------------------
        mPassMaterial.SetColor(_OutlineColor, volumeComponent.m_OutlineColor.value);
        mPassMaterial.SetFloat(_OutlineWidth, volumeComponent.m_OutlineWidth.value);
    }

    public override void OnCameraSetup(CommandBuffer cmd, ref RenderingData renderingData)
    {
        // setup temporary render texture
        // ------------------------------
        var descriptor = renderingData.cameraData.cameraTargetDescriptor;
        descriptor.width /= 2;
        descriptor.height /= 2;
        descriptor.colorFormat = RenderTextureFormat.R8;
        descriptor.depthBufferBits = 0;
        RenderingUtils.ReAllocateIfNeeded(ref mRendererDrawingTexture, descriptor, FilterMode.Bilinear, TextureWrapMode.Clamp, name: kRenderedObjectTextureName);
        RenderingUtils.ReAllocateIfNeeded(ref mOutlineTexture, descriptor, FilterMode.Bilinear, TextureWrapMode.Clamp, name: kOutlineTextureName);
        
        // setup color render target
        // -------------------------
        mCameraColorTexture = renderingData.cameraData.renderer.cameraColorTargetHandle;
    }
    
    public override void Execute(ScriptableRenderContext context, ref RenderingData renderingData)
    {
        CommandBuffer cmd = CommandBufferPool.Get();
        using (new ProfilingScope(cmd, mProfilingSampler))
        {
            // setup temporary texture as render target
            // ----------------------------------------
            CoreUtils.SetRenderTarget(cmd, mRendererDrawingTexture, ClearFlag.Color, Color.clear);
            
            context.ExecuteCommandBuffer(cmd);
            cmd.Clear();
            
            // Step 1: render certain objects to temporary render texture
            // ----------------------------------------------------------
            var drawingSettings = CreateDrawingSettings(mShaderTagIDs, ref renderingData, kSortingCriteria);
            drawingSettings.overrideMaterial = mPassMaterial;
            drawingSettings.overrideMaterialPassIndex = kRendererDrawingPassIndex;
            context.DrawRenderers(renderingData.cullResults, ref drawingSettings, ref mFilteringSettings);
            
            // Step 2: edge detection to create outline
            // ----------------------------------------
            Blitter.BlitCameraTexture(cmd, mRendererDrawingTexture, mOutlineTexture, mPassMaterial, kEdgeDetectionPassIndex);
                
            // Step 3: composite
            // -----------------
            CoreUtils.SetRenderTarget(cmd, mCameraColorTexture);
            Blitter.BlitCameraTexture(cmd, mOutlineTexture, mCameraColorTexture, mPassMaterial, kCompositePassIndex);
        }
        context.ExecuteCommandBuffer(cmd);
        cmd.Clear();
        CommandBufferPool.Release(cmd);
    }

    public void Dispose()
    {
        CoreUtils.Destroy(mPassMaterial);
        
        mRendererDrawingTexture?.Release();
        mOutlineTexture?.Release();
    }
    
    // basic variables
    // ---------------
    private ProfilingSampler           mProfilingSampler;
    private Material                   mPassMaterial;
    // render texture handles
    // ----------------------
    private RTHandle mRendererDrawingTexture;
    private RTHandle mOutlineTexture;
    private RTHandle mCameraColorTexture;
    // renderer drawing related
    // ------------------------
    private FilteringSettings          mFilteringSettings;
    private readonly List<ShaderTagId> mShaderTagIDs = new()
    {
        new ShaderTagId("SRPDefaultUnlit"),
        new ShaderTagId("UniversalForward"),
        new ShaderTagId("UniversalForwardOnly")
    };
    // constants
    // ---------
    private const SortingCriteria kSortingCriteria = SortingCriteria.CommonTransparent | SortingCriteria.CommonOpaque;
    private const string kRenderedObjectTextureName = "_RendererDrawingTexture";
    private const string kOutlineTextureName = "_OutlineTexture";
    private const int    kRendererDrawingPassIndex = 0;
    private const int    kEdgeDetectionPassIndex = 1;
    private const int    kCompositePassIndex = 2;
    // cached shader property IDs
    // --------------------------
    private static readonly int _OutlineWidth = Shader.PropertyToID("_OutlineWidth");
    private static readonly int _OutlineColor = Shader.PropertyToID("_OutlineColor");

}
```
{: file="ScreenSpaceOutlineRenderPass.cs"}

---

#### ScreenSpaceOutline.shader

```glsl
Shader "Hidden/ScreenSpaceOutline"
{
    SubShader
    {
        Tags
        {
            "RenderType" = "Opaque"
            "RenderPipeline" = "UniversalRenderPipeline"
        }
        
        Pass // outlined renderer drawing pass
        {
            Name "Renderer Drawing Pass"
            
            Blend Off
            ZWrite Off
            ZTest Always
            Cull Back

            HLSLPROGRAM
            
            #pragma vertex Vertex
            #pragma fragment Fragment

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            
            struct Attributes
            {
                float4 positionOS   : POSITION;
            };
            struct Varyings
            {
                float4 positionHCS  : SV_POSITION;
            };
            
            Varyings Vertex(Attributes input)
            {
                Varyings output;
                output.positionHCS = TransformObjectToHClip(input.positionOS.xyz);
                return output;
            }
            half Fragment() : SV_Target
            {
                return 1;
            }
            
            ENDHLSL
        }

        Pass // outline edge detection pass
        {
            Blend Off
            ZWrite Off
            ZTest LEqual
            Cull Back

            HLSLPROGRAM

            #pragma vertex   OutlinePassVertex
            #pragma fragment OutlinePassFragment
            
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.core/Runtime/Utilities/Blit.hlsl"

            float4 _BlitTexture_TexelSize;
            half _OutlineWidth;
            
            struct CustomVaryings
            {
                float4 positionCS : SV_POSITION;
                float2 texcoord   : TEXCOORD0;
                float2 uvs[4]     : TEXCOORD1;
            };

            CustomVaryings OutlinePassVertex(Attributes input)
            {
                CustomVaryings output;
                output.positionCS = GetFullScreenTriangleVertexPosition(input.vertexID);
                output.texcoord = GetFullScreenTriangleTexCoord(input.vertexID);

                // multiply by 0.5 due to half-resolution texture
                float2 texelSize = _BlitTexture_TexelSize.xy * 0.5;
                const float halfWidthFloor = floor(_OutlineWidth * 0.5);
                const float halfWidthCeil = ceil(_OutlineWidth * 0.5);

                output.uvs[0] = output.texcoord + texelSize * float2(halfWidthFloor, halfWidthCeil)  * float2(-1,  1);
                output.uvs[1] = output.texcoord + texelSize * float2(halfWidthCeil,  halfWidthFloor) * float2( 1,  1);
                output.uvs[2] = output.texcoord + texelSize * float2(halfWidthFloor, halfWidthCeil)  * float2(-1, -1);
                output.uvs[3] = output.texcoord + texelSize * float2(halfWidthCeil,  halfWidthFloor) * float2( 1, -1);
                
                return output;
            }
            
            half RobertsCross(half samples[4])
            {
                const half difference_1 = samples[1] - samples[2];
                const half difference_2 = samples[0] - samples[3];
                return sqrt(difference_1 * difference_1 + difference_2 * difference_2);
            }
            
            half OutlinePassFragment(CustomVaryings input) : SV_Target
            {
                half colors[4];
                for (int i = 0; i < 4; i++)
                {
                    colors[i] = SAMPLE_TEXTURE2D(_BlitTexture, sampler_LinearClamp, input.uvs[i]);
                }
                half edge = RobertsCross(colors);
                return edge;
            }
            
            ENDHLSL
        }
        
        Pass // outline composite pass
        {
            Name "Outline Composite Pass"
            
            Cull Off
            ZTest NotEqual ZWrite Off
            Blend One SrcAlpha, Zero One
            BlendOp Add, Add
            
            HLSLPROGRAM
            
            #pragma vertex Vert
            #pragma fragment Fragment

            half4 _OutlineColor;
            
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.core/Runtime/Utilities/Blit.hlsl"
            
            half4 Fragment(Varyings input) : SV_Target
            {
                half outline = SAMPLE_TEXTURE2D(_BlitTexture, sampler_LinearClamp, input.texcoord).r;
                half3 outlineColor = half3(outline, outline, outline) * _OutlineColor.rgb;
                return half4(outlineColor, 1);
            }
            ENDHLSL
            
        }
    }
}
```
{: file="ScreenSpaceOutline.shader"}